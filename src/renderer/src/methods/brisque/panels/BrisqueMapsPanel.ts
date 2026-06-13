import { MapRenderer } from '../visualizers/MapRenderer'
import { AnalysisResult, SidebarPanel } from '../../../shell/types'
import { BrisquePayload } from '../brisquePayload'
import { MAP_VIEW_META, MapKind } from '../types'

const MAP_KINDS: MapKind[] = ['mu', 'sigma', 'mscn', 'horizontal', 'vertical', 'diagonal1', 'diagonal2']

/**
 * Вкладка «Карты»: preview остаётся в AppController; здесь — типы карт и canvas.
 */
export class BrisqueMapsPanel implements SidebarPanel {
  readonly id = 'tab-maps'
  readonly title = 'Карты'
  readonly helpContext = 'tab-maps'

  private mapRenderer = new MapRenderer()
  private mapCanvas!: HTMLCanvasElement
  private mapTitleLabel!: HTMLSpanElement
  private mapTitleHint!: HTMLSpanElement
  private mapTypeBtns: HTMLButtonElement[] = []
  private fullscreenBtn: HTMLButtonElement | null = null

  private activeMapKind: MapKind = 'mscn'
  private lastPayload: BrisquePayload | null = null
  private lastSize: { width: number; height: number } | null = null

  mount(host: HTMLElement): void {
    host.innerHTML = `
      <div class="qa-visuals">
        <h3 id="map-title">
          <span id="map-title-label">Карта MSCN</span>
          <span id="map-title-hint" class="hint-icon" data-hint="hint-mscn">?</span>
          <button type="button" class="fullscreen-open-btn" data-fullscreen="map" title="На весь экран"
            aria-label="Открыть карту на весь экран">⛶</button>
        </h3>
        <div class="chart-toolbar map-toolbar">
          <div class="chart-type-nav map-type-nav" id="map-type-nav"></div>
        </div>
        <div class="preview-container">
          <canvas id="map-canvas"></canvas>
        </div>
      </div>
    `

    this.mapTitleLabel = host.querySelector('#map-title-label') as HTMLSpanElement
    this.mapTitleHint = host.querySelector('#map-title-hint') as HTMLSpanElement
    this.mapCanvas = host.querySelector('#map-canvas') as HTMLCanvasElement
    this.fullscreenBtn = host.querySelector('.fullscreen-open-btn') as HTMLButtonElement

    const nav = host.querySelector('#map-type-nav') as HTMLDivElement
    MAP_KINDS.forEach(kind => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'map-type-btn' + (kind === 'mscn' ? ' active' : '')
      btn.dataset.map = kind
      const labels: Record<MapKind, string> = {
        mu: 'μ',
        sigma: 'σ',
        mscn: 'MSCN',
        horizontal: 'H',
        vertical: 'V',
        diagonal1: 'D1 ↘',
        diagonal2: 'D2 ↙'
      }
      const titles: Record<MapKind, string> = {
        mu: 'Локальное среднее яркости',
        sigma: 'Локальный контраст',
        mscn: 'MSCN',
        horizontal: 'Горизонтальное',
        vertical: 'Вертикальное',
        diagonal1: 'Диагональ D1',
        diagonal2: 'Диагональ D2'
      }
      btn.textContent = labels[kind]
      btn.title = titles[kind]
      btn.addEventListener('click', () => this.setMapKind(kind))
      nav.appendChild(btn)
      this.mapTypeBtns.push(btn)
    })

    this.updateMapTitle()
  }

  destroy(): void {
    this.lastPayload = null
    this.lastSize = null
    this.mapTypeBtns = []
  }

  onResult(result: AnalysisResult | null): void {
    if (!result) {
      this.lastPayload = null
      this.lastSize = null
      this.setFullscreenEnabled(false)
      return
    }
    this.lastPayload = result.payload as BrisquePayload
    this.lastSize = { width: result.width, height: result.height }
    this.mapCanvas.width = result.width
    this.mapCanvas.height = result.height
    this.setFullscreenEnabled(true)
    this.renderMapToCanvas(this.mapCanvas)
  }

  onActivate(): void {
    this.renderMapToCanvas(this.mapCanvas)
  }

  onSidebarResize(): void {
    // canvas 1:1 с данными — перерисовка не нужна
  }

  getActiveMapKind(): MapKind {
    return this.activeMapKind
  }

  getMapTitle(): string {
    return MAP_VIEW_META[this.activeMapKind].title
  }

  getFullscreenButton(): HTMLButtonElement | null {
    return this.fullscreenBtn
  }

  getMapCanvas(): HTMLCanvasElement {
    return this.mapCanvas
  }

  renderMapToCanvas(canvas: HTMLCanvasElement): void {
    const payload = this.lastPayload
    const size = this.lastSize
    if (!payload || !size) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = size.width
    canvas.height = size.height

    const { width, height } = size
    let imageData: ImageData | null = null

    switch (this.activeMapKind) {
      case 'mu':
        imageData = this.mapRenderer.renderMu(payload.mu, width, height)
        break
      case 'sigma':
        imageData = this.mapRenderer.renderSigma(payload.sigma, width, height)
        break
      case 'mscn':
        imageData = this.mapRenderer.renderMscn(payload.mscn, width, height)
        break
      default:
        imageData = this.mapRenderer.renderPairwise(
          payload.pairwise[this.activeMapKind],
          width,
          height,
          this.activeMapKind
        )
    }

    ctx.putImageData(imageData, 0, 0)
  }

  exportFilename(canvas: HTMLCanvasElement): string | null {
    if (canvas.width <= 0 || !this.lastPayload) return null
    return `brisque-map-${this.activeMapKind}-${canvas.width}x${canvas.height}.png`
  }

  setMapKind(mapKind: MapKind): void {
    this.activeMapKind = mapKind
    this.mapTypeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.map === mapKind)
    })
    this.updateMapTitle()
    this.renderMapToCanvas(this.mapCanvas)
  }

  private updateMapTitle(): void {
    const meta = MAP_VIEW_META[this.activeMapKind]
    this.mapTitleLabel.textContent = meta.title
    this.mapTitleHint.dataset.hint = meta.hint
  }

  private setFullscreenEnabled(enabled: boolean): void {
    if (this.fullscreenBtn) {
      this.fullscreenBtn.disabled = !enabled
    }
  }
}
