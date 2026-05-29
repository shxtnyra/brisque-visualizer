import { MapRenderer } from './ui/MapRenderer'
import { ChartManager } from './ui/ChartManager'
import { SidebarController } from './ui/SidebarController'
import { ViewportManager } from './ui/ViewportManager'
import { SelectionManager } from './ui/SelectionManager'
import { FeaturesRenderer } from './ui/FeaturesRenderer'
import { HelpManager } from './ui/HelpManager'
import { TooltipManager } from './ui/TooltipManager'
import { BrisqueWorkerSuccess, BrisqueWorkerError, CropRect, HelpTabKey } from './types'

export interface UiElements {
  openBtn: HTMLButtonElement
  zoomInfo: HTMLSpanElement
  workspace: HTMLDivElement
  imageWrapper: HTMLDivElement
  targetImage: HTMLImageElement
  selectionBox: HTMLDivElement
  selectionInfo: HTMLDivElement
  scoreContainer: HTMLDivElement
  scoreVal: HTMLDivElement
  previewCanvas: HTMLCanvasElement
  muCanvas: HTMLCanvasElement
  sigmaCanvas: HTMLCanvasElement
  mscnCanvas: HTMLCanvasElement
  mscnChartCanvas: HTMLCanvasElement
  sidebar: HTMLDivElement
  resizer: HTMLDivElement
  /**
   * Центральный контроллер приложения: связывает UI-компоненты, инициализирует
   * воркер BRISQUE, маршрутизирует данные между визуализациями и выполняет
   * логику очередности обработок.
   */
  qaTabsNav: HTMLDivElement
  qaTabsContainer: HTMLDivElement
  tabBtns: NodeListOf<HTMLElement>
  tabContents: NodeListOf<HTMLElement>
}

export class AppController {
  private ctx: CanvasRenderingContext2D
  private brisqueWorker: Worker
  private mapRenderer = new MapRenderer()
  private chartManager: ChartManager
  private featuresRenderer: FeaturesRenderer
  private helpManager: HelpManager
  private viewport!: ViewportManager
  private selection!: SelectionManager
  private lastMscnData: Float32Array | null = null
  private lastPipelineData: BrisqueWorkerSuccess | null = null
  private pendingCrop: CropRect | null = null
  private activeRequestId = 0
  private lastProcessedRequestId = 0
  private isWorkerBusy = false

  constructor(private els: UiElements) {
    this.ctx = this.els.previewCanvas.getContext('2d', { willReadFrequently: true })!
    this.ctx.imageSmoothingEnabled = false
    this.chartManager = new ChartManager(this.els.mscnChartCanvas)
    this.featuresRenderer = new FeaturesRenderer('tab-features')
    this.helpManager = new HelpManager('academic-help-container')
    new TooltipManager()

    this.brisqueWorker = new Worker(new URL('./core/brisque/brisque.worker.ts', import.meta.url), {
      type: 'module'
    })

    this.initWorker()
    this.initTabs()
    this.initControls()
    this.helpManager.updateContext('empty')
  }

  private initWorker(): void {
    this.brisqueWorker.onmessage = (e: MessageEvent) => {
      this.isWorkerBusy = false
      const response = e.data as BrisqueWorkerSuccess | BrisqueWorkerError

      if (response.requestId < this.lastProcessedRequestId) {
        if (this.pendingCrop) {
          this.processPendingCrop()
        }
        return
      }

      this.lastProcessedRequestId = response.requestId

      if (!response.success) {
        console.error('Ошибка в воркере:', (response as BrisqueWorkerError).error)
      } else {
        const data = response as BrisqueWorkerSuccess
        this.lastPipelineData = data
        this.renderPipelineResults(data)
      }

      if (this.pendingCrop) {
        this.processPendingCrop()
      }
    }
  }

  private processPendingCrop(): void {
    const crop = this.pendingCrop
    this.pendingCrop = null
    if (!crop) return

    const requestId = ++this.activeRequestId
    this.sendWorkerRequest(crop, requestId)
  }

  private renderPipelineResults(data: BrisqueWorkerSuccess): void {
    this.lastMscnData = data.mscn
    this.els.muCanvas
      .getContext('2d')!
      .putImageData(this.mapRenderer.renderMu(data.mu, data.width, data.height), 0, 0)
    this.els.sigmaCanvas
      .getContext('2d')!
      .putImageData(this.mapRenderer.renderSigma(data.sigma, data.width, data.height), 0, 0)
    this.els.mscnCanvas
      .getContext('2d')!
      .putImageData(this.mapRenderer.renderMscn(data.mscn, data.width, data.height), 0, 0)

    this.chartManager.drawMscnHistogram(this.lastMscnData)
    this.featuresRenderer.render(data.features36)
    this.updateScore(data.finalScore)
    this.updateHelpContextForActiveTab()
  }

