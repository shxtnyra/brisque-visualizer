import {
  FullscreenModal,
  FullscreenModalElements,
  FullscreenCallbacks
} from '../ui/FullscreenModal'
import { FullscreenMode } from '../types'

/** Активный метод отдаёт callbacks для общей fullscreen-модалки */
export interface FullscreenProvider {
  getFullscreenCallbacks(): FullscreenCallbacks
}

/**
 * Одна fullscreen-модалка на приложение; при смене метода меняется только provider.
 */
export class ShellFullscreenHost {
  private modal: FullscreenModal
  private provider: FullscreenProvider | null = null

  constructor(els: FullscreenModalElements) {
    this.modal = new FullscreenModal(els, this.createProxyCallbacks())
  }

  setProvider(provider: FullscreenProvider | null): void {
    this.provider = provider
    if (!provider) {
      this.modal.close()
    }
  }

  open(mode: FullscreenMode): void {
    if (!this.provider) return
    this.modal.open(mode)
  }

  onResize(): void {
    this.modal.onResize()
  }

  private createProxyCallbacks(): FullscreenCallbacks {
    const requireProvider = (): FullscreenCallbacks => {
      if (!this.provider) {
        throw new Error('ShellFullscreenHost: нет активного FullscreenProvider')
      }
      return this.provider.getFullscreenCallbacks()
    }

    return {
      onRenderMap: canvas => requireProvider().onRenderMap(canvas),
      onRenderChart: canvas => requireProvider().onRenderChart(canvas),
      onMapKindChange: kind => requireProvider().onMapKindChange(kind),
      onChartKindChange: kind => requireProvider().onChartKindChange(kind),
      onChartYModeChange: mode => requireProvider().onChartYModeChange(mode),
      getActiveMapKind: () => requireProvider().getActiveMapKind(),
      getActiveChartKind: () => requireProvider().getActiveChartKind(),
      getActiveChartYMode: () => requireProvider().getActiveChartYMode(),
      getMapTitle: () => requireProvider().getMapTitle(),
      getChartTitle: () => requireProvider().getChartTitle()
    }
  }
}
