export class SelectionManager {
  private currentMode: 'none' | 'drawing' | 'dragging' | 'resizing' = 'none'
  private activeHandle = ''
  private startX = 0
  private startY = 0
  private dragOffsetX = 0
  private dragOffsetY = 0
  private initCropX = 0
  private initCropY = 0
  private initCropW = 0
  private initCropH = 0
  private cropX = 0
  private cropY = 0
  private cropW = 0
  private cropH = 0
  private readonly MIN_SIZE = 10

  constructor(
    private imageWrapper: HTMLDivElement,
    private targetImage: HTMLImageElement,
    private selectionBox: HTMLDivElement,
    private getZoom: () => number,
    private onSelectionChange: (x: number, y: number, w: number, h: number) => void,
    private onSelectionComplete: () => void
  ) {
    this.initEvents()
  }

  private initEvents(): void {
    this.imageWrapper.addEventListener('mousedown', (e: MouseEvent) => {
      if (!this.targetImage.src || e.button !== 0 || e.detail > 1) return
      if (
        e.target === this.selectionBox ||
        (e.target as HTMLElement).classList.contains('resize-handle')
      )
        return

      this.currentMode = 'drawing'
      const rect = this.imageWrapper.getBoundingClientRect()
      this.startX = e.clientX - rect.left
      this.startY = e.clientY - rect.top

      this.selectionBox.style.left = `${this.startX}px`
      this.selectionBox.style.top = `${this.startY}px`
      this.selectionBox.style.width = '0px'
      this.selectionBox.style.height = '0px'
      this.selectionBox.style.display = 'block'
    })

    this.imageWrapper.addEventListener('dblclick', (e: MouseEvent) => {
      if (!this.targetImage.src || e.button !== 0) return
      e.preventDefault()
      this.selectAll()
    })

    this.selectionBox.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0 || (e.target as HTMLElement).classList.contains('resize-handle')) return
      e.stopPropagation()
      this.currentMode = 'dragging'