  private initTabs(): void {
    this.els.tabBtns.forEach(btn => {
      btn.addEventListener('click', event => {
        const targetId = (event.target as HTMLElement).dataset.target as HelpTabKey | undefined
        if (!targetId) return

        this.els.tabBtns.forEach(button => button.classList.remove('active'))
        this.els.tabContents.forEach(content => content.classList.remove('active'))
        ;(event.target as HTMLElement).classList.add('active')
        document.getElementById(targetId)?.classList.add('active')

        this.helpManager.updateContext(targetId)

        if (targetId === 'tab-maps' || targetId === 'tab-charts') {
          if (this.lastPipelineData) {
            this.renderPipelineResults(this.lastPipelineData)
          }
        }
      })
    })
  }

  private updateHelpContextForActiveTab(): void {
    const activeTab = Array.from(this.els.tabBtns).find(btn => btn.classList.contains('active'))
      ?.dataset.target as HelpTabKey | undefined

    if (activeTab) {
      this.helpManager.updateContext(activeTab)
    }
  }

  private initControls(): void {
    this.viewport = new ViewportManager(
      this.els.openBtn,
      this.els.targetImage,
      this.els.workspace,
      this.els.zoomInfo,
      () => this.selection?.reset(),
      () => this.selection?.renderBox()
    )

    this.selection = new SelectionManager(
      this.els.imageWrapper,
      this.els.targetImage,
      this.els.selectionBox,
      () => this.viewport.getZoom(),
      crop => {
        this.updateOriginalPreview(crop)
        this.runBrisquePipeline()
      },
      () => this.runBrisquePipeline(true)
    )

    new SidebarController(this.els.sidebar, this.els.resizer, () => {
      if (this.lastMscnData) {
        this.chartManager.drawMscnHistogram(this.lastMscnData)
      }
    })
  }

  private updateOriginalPreview(crop: CropRect): void {
    if (crop.w === 0 || crop.h === 0) {
      this.els.selectionInfo.innerText = 'Размер: 0 x 0 px'
      this.els.scoreContainer.style.display = 'none'
      this.els.scoreVal.textContent = ''
      this.ctx.clearRect(0, 0, this.els.previewCanvas.width, this.els.previewCanvas.height)
      this.els.qaTabsNav.style.display = 'none'
      this.els.qaTabsContainer.style.display = 'none'
      this.lastMscnData = null
      this.lastPipelineData = null
      this.helpManager.updateContext('empty')
      return
    }

    this.els.selectionInfo.innerText = `Размер: ${crop.w} x ${crop.h} px`
    this.els.previewCanvas.width = crop.w
    this.els.previewCanvas.height = crop.h
    this.ctx.drawImage(this.els.targetImage, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)
  }

  private updateScore(finalScore: number): void {
    this.els.scoreContainer.style.display = 'block'
    this.els.scoreVal.textContent = finalScore.toFixed(2)
    if (finalScore < 30) {
      this.els.scoreVal.style.color = '#00ffcc'
    } else if (finalScore < 60) {
      this.els.scoreVal.style.color = '#ffaa00'
    } else {
      this.els.scoreVal.style.color = '#ff4444'
    }
  }

  private runBrisquePipeline(force: boolean = false): void {
    const crop = this.selection.getCrop()
    if (crop.w <= 0 || crop.h <= 0) return

    if (this.isWorkerBusy) {
      if (!force) {
        this.pendingCrop = crop
        return
      }
      this.pendingCrop = crop
      return
    }

    const requestId = ++this.activeRequestId
    this.sendWorkerRequest(crop, requestId)
  }

  private sendWorkerRequest(crop: CropRect, requestId: number): void {
    this.els.qaTabsNav.style.display = 'flex'
    this.els.qaTabsContainer.style.display = 'block'
    this.updateHelpContextForActiveTab()
    this.els.muCanvas.width = this.els.sigmaCanvas.width = this.els.mscnCanvas.width = crop.w
    this.els.muCanvas.height = this.els.sigmaCanvas.height = this.els.mscnCanvas.height = crop.h

    try {
      const imageData = this.ctx.getImageData(0, 0, crop.w, crop.h)
      const rgbaArray = imageData.data
      this.isWorkerBusy = true
      this.brisqueWorker.postMessage(
        {
          rgbaArray,
          width: crop.w,
          height: crop.h,
          requestId
        },
        [rgbaArray.buffer]
      )
    } catch (error) {
      console.error('Ошибка отправки задачи в воркер:', error)
      this.isWorkerBusy = false
    }
  }
}
