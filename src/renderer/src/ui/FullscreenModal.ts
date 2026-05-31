import { MapViewportController } from './MapViewportController'
import { FullscreenMode } from '../types'

export interface FullscreenModalElements {
  modal: HTMLDivElement
  title: HTMLSpanElement
  zoomInfo: HTMLSpanElement
  closeBtn: HTMLButtonElement
  resetBtn: HTMLButtonElement
  mapViewport: HTMLDivElement
  mapCanvas: HTMLCanvasElement
  chartContainer: HTMLDivElement
  chartCanvas: HTMLCanvasElement
  mapPanel: HTMLDivElement
  chartPanel: HTMLDivElement
  mapTypeBtns: NodeListOf<HTMLButtonElement>
  chartTypeBtns: NodeListOf<HTMLButtonElement>
  chartYModeBtns: NodeListOf<HTMLButtonElement>
}

export interface FullscreenCallbacks {
  onRenderMap: (canvas: HTMLCanvasElement) => void
  onRenderChart: (canvas: HTMLCanvasElement) => void
  onMapKindChange: (mapKind: string) => void
  onChartKindChange: (chartKind: string) => void
  onChartYModeChange: (yMode: string) => void
  getActiveMapKind: () => string
  getActiveChartKind: () => string
  getActiveChartYMode: () => string
  getMapTitle: () => string
  getChartTitle: () => string
}

/**
 * Полноэкранный overlay: карты с zoom/pan, графики — крупный canvas без zoom.
 */
export class FullscreenModal {
  private mode: FullscreenMode | null = null
  private mapViewportCtrl: MapViewportController

  constructor(
    private els: FullscreenModalElements,
    private callbacks: FullscreenCallbacks
  ) {
    this.mapViewportCtrl = new MapViewportController(
      this.els.mapViewport,
      this.els.mapCanvas,
      this.els.zoomInfo
    )

    this.initEvents()
  }

  private initEvents(): void {
    this.els.closeBtn.addEventListener('click', () => this.close())
    this.els.resetBtn.addEventListener('click', () => this.resetView())

    this.els.modal.addEventListener('click', e => {
      if (e.target === this.els.modal) this.close()
    })

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isOpen()) this.close()
    })

    this.els.mapTypeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mapKind = btn.dataset.map
        if (!mapKind) return
        this.syncMapButtons(mapKind)
        this.callbacks.onMapKindChange(mapKind)
        this.callbacks.onRenderMap(this.els.mapCanvas)
        this.mapViewportCtrl.fitToView()
      })
    })

    this.els.chartTypeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const chartKind = btn.dataset.chart
        if (!chartKind) return
        this.syncChartButtons(chartKind, this.callbacks.getActiveChartYMode())
        this.callbacks.onChartKindChange(chartKind)
        this.callbacks.onRenderChart(this.els.chartCanvas)
      })
    })

    this.els.chartYModeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const yMode = btn.dataset.yMode
        if (!yMode) return
        this.syncChartButtons(this.callbacks.getActiveChartKind(), yMode)
        this.callbacks.onChartYModeChange(yMode)
        this.callbacks.onRenderChart(this.els.chartCanvas)
      })
    })
  }

  public open(mode: FullscreenMode): void {
    this.mode = mode
    this.els.modal.classList.add('open')
    this.els.modal.setAttribute('aria-hidden', 'false')
    document.body.classList.add('fullscreen-open')

    if (mode === 'map') {
      this.els.mapPanel.style.display = 'flex'
      this.els.chartPanel.style.display = 'none'
      this.els.title.textContent = this.callbacks.getMapTitle()
      this.els.zoomInfo.style.display = ''
      this.els.resetBtn.style.display = ''
      this.syncMapButtons(this.callbacks.getActiveMapKind())
      this.callbacks.onRenderMap(this.els.mapCanvas)
      requestAnimationFrame(() => this.mapViewportCtrl.fitToView())
    } else {
      this.els.mapPanel.style.display = 'none'
      this.els.chartPanel.style.display = 'flex'
      this.els.title.textContent = this.callbacks.getChartTitle()
      this.els.zoomInfo.style.display = 'none'
      this.els.resetBtn.style.display = 'none'
      this.syncChartButtons(
        this.callbacks.getActiveChartKind(),
        this.callbacks.getActiveChartYMode()
      )
      this.callbacks.onRenderChart(this.els.chartCanvas)
    }
  }

  public close(): void {
    this.mode = null
    this.els.modal.classList.remove('open')
    this.els.modal.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('fullscreen-open')
  }

  public isOpen(): boolean {
    return this.els.modal.classList.contains('open')
  }

  public resetView(): void {
    if (this.mode === 'map') {
      this.mapViewportCtrl.reset()
    }
  }

  /** Перерисовка при resize окна, если модалка открыта */
  public onResize(): void {
    if (!this.isOpen() || !this.mode) return

    if (this.mode === 'map') {
      this.callbacks.onRenderMap(this.els.mapCanvas)
      this.mapViewportCtrl.fitToView()
    } else {
      this.callbacks.onRenderChart(this.els.chartCanvas)
    }
  }

  private syncMapButtons(activeKind: string): void {
    this.els.mapTypeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.map === activeKind)
    })
  }

  private syncChartButtons(activeKind: string, activeYMode: string): void {
    this.els.chartTypeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.chart === activeKind)
    })
    this.els.chartYModeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.yMode === activeYMode)
    })
  }
}