      const rect = this.imageWrapper.getBoundingClientRect()
      const zoom = this.getZoom()
      this.dragOffsetX = e.clientX - rect.left - this.cropX * zoom
      this.dragOffsetY = e.clientY - rect.top - this.cropY * zoom
    })

    this.selectionBox.querySelectorAll('.resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e: Event) => {
        const mouseEvent = e as MouseEvent
        if (mouseEvent.button !== 0) return
        mouseEvent.stopPropagation()

        this.currentMode = 'resizing'
        this.activeHandle = (mouseEvent.target as HTMLElement).dataset.handle || ''

        const rect = this.imageWrapper.getBoundingClientRect()
        this.startX = mouseEvent.clientX - rect.left
        this.startY = mouseEvent.clientY - rect.top

        this.initCropX = this.cropX
        this.initCropY = this.cropY
        this.initCropW = this.cropW
        this.initCropH = this.cropH
      })
    })

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.currentMode === 'none') return

      const rect = this.imageWrapper.getBoundingClientRect()
      let currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
      let currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
      const zoom = this.getZoom()

      if (this.currentMode === 'drawing') {
        const x = Math.min(this.startX, currentX)
        const y = Math.min(this.startY, currentY)
        this.cropW = Math.floor(Math.abs(this.startX - currentX) / zoom)
        this.cropH = Math.floor(Math.abs(this.startY - currentY) / zoom)
        this.cropX = Math.floor(x / zoom)
        this.cropY = Math.floor(y / zoom)
      } else if (this.currentMode === 'dragging') {
        let targetLeft = Math.max(
          0,
          Math.min(currentX - this.dragOffsetX, rect.width - this.cropW * zoom)
        )
        let targetTop = Math.max(
          0,
          Math.min(currentY - this.dragOffsetY, rect.height - this.cropH * zoom)
        )
        this.cropX = Math.floor(targetLeft / zoom)
        this.cropY = Math.floor(targetTop / zoom)
      } else if (this.currentMode === 'resizing') {
        const deltaX = (currentX - this.startX) / zoom
        const deltaY = (currentY - this.startY) / zoom

        if (this.activeHandle === 'se') {
          this.cropW = Math.floor(
            Math.min(
              this.targetImage.naturalWidth - this.cropX,
              Math.max(this.MIN_SIZE, this.initCropW + deltaX)
            )
          )
          this.cropH = Math.floor(
            Math.min(
              this.targetImage.naturalHeight - this.cropY,
              Math.max(this.MIN_SIZE, this.initCropH + deltaY)
            )
          )
        } else if (this.activeHandle === 'sw') {
          if (this.initCropW - deltaX >= this.MIN_SIZE && this.initCropX + deltaX >= 0) {
            this.cropX = Math.floor(this.initCropX + deltaX)
            this.cropW = Math.floor(this.initCropW - deltaX)
          }
          this.cropH = Math.floor(
            Math.min(
              this.targetImage.naturalHeight - this.cropY,
              Math.max(this.MIN_SIZE, this.initCropH + deltaY)
            )
          )
        } else if (this.activeHandle === 'ne') {
          this.cropW = Math.floor(
            Math.min(
              this.targetImage.naturalWidth - this.cropX,
              Math.max(this.MIN_SIZE, this.initCropW + deltaX)
            )
          )
          if (this.initCropH - deltaY >= this.MIN_SIZE && this.initCropY + deltaY >= 0) {
            this.cropY = Math.floor(this.initCropY + deltaY)
            this.cropH = Math.floor(this.initCropH - deltaY)
          }
        } else if (this.activeHandle === 'nw') {
          if (this.initCropW - deltaX >= this.MIN_SIZE && this.initCropX + deltaX >= 0) {
            this.cropX = Math.floor(this.initCropX + deltaX)
            this.cropW = Math.floor(this.initCropW - deltaX)
          }
          if (this.initCropH - deltaY >= this.MIN_SIZE && this.initCropY + deltaY >= 0) {
            this.cropY = Math.floor(this.initCropY + deltaY)
            this.cropH = Math.floor(this.initCropH - deltaY)
          }
        }
      }

      this.renderBox()
      this.onSelectionChange(this.cropX, this.cropY, this.cropW, this.cropH)
    })

    window.addEventListener('mouseup', () => {
      const previousMode = this.currentMode
      this.currentMode = 'none'
      this.activeHandle = ''

      if (previousMode !== 'none') {
        if (this.cropW < this.MIN_SIZE || this.cropH < this.MIN_SIZE) {
          this.reset()
        } else {
          this.onSelectionComplete()
        }
      }
    })
  }

  public renderBox(): void {
    const zoom = this.getZoom()
    this.selectionBox.style.left = `${this.cropX * zoom}px`
    this.selectionBox.style.top = `${this.cropY * zoom}px`
    this.selectionBox.style.width = `${this.cropW * zoom}px`
    this.selectionBox.style.height = `${this.cropH * zoom}px`
  }

  public selectAll(): void {
    if (!this.targetImage.naturalWidth || !this.targetImage.naturalHeight) return

    this.currentMode = 'none'
    this.cropX = 0
    this.cropY = 0
    this.cropW = this.targetImage.naturalWidth
    this.cropH = this.targetImage.naturalHeight
    this.selectionBox.style.display = 'block'

    this.renderBox()
    this.onSelectionChange(this.cropX, this.cropY, this.cropW, this.cropH)
    this.onSelectionComplete()
  }

  public reset(): void {
    this.selectionBox.style.display = 'none'
    this.cropX = this.cropY = this.cropW = this.cropH = 0
    this.onSelectionChange(0, 0, 0, 0)
  }

  public getCrop() {
    return { x: this.cropX, y: this.cropY, w: this.cropW, h: this.cropH }
  }
}
