/**
 * Zoom и pan для pixel-карты внутри viewport (полноэкранный режим).
 * Transform: translate(pan) + scale(zoom), origin — левый верхний угол canvas.
 */
export class MapViewportController {
  private zoom = 1
  private panX = 0
  private panY = 0
  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0
  private panAtDragStartX = 0
  private panAtDragStartY = 0

  private readonly minZoom = 0.05
  private readonly maxZoom = 64

  constructor(
    private viewport: HTMLElement,
    private canvas: HTMLCanvasElement,
    private zoomInfoEl: HTMLElement | null,
    private onChange?: () => void
  ) {
    this.initEvents()
  }

  private initEvents(): void {
    this.viewport.addEventListener(
      'wheel',
      e => {
        e.preventDefault()
        this.zoomAtPoint(e.clientX, e.clientY, e.deltaY < 0 ? 1.1 : 1 / 1.1)
      },
      { passive: false }
    )

    this.viewport.addEventListener('mousedown', e => {
      if (e.button !== 0) return
      e.preventDefault()
      this.isDragging = true
      this.dragStartX = e.clientX
      this.dragStartY = e.clientY
      this.panAtDragStartX = this.panX
      this.panAtDragStartY = this.panY
      this.viewport.classList.add('is-panning')
    })

    window.addEventListener('mousemove', e => {
      if (!this.isDragging) return
      this.panX = this.panAtDragStartX + (e.clientX - this.dragStartX)
      this.panY = this.panAtDragStartY + (e.clientY - this.dragStartY)
      this.applyTransform()
    })

    window.addEventListener('mouseup', () => {
      if (!this.isDragging) return
      this.isDragging = false
      this.viewport.classList.remove('is-panning')
    })

    this.viewport.addEventListener('dblclick', () => {
      this.fitToView()
    })
  }

  /** Вписывает карту в viewport и центрирует */
  public fitToView(): void {
    const vw = this.viewport.clientWidth
    const vh = this.viewport.clientHeight
    const cw = this.canvas.width
    const ch = this.canvas.height
    if (vw <= 0 || vh <= 0 || cw <= 0 || ch <= 0) return

    this.zoom = Math.min(vw / cw, vh / ch) * 0.92
    this.panX = (vw - cw * this.zoom) / 2
    this.panY = (vh - ch * this.zoom) / 2
    this.applyTransform()
  }

  public reset(): void {
    this.fitToView()
  }

  private zoomAtPoint(clientX: number, clientY: number, factor: number): void {
    const rect = this.viewport.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top

    const worldX = (mx - this.panX) / this.zoom
    const worldY = (my - this.panY) / this.zoom

    const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor))
    if (newZoom === this.zoom) return

    this.zoom = newZoom
    this.panX = mx - worldX * this.zoom
    this.panY = my - worldY * this.zoom
    this.applyTransform()
  }

  private applyTransform(): void {
    this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`
    if (this.zoomInfoEl) {
      this.zoomInfoEl.textContent = `Масштаб: ${Math.round(this.zoom * 100)}%`
    }
    this.onChange?.()
  }

  public getZoom(): number {
    return this.zoom
  }
}
