/**
 * Управляет загрузкой изображения, масштабированием и прокруткой в рабочей области.
 */
export class ViewportManager {
  private zoom = 1.0

  constructor(
    private openBtn: HTMLButtonElement,
    private targetImage: HTMLImageElement,
    private workspace: HTMLDivElement,
    private zoomInfo: HTMLSpanElement,
    private onImageLoad: () => void,
    private onZoomChange: (newZoom: number) => void
  ) {
    this.initEvents()
  }

  private initEvents(): void {
    this.openBtn.addEventListener('click', async () => {
      const filePath = await window.api.openFile()
      if (filePath) {
        const normalizedPath = filePath.replace(/\\/g, '/')
        this.targetImage.crossOrigin = 'anonymous'
        this.targetImage.src = `media:///${encodeURI(normalizedPath)}`
      }
    })

    this.targetImage.addEventListener('load', () => {
      this.targetImage.style.display = 'block'
      this.zoom = 1.0
      this.updateScale()
      this.onImageLoad()
    })

    this.workspace.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        if (!this.targetImage.src) return
        e.preventDefault()

        const rect = this.workspace.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const imagePointX = mouseX + this.workspace.scrollLeft
        const imagePointY = mouseY + this.workspace.scrollTop

        const oldZoom = this.zoom
        const zoomStep = 0.1

        if (e.deltaY < 0) {
          this.zoom = Math.min(this.zoom + zoomStep, 8.0)
        } else {
          this.zoom = Math.max(this.zoom - zoomStep, 0.1)
        }

        if (oldZoom === this.zoom) return

        this.updateScale()

        const zoomRatio = this.zoom / oldZoom
        this.workspace.scrollLeft = imagePointX * zoomRatio - mouseX
        this.workspace.scrollTop = imagePointY * zoomRatio - mouseY

        this.onZoomChange(this.zoom)
      },
      { passive: false }
    )
  }

  /** Обновляет размеры DOM-элемта изображения в соответствии с текущим зумом. */
  public updateScale(): void {
    if (!this.targetImage.naturalWidth) return
    this.targetImage.style.width = `${this.targetImage.naturalWidth * this.zoom}px`
    this.targetImage.style.height = `${this.targetImage.naturalHeight * this.zoom}px`
    this.zoomInfo.innerText = `Масштаб: ${Math.round(this.zoom * 100)}%`
  }

  public getZoom(): number {
    return this.zoom
  }
}
