import { ViewportManager } from './ui/ViewportManager'
import { SelectionManager } from './ui/SelectionManager'
import { HelpManager } from './ui/HelpManager'
import { TooltipManager } from './ui/TooltipManager'
import { SidebarController } from './ui/SidebarController'
import { CropRect } from './types'
import { TabHost } from './shell/TabHost'
import { ScorePresenter } from './shell/ScorePresenter'
import { AnalysisResult } from './shell/types'
import { MethodRegistry } from './shell/MethodRegistry'
import { MethodUiPlugin } from './shell/QualityMethod'
import { createMethodRegistry } from './methods/registerMethods'
import { FullscreenModalElements } from './ui/FullscreenModal'
import { ShellFullscreenHost } from './shell/ShellFullscreenHost'
import { MethodSwitcher, resetAnalysisSession } from './shell/MethodSwitcher'
import { MethodSelector } from './shell/MethodSelector'

/** DOM оболочки приложения (без разметки вкладок конкретного метода) */
export interface ShellElements {
  openBtn: HTMLButtonElement
  zoomInfo: HTMLSpanElement
  methodSelectContainer: HTMLElement
  workspace: HTMLDivElement
  imageWrapper: HTMLDivElement
  targetImage: HTMLImageElement
  selectionBox: HTMLDivElement
  selectionInfo: HTMLDivElement
  scoreContainer: HTMLDivElement
  scoreLabel: HTMLSpanElement
  scoreVal: HTMLSpanElement
  previewCanvas: HTMLCanvasElement
  sidebar: HTMLDivElement
  resizer: HTMLDivElement
  qaTabsNav: HTMLDivElement
  qaTabsContainer: HTMLDivElement
  fullscreen: FullscreenModalElements
}

/**
 * Оболочка: workspace, crop, переключение методов через MethodRegistry.
 */
export class AppController {
  private ctx: CanvasRenderingContext2D
  private worker!: Worker
  private helpManager: HelpManager
  private tabHost: TabHost
  private scorePresenter: ScorePresenter
  private methodRegistry: MethodRegistry
  private methodSwitcher: MethodSwitcher
  private activeUi!: MethodUiPlugin

  private lastResult: AnalysisResult | null = null
  private pendingCrop: CropRect | null = null
  private activeRequestId = 0
  private lastProcessedRequestId = 0
  private isWorkerBusy = false

  private viewport!: ViewportManager
  private selection!: SelectionManager

  constructor(private els: ShellElements) {
    this.ctx = this.els.previewCanvas.getContext('2d', { willReadFrequently: true })!
    this.ctx.imageSmoothingEnabled = false

    this.helpManager = new HelpManager('academic-help-container')
    new TooltipManager()

    this.tabHost = new TabHost(this.els.qaTabsNav, this.els.qaTabsContainer, this.helpManager)
    this.scorePresenter = new ScorePresenter(
      this.els.scoreContainer,
      this.els.scoreVal,
      this.els.scoreLabel
    )

    const fullscreenHost = new ShellFullscreenHost(this.els.fullscreen)
    this.methodRegistry = createMethodRegistry()

    this.methodSwitcher = new MethodSwitcher({
      registry: this.methodRegistry,
      tabHost: this.tabHost,
      uiContext: {
        previewCanvas: this.els.previewCanvas,
        fullscreenHost
      },
      onUiReplaced: ui => {
        this.activeUi = ui
      }
    })

    const { worker } = this.methodSwitcher.mountInitial()
    this.worker = worker
    this.activeUi = this.methodSwitcher.getActiveUi()
    this.bindWorker()

    new MethodSelector(this.els.methodSelectContainer, this.methodRegistry, id =>
      this.switchMethod(id)
    )

    this.initControls()
    this.helpManager.updateContext('empty')
  }

