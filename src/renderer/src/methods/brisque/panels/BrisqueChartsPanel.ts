import { ChartManager } from '../../../ui/ChartManager'
import { AnalysisResult, SidebarPanel } from '../../../shell/types'
import { BrisquePayload } from '../brisquePayload'
import {
  ChartKind,
  ChartYMode,
  PAIRWISE_CHART_META,
  readGgdFit,
  readAggdFit
} from '../../../types'

const CHART_KINDS: ChartKind[] = ['mscn', 'horizontal', 'vertical', 'diagonal1', 'diagonal2']

/**
 * Вкладка «Графики»: гистограммы MSCN и попарных произведений.
 */
export class BrisqueChartsPanel implements SidebarPanel {
  readonly id = 'tab-charts'
  readonly title = 'Графики'
  readonly helpContext = 'tab-charts'

  private chartManager!: ChartManager
  private chartCanvas!: HTMLCanvasElement
  private chartTypeBtns: HTMLButtonElement[] = []
  private chartYModeBtns: HTMLButtonElement[] = []
  private fullscreenBtn: HTMLButtonElement | null = null

  private activeChartKind: ChartKind = 'mscn'
  private activeChartYMode: ChartYMode = 'pdf'
  private lastPayload: BrisquePayload | null = null

  mount(host: HTMLElement): void {
    host.innerHTML = `
      <h3>Распределения MSCN <span class="hint-icon" data-hint="hint-chart-mscn">?</span>
        <button type="button" class="fullscreen-open-btn" data-fullscreen="chart" title="На весь экран"
          aria-label="Открыть график на весь экран">⛶</button>
      </h3>
      <div class="chart-toolbar">
        <div class="chart-type-nav" id="chart-type-nav"></div>
        <div class="chart-y-mode-nav">
          <span class="chart-y-mode-label">Ось Y:</span>
          <button type="button" class="chart-y-mode-btn active" data-y-mode="pdf"
            title="PDF-плотность: count / (N × Δx). Значения могут быть &gt; 1 — это нормально для узких бинов.">PDF</button>
          <button type="button" class="chart-y-mode-btn" data-y-mode="peak"
            title="Max-Norm: count / max(count). Сопоставимо с Fig. 7 Mittal et al.">Max-Norm</button>
        </div>
      </div>
      <div class="preview-container chart-container">
        <canvas id="chart-canvas"></canvas>
      </div>
    `

    this.chartCanvas = host.querySelector('#chart-canvas') as HTMLCanvasElement
    this.chartManager = new ChartManager(this.chartCanvas)
    this.fullscreenBtn = host.querySelector('.fullscreen-open-btn') as HTMLButtonElement

    const typeNav = host.querySelector('#chart-type-nav') as HTMLDivElement
    const labels: Record<ChartKind, string> = {
      mscn: 'MSCN',
      horizontal: 'H',
      vertical: 'V',
      diagonal1: 'D1 ↘',
      diagonal2: 'D2 ↙'
    }
    CHART_KINDS.forEach(kind => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'chart-type-btn' + (kind === 'mscn' ? ' active' : '')
      btn.dataset.chart = kind
      btn.textContent = labels[kind]
      btn.addEventListener('click', () => this.setChartKind(kind))
      typeNav.appendChild(btn)
      this.chartTypeBtns.push(btn)
    })

    this.chartYModeBtns = Array.from(
      host.querySelectorAll<HTMLButtonElement>('.chart-y-mode-btn')
    )
    this.chartYModeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const yMode = btn.dataset.yMode as ChartYMode | undefined
        if (yMode) this.setChartYMode(yMode)
      })
    })
  }

  destroy(): void {
    this.lastPayload = null
    this.chartTypeBtns = []
    this.chartYModeBtns = []
  }

  onResult(result: AnalysisResult | null): void {
    if (!result) {
      this.lastPayload = null
      this.setFullscreenEnabled(false)
      return
    }
    this.lastPayload = result.payload as BrisquePayload
    this.setFullscreenEnabled(true)
    this.renderChartToCanvas(this.chartCanvas, this.chartManager)
  }

  onActivate(): void {
    this.renderChartToCanvas(this.chartCanvas, this.chartManager)
  }

  onSidebarResize(): void {
    this.renderChartToCanvas(this.chartCanvas, this.chartManager)
  }

  createChartManager(canvas: HTMLCanvasElement): ChartManager {
    return new ChartManager(canvas)
  }

  getActiveChartKind(): ChartKind {
    return this.activeChartKind
  }

  getActiveChartYMode(): ChartYMode {
    return this.activeChartYMode
  }

  getChartTitle(): string {
    return this.activeChartKind === 'mscn'
      ? 'Распределение MSCN'
      : PAIRWISE_CHART_META[this.activeChartKind].xLabel
  }

  getFullscreenButton(): HTMLButtonElement | null {
    return this.fullscreenBtn
  }

  getChartCanvas(): HTMLCanvasElement {
    return this.chartCanvas
  }

  renderChartToCanvas(_canvas: HTMLCanvasElement, manager: ChartManager): void {
    const payload = this.lastPayload
    if (!payload) return

    const yMode = this.activeChartYMode

    if (this.activeChartKind === 'mscn') {
      manager.drawMscnHistogram(payload.mscn, readGgdFit(payload.features36, 0), yMode)
      return
    }

    const meta = PAIRWISE_CHART_META[this.activeChartKind]
    manager.drawPairwiseHistogram(
      payload.pairwise[this.activeChartKind],
      meta.xLabel,
      readAggdFit(payload.features36, meta.featureOffset),
      yMode
    )
  }

  exportFilename(canvas: HTMLCanvasElement): string | null {
    if (canvas.width <= 0 || !this.lastPayload) return null
    return `brisque-chart-${this.activeChartKind}-${this.activeChartYMode}.png`
  }

  setChartKind(chartKind: ChartKind): void {
    this.activeChartKind = chartKind
    this.chartTypeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.chart === chartKind)
    })
    this.renderChartToCanvas(this.chartCanvas, this.chartManager)
  }

  setChartYMode(yMode: ChartYMode): void {
    this.activeChartYMode = yMode
    this.chartYModeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.yMode === yMode)
    })
    this.renderChartToCanvas(this.chartCanvas, this.chartManager)
  }

  private setFullscreenEnabled(enabled: boolean): void {
    if (this.fullscreenBtn) {
      this.fullscreenBtn.disabled = !enabled
    }
  }
}
