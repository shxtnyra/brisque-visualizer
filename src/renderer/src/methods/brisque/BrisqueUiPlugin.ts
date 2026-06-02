import { ChartManager } from '../../ui/ChartManager'
import { FullscreenCallbacks } from '../../ui/FullscreenModal'
import { CanvasContextMenu } from '../../ui/CanvasContextMenu'
import { MethodUiContext, MethodUiPlugin } from '../../shell/QualityMethod'
import { FullscreenProvider, ShellFullscreenHost } from '../../shell/ShellFullscreenHost'
import { SidebarPanel } from '../../shell/types'
import { MapKind, ChartKind, ChartYMode } from '../../types'
import { BrisqueMapsPanel } from './panels/BrisqueMapsPanel'
import { BrisqueChartsPanel } from './panels/BrisqueChartsPanel'
import { BrisqueFeaturesPanel } from './panels/BrisqueFeaturesPanel'

/**
 * UI-плагин BRISQUE: три вкладки сайдбара + fullscreen + экспорт canvas.
 */
export class BrisqueUiPlugin implements MethodUiPlugin, FullscreenProvider {
  readonly panels: SidebarPanel[]

  private mapsPanel = new BrisqueMapsPanel()
  private chartsPanel = new BrisqueChartsPanel()
  private featuresPanel = new BrisqueFeaturesPanel()
  private fullscreenHost: ShellFullscreenHost
  private fullscreenChartManager: ChartManager
  private abort = new AbortController()
  private exportMenu: CanvasContextMenu | null = null

  constructor(ctx: MethodUiContext) {
    this.panels = [this.mapsPanel, this.chartsPanel, this.featuresPanel]
    this.fullscreenHost = ctx.fullscreenHost
    const fsCanvas = document.getElementById('fullscreen-chart-canvas') as HTMLCanvasElement
    this.fullscreenChartManager = new ChartManager(fsCanvas)
  }

  getFullscreenCallbacks(): FullscreenCallbacks {
    return {
      onRenderMap: canvas => this.mapsPanel.renderMapToCanvas(canvas),
      onRenderChart: canvas => {
        const manager =
          canvas.id === 'fullscreen-chart-canvas'
            ? this.fullscreenChartManager
            : this.chartsPanel.createChartManager(canvas)
        this.chartsPanel.renderChartToCanvas(canvas, manager)
      },
      onMapKindChange: mapKind => this.mapsPanel.setMapKind(mapKind as MapKind),
      onChartKindChange: chartKind => this.chartsPanel.setChartKind(chartKind as ChartKind),
      onChartYModeChange: yMode => this.chartsPanel.setChartYMode(yMode as ChartYMode),
      getActiveMapKind: () => this.mapsPanel.getActiveMapKind(),
      getActiveChartKind: () => this.chartsPanel.getActiveChartKind(),
      getActiveChartYMode: () => this.chartsPanel.getActiveChartYMode(),
      getMapTitle: () => this.mapsPanel.getMapTitle(),
      getChartTitle: () => this.chartsPanel.getChartTitle()
    }
  }

  onSidebarResize(): void {
    this.panels.forEach(p => p.onSidebarResize?.())
    this.fullscreenHost.onResize()
  }

  initFullscreenControls(): void {
    const signal = this.abort.signal
    this.fullscreenHost.setProvider(this)

    const mapBtn = this.mapsPanel.getFullscreenButton()
    const chartBtn = this.chartsPanel.getFullscreenButton()
    mapBtn?.addEventListener(
      'click',
      () => {
        if (mapBtn.disabled) return
        this.fullscreenHost.open('map')
      },
      { signal }
    )
    chartBtn?.addEventListener(
      'click',
      () => {
        if (chartBtn.disabled) return
        this.fullscreenHost.open('chart')
      },
      { signal }
    )
  }

  initCanvasExportMenu(previewCanvas: HTMLCanvasElement): void {
    this.exportMenu = new CanvasContextMenu()
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

    attach(document.getElementById('fullscreen-map-viewport'), () => {
      const canvas = document.getElementById('fullscreen-map-canvas') as HTMLCanvasElement
      const filename = this.mapsPanel.exportFilename(canvas)
      return filename ? { canvas, filename } : null
    })

    attach(document.getElementById('fullscreen-chart-container'), () => {
      const canvas = document.getElementById('fullscreen-chart-canvas') as HTMLCanvasElement
      const filename = this.chartsPanel.exportFilename(canvas)
      return filename ? { canvas, filename } : null
    })
  }

  dispose(): void {
    this.abort.abort()
    this.fullscreenHost.setProvider(null)
    this.exportMenu = null
    this.panels.forEach(p => p.destroy())
  }
}
