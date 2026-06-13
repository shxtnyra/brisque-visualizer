import { TabHost } from './TabHost'
import { MethodRegistry } from './MethodRegistry'
import { MethodUiContext, MethodUiPlugin } from './QualityMethod'
import { AnalysisResult } from './types'

export interface MethodSwitcherDeps {
  registry: MethodRegistry
  tabHost: TabHost
  uiContext: MethodUiContext
  onUiReplaced: (ui: MethodUiPlugin) => void
}

/**
 * Смена активного метода: dispose UI, новый воркер, переустановка вкладок.
 */
export class MethodSwitcher {
  private activeUi: MethodUiPlugin | null = null

  constructor(private deps: MethodSwitcherDeps) {}

  mountInitial(): { worker: Worker } {
    const { method, createUi } = this.deps.registry.getActive()
    this.activeUi = createUi(this.deps.uiContext)
    this.installUi(this.activeUi)
    return { worker: method.createWorker() }
  }

  switchTo(methodId: string): { worker: Worker; rerender: boolean } {
    this.teardownUi()
    this.deps.registry.setActive(methodId)
    const { method, createUi } = this.deps.registry.getActive()
    this.activeUi = createUi(this.deps.uiContext)
    this.installUi(this.activeUi)

    return { worker: method.createWorker(), rerender: true }
  }

  getActiveUi(): MethodUiPlugin {
    if (!this.activeUi) {
      throw new Error('MethodSwitcher: UI не смонтирован')
    }
    return this.activeUi
  }

  private installUi(ui: MethodUiPlugin): void {
    this.deps.tabHost.install(ui.panels)
    ui.initFullscreenControls()
    ui.initCanvasExportMenu(this.deps.uiContext.previewCanvas)
    this.deps.onUiReplaced(ui)
  }

  private teardownUi(): void {
    this.activeUi?.dispose()
    this.activeUi = null
    this.deps.tabHost.clear()
    this.deps.tabHost.hide()
  }
}

export function resetAnalysisSession(): {
  lastResult: AnalysisResult | null
  pendingCrop: null
  activeRequestId: number
  lastProcessedRequestId: number
  isWorkerBusy: boolean
} {
  return {
    lastResult: null,
    pendingCrop: null,
    activeRequestId: 0,
    lastProcessedRequestId: 0,
    isWorkerBusy: false
  }
}
