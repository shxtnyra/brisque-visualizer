import { CanvasContextMenu } from '../../ui/CanvasContextMenu'
import { MethodUiContext, MethodUiPlugin } from '../../shell/QualityMethod'
import { FullscreenView } from '../../ui/FullscreenView'
import { SidebarPanel } from '../../shell/types'
import { BrisqueMapsPanel } from './panels/BrisqueMapsPanel'
import { BrisqueChartsPanel } from './panels/BrisqueChartsPanel'
import { BrisqueFeaturesPanel } from './panels/BrisqueFeaturesPanel'
import { mountChartFullscreen, mountMapFullscreen } from './brisqueFullscreenMount'

/** UI-плагин BRISQUE: три вкладки сайдбара + fullscreen + экспорт canvas. */
export class BrisqueUiPlugin implements MethodUiPlugin {
  readonly panels: SidebarPanel[]

  private mapsPanel = new BrisqueMapsPanel()
  private chartsPanel = new BrisqueChartsPanel()
  private featuresPanel = new BrisqueFeaturesPanel()
  private fullscreen: FullscreenView
  private abort = new AbortController()
  private exportMenu: CanvasContextMenu

  constructor(ctx: MethodUiContext) {
    this.panels = [this.mapsPanel, this.chartsPanel, this.featuresPanel]
    this.fullscreen = ctx.fullscreen
    this.exportMenu = ctx.exportMenu
  }

  onSidebarResize(): void {
    this.panels.forEach(p => p.onSidebarResize?.())
    this.fullscreen.onResize()
  }

  initFullscreenControls(): void {
    const signal = this.abort.signal
    const mapBtn = this.mapsPanel.getFullscreenButton()
    const chartBtn = this.chartsPanel.getFullscreenButton()

    mapBtn?.addEventListener(
      'click',
      () => {
        if (mapBtn.disabled) return
        this.fullscreen.open({
          title: this.mapsPanel.getMapTitle(),
          hint: 'Колесо — масштаб | ЛКМ — перемещение | Двойной клик — сброс | Esc — закрыть',
          showZoom: true,
          showReset: true,
          onMount: hosts => mountMapFullscreen(this.mapsPanel, hosts)
        })
      },
      { signal }
    )

    chartBtn?.addEventListener(
      'click',
      () => {
        if (chartBtn.disabled) return
        this.fullscreen.open({
          title: this.chartsPanel.getChartTitle(),
          hint: 'Esc — закрыть',
          showZoom: false,
          showReset: false,
          onMount: hosts => mountChartFullscreen(this.chartsPanel, hosts)
        })
      },
      { signal }
    )
  }

  initCanvasExportMenu(previewCanvas: HTMLCanvasElement): void {
    this.exportMenu.detachAll()
    const menu = this.exportMenu

    const attach = (
      container: HTMLElement | null,
      resolve: () => { canvas: HTMLCanvasElement; filename: string } | null
    ): void => {
      if (container) menu.attach(container, resolve)
    }

    attach(previewCanvas.parentElement, () => {
      if (previewCanvas.width <= 0) return null
      return {
        canvas: previewCanvas,
        filename: `brisque-crop-${previewCanvas.width}x${previewCanvas.height}.png`
      }
    })

    attach(this.mapsPanel.getMapCanvas().parentElement, () => {
      const canvas = this.mapsPanel.getMapCanvas()
      const filename = this.mapsPanel.exportFilename(canvas)
      return filename ? { canvas, filename } : null
    })

    attach(this.chartsPanel.getChartCanvas().parentElement, () => {
      const canvas = this.chartsPanel.getChartCanvas()
      const filename = this.chartsPanel.exportFilename(canvas)
      return filename ? { canvas, filename } : null
    })

    attach(this.fullscreen.bodyHost, () => {
      if (!this.fullscreen.isOpen()) return null
      const canvas = this.fullscreen.bodyHost.querySelector('canvas')
      if (!canvas) return null
      const mapName = this.mapsPanel.exportFilename(canvas)
      if (mapName) return { canvas, filename: mapName }
      const chartName = this.chartsPanel.exportFilename(canvas)
      return chartName ? { canvas, filename: chartName } : null
    })
  }

  dispose(): void {
    this.abort.abort()
    this.fullscreen.close()
    this.exportMenu.detachAll()
    this.panels.forEach(p => p.destroy())
  }
}
