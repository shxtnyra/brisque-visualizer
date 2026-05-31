import { MapRenderer } from './ui/MapRenderer'
import { ChartManager } from './ui/ChartManager'
import { SidebarController } from './ui/SidebarController'
import { ViewportManager } from './ui/ViewportManager'
import { SelectionManager } from './ui/SelectionManager'
import { FeaturesRenderer } from './ui/FeaturesRenderer'
import { HelpManager } from './ui/HelpManager'
import { TooltipManager } from './ui/TooltipManager'
import {
  BrisqueWorkerSuccess,
  BrisqueWorkerError,
  CropRect,
  HelpTabKey,
  ChartKind,
  ChartYMode,
  MapKind,
  MAP_VIEW_META,
  PAIRWISE_CHART_META,
  readGgdFit,
  readAggdFit
} from './types'

/** DOM-элементы, с которыми работает главный контроллер */
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
  mapCanvas: HTMLCanvasElement
  mapTitle: HTMLHeadingElement
  mapTypeBtns: NodeListOf<HTMLButtonElement>
  chartCanvas: HTMLCanvasElement
  chartTypeBtns: NodeListOf<HTMLButtonElement>
  chartYModeBtns: NodeListOf<HTMLButtonElement>
  sidebar: HTMLDivElement
  resizer: HTMLDivElement
  qaTabsNav: HTMLDivElement
  qaTabsContainer: HTMLDivElement
  tabBtns: NodeListOf<HTMLElement>
  tabContents: NodeListOf<HTMLElement>
}

/**
 * Центральный контроллер: связывает UI, воркер BRISQUE и визуализации.
 * Кэширует последний ответ пайплайна — перерисовка не требует пересчёта.
 */
export class AppController {
  private ctx: CanvasRenderingContext2D
  private brisqueWorker: Worker
  private mapRenderer = new MapRenderer()
  private chartManager: ChartManager
  private featuresRenderer: FeaturesRenderer
  private helpManager: HelpManager
  private viewport!: ViewportManager
  private selection!: SelectionManager

  /** Единый кэш результатов BRISQUE (Transferable-буферы из воркера) */
  private lastPipelineData: BrisqueWorkerSuccess | null = null

  private activeMapKind: MapKind = 'mscn'
  private activeChartKind: ChartKind = 'mscn'
  private activeChartYMode: ChartYMode = 'pdf'
  private pendingCrop: CropRect | null = null
  private activeRequestId = 0
  private lastProcessedRequestId = 0
  private isWorkerBusy = false

  constructor(private els: UiElements) {
    this.ctx = this.els.previewCanvas.getContext('2d', { willReadFrequently: true })!
    this.ctx.imageSmoothingEnabled = false
    this.chartManager = new ChartManager(this.els.chartCanvas)
    this.featuresRenderer = new FeaturesRenderer('tab-features')
    this.helpManager = new HelpManager('academic-help-container')
    new TooltipManager()

    this.brisqueWorker = new Worker(new URL('./core/brisque/brisque.worker.ts', import.meta.url), {
      type: 'module'
    })

    this.initWorker()
    this.initTabs()
    this.initMapControls()
    this.initChartControls()
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
        this.lastPipelineData = response as BrisqueWorkerSuccess
        this.onPipelineComplete(this.lastPipelineData)
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

  /** Полный цикл после нового ответа воркера */
  private onPipelineComplete(data: BrisqueWorkerSuccess): void {
    this.featuresRenderer.render(data.features36)
    this.updateScore(data.finalScore)
    this.renderActiveMap()
    this.renderActiveChart()
    this.updateHelpContextForActiveTab()
  }

  /** Перерисовка активной карты из кэша (без повторного пайплайна) */
  private renderActiveMap(): void {
    const data = this.lastPipelineData
    if (!data) return

    const ctx = this.els.mapCanvas.getContext('2d')
    if (!ctx) return

    const { width, height } = data
    let imageData: ImageData | null = null

    switch (this.activeMapKind) {
      case 'mu':
        imageData = this.mapRenderer.renderMu(data.mu, width, height)
        break
      case 'sigma':
        imageData = this.mapRenderer.renderSigma(data.sigma, width, height)
        break
      case 'mscn':
        imageData = this.mapRenderer.renderMscn(data.mscn, width, height)
        break
      default:
        imageData = this.mapRenderer.renderPairwise(
          data.pairwise[this.activeMapKind],
          width,
          height,
          this.activeMapKind
        )
    }

    ctx.putImageData(imageData, 0, 0)
  }

  private updateMapTitle(): void {
    const meta = MAP_VIEW_META[this.activeMapKind]
    this.els.mapTitle.textContent = meta.title

    const existingHint = this.els.mapTitle.querySelector('.hint-icon')
    existingHint?.remove()

    const hint = document.createElement('span')
    hint.className = 'hint-icon'
    hint.dataset.hint = meta.hint
    hint.textContent = '?'
    this.els.mapTitle.appendChild(document.createTextNode(' '))
    this.els.mapTitle.appendChild(hint)
  }

  private initMapControls(): void {
    this.els.mapTypeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mapKind = btn.dataset.map as MapKind | undefined
        if (!mapKind) return

        this.els.mapTypeBtns.forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        this.activeMapKind = mapKind
        this.updateMapTitle()
        this.renderActiveMap()
      })
    })
  }

  /** Перерисовка активного графика из кэша */
  private renderActiveChart(): void {
    const data = this.lastPipelineData
    if (!data) return

    const yMode = this.activeChartYMode

    if (this.activeChartKind === 'mscn') {
      this.chartManager.drawMscnHistogram(data.mscn, readGgdFit(data.features36, 0), yMode)
      return
    }

    const meta = PAIRWISE_CHART_META[this.activeChartKind]
    this.chartManager.drawPairwiseHistogram(
      data.pairwise[this.activeChartKind],
      meta.xLabel,
      readAggdFit(data.features36, meta.featureOffset),
      yMode
    )
  }

  private initChartControls(): void {
    this.els.chartTypeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const chartKind = btn.dataset.chart as ChartKind | undefined
        if (!chartKind) return

        this.els.chartTypeBtns.forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        this.activeChartKind = chartKind
        this.renderActiveChart()
      })
    })

    this.els.chartYModeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const yMode = btn.dataset.yMode as ChartYMode | undefined
        if (!yMode) return

        this.els.chartYModeBtns.forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        this.activeChartYMode = yMode
        this.renderActiveChart()
      })
    })
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

        if (targetId === 'tab-maps') {
          this.renderActiveMap()
        } else if (targetId === 'tab-charts') {
          this.renderActiveChart()
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
      this.renderActiveMap()
      this.renderActiveChart()
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

  private runBrisquePipeline(_force: boolean = false): void {
    const crop = this.selection.getCrop()
    if (crop.w <= 0 || crop.h <= 0) return

    if (this.isWorkerBusy) {
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
    this.els.mapCanvas.width = crop.w
    this.els.mapCanvas.height = crop.h

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