  private bindWorker(): void {
    this.worker.onmessage = (e: MessageEvent) => {
      this.isWorkerBusy = false
      const response = e.data
      const { method } = this.methodRegistry.getActive()

      const requestId = (response as { requestId?: number }).requestId ?? 0
      if (requestId < this.lastProcessedRequestId) {
        if (this.pendingCrop) this.processPendingCrop()
        return
      }

      this.lastProcessedRequestId = requestId

      const result = method.parseWorkerMessage(response)
      if (!result) {
        const err = method.getWorkerError(response)
        if (err) console.error('Ошибка в воркере:', err)
        this.lastResult = null
      } else {
        this.lastResult = result
        this.onAnalysisComplete(this.lastResult)
      }

      if (this.pendingCrop) this.processPendingCrop()
    }
  }

  private switchMethod(methodId: string): void {
    if (methodId === this.methodRegistry.getActiveId()) return

    this.worker.terminate()
    const session = resetAnalysisSession()
    this.lastResult = session.lastResult
    this.pendingCrop = session.pendingCrop
    this.activeRequestId = session.activeRequestId
    this.lastProcessedRequestId = session.lastProcessedRequestId
    this.isWorkerBusy = session.isWorkerBusy

    const { worker, rerender } = this.methodSwitcher.switchTo(methodId)
    this.worker = worker
    this.bindWorker()

    this.scorePresenter.hide()
    this.tabHost.dispatchResult(null)
    this.helpManager.updateContext('empty')

    const crop = this.selection?.getCrop()
    if (rerender && crop && crop.w > 0 && crop.h > 0) {
      this.runAnalysis()
    } else {
      this.tabHost.hide()
    }
  }

  private onAnalysisComplete(result: AnalysisResult): void {
    this.scorePresenter.show(result.score)
    this.tabHost.dispatchResult(result)
  }

  private processPendingCrop(): void {
    const crop = this.pendingCrop
    this.pendingCrop = null
    if (!crop) return
    this.sendWorkerRequest(crop, ++this.activeRequestId)
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
        this.runAnalysis()
      },
      () => this.runAnalysis()
    )

    new SidebarController(this.els.sidebar, this.els.resizer, () => {
      this.tabHost.refreshActivePanel()
      this.activeUi.onSidebarResize()
    })
  }

  private updateOriginalPreview(crop: CropRect): void {
    if (crop.w === 0 || crop.h === 0) {
      this.els.selectionInfo.innerText = 'Размер: 0 x 0 px'
      this.scorePresenter.hide()
      this.ctx.clearRect(0, 0, this.els.previewCanvas.width, this.els.previewCanvas.height)
      this.tabHost.hide()
      this.lastResult = null
      this.tabHost.dispatchResult(null)
      this.helpManager.updateContext('empty')
      return
    }

    this.els.selectionInfo.innerText = `Размер: ${crop.w} x ${crop.h} px`
    this.els.previewCanvas.width = crop.w
    this.els.previewCanvas.height = crop.h
    this.ctx.drawImage(this.els.targetImage, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)
  }

  private runAnalysis(): void {
    const crop = this.selection.getCrop()
    if (crop.w <= 0 || crop.h <= 0) return

    if (this.isWorkerBusy) {
      this.pendingCrop = crop
      return
    }

    this.sendWorkerRequest(crop, ++this.activeRequestId)
  }

  private sendWorkerRequest(crop: CropRect, requestId: number): void {
    this.tabHost.show()
    const ctx = this.tabHost.getActiveHelpContext()
    if (ctx) this.helpManager.updateContext(ctx)

    try {
      const imageData = this.ctx.getImageData(0, 0, crop.w, crop.h)
      const rgbaArray = imageData.data
      this.isWorkerBusy = true
      this.worker.postMessage(
        { rgbaArray, width: crop.w, height: crop.h, requestId },
        [rgbaArray.buffer]
      )
    } catch (error) {
      console.error('Ошибка отправки задачи в воркер:', error)
      this.isWorkerBusy = false
    }
  }
}
