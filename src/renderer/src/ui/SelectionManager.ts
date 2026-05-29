import { CropRect } from '../types'

/**
 * Управляет интерактивным выделением области на изображении: рисование,
 * перемещение, изменение размеров и уведомление слушателей о изменениях.
 */
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
    private onSelectionChange: (crop: CropRect) => void,
    private onSelectionComplete: () => void
  ) {
    this.initEvents()
  }

  /** Инициализация DOM-обработчиков мыши. */
  private initEvents(): void {
    this.imageWrapper.addEventListener('mousedown', event => this.startDrawing(event))
    this.imageWrapper.addEventListener('dblclick', event => this.handleDoubleClick(event))
    this.selectionBox.addEventListener('mousedown', event => this.startDragging(event))
    this.selectionBox.querySelectorAll('.resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', event => this.startResizing(event))
    })
    window.addEventListener('mousemove', event => this.handleMouseMove(event))
    window.addEventListener('mouseup', () => this.handleMouseUp())
  }

  private startDrawing(event: MouseEvent): void {
    if (!this.targetImage.src || event.button !== 0 || event.detail > 1) return
    if (
      event.target === this.selectionBox ||
      (event.target as HTMLElement).classList.contains('resize-handle')
    )
      return

    this.currentMode = 'drawing'
    const rect = this.imageWrapper.getBoundingClientRect()
    this.startX = event.clientX - rect.left
    this.startY = event.clientY - rect.top

    Object.assign(this.selectionBox.style, {
      left: `${this.startX}px`,
      top: `${this.startY}px`,
      width: '0px',
      height: '0px',
      display: 'block'
    })
  }

  private handleDoubleClick(event: MouseEvent): void {
    if (!this.targetImage.src || event.button !== 0) return
    event.preventDefault()
    this.selectAll()
  }

  private startDragging(event: MouseEvent): void {
    if (event.button !== 0 || (event.target as HTMLElement).classList.contains('resize-handle'))
      return
    event.stopPropagation()

    this.currentMode = 'dragging'
    const rect = this.imageWrapper.getBoundingClientRect()
    const zoom = this.getZoom()
    this.dragOffsetX = event.clientX - rect.left - this.cropX * zoom
    this.dragOffsetY = event.clientY - rect.top - this.cropY * zoom
  }

  private startResizing(event: Event): void {
    const mouseEvent = event as MouseEvent
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
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.currentMode === 'none') return

    const rect = this.imageWrapper.getBoundingClientRect()
    const currentX = Math.max(0, Math.min(event.clientX - rect.left, rect.width))
    const currentY = Math.max(0, Math.min(event.clientY - rect.top, rect.height))
    const zoom = this.getZoom()

    if (this.currentMode === 'drawing') {
      this.updateDrawing(currentX, currentY, zoom)
    } else if (this.currentMode === 'dragging') {
      this.updateDragging(currentX, currentY, zoom, rect)
    } else {
      this.updateResizing(currentX, currentY, zoom)
    }

    this.renderBox()
    this.onSelectionChange({ x: this.cropX, y: this.cropY, w: this.cropW, h: this.cropH })
  }

  private updateDrawing(currentX: number, currentY: number, zoom: number): void {
    const left = Math.min(this.startX, currentX)
    const top = Math.min(this.startY, currentY)
    this.cropW = Math.floor(Math.abs(this.startX - currentX) / zoom)
    this.cropH = Math.floor(Math.abs(this.startY - currentY) / zoom)
    this.cropX = Math.floor(left / zoom)
    this.cropY = Math.floor(top / zoom)
  }

  private updateDragging(currentX: number, currentY: number, zoom: number, rect: DOMRect): void {
    const left = Math.max(0, Math.min(currentX - this.dragOffsetX, rect.width - this.cropW * zoom))
    const top = Math.max(0, Math.min(currentY - this.dragOffsetY, rect.height - this.cropH * zoom))
    this.cropX = Math.floor(left / zoom)
    this.cropY = Math.floor(top / zoom)
  }

  private updateResizing(currentX: number, currentY: number, zoom: number): void {
    const deltaX = (currentX - this.startX) / zoom
    const deltaY = (currentY - this.startY) / zoom

    switch (this.activeHandle) {
      case 'se':
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
        break
      case 'sw':
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
        break
      case 'ne':
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
        break
      case 'nw':
        if (this.initCropW - deltaX >= this.MIN_SIZE && this.initCropX + deltaX >= 0) {
          this.cropX = Math.floor(this.initCropX + deltaX)
          this.cropW = Math.floor(this.initCropW - deltaX)
        }
        if (this.initCropH - deltaY >= this.MIN_SIZE && this.initCropY + deltaY >= 0) {
          this.cropY = Math.floor(this.initCropY + deltaY)
          this.cropH = Math.floor(this.initCropH - deltaY)
        }
        break
      default:
        break
    }
  }

  private handleMouseUp(): void {
    const previousMode = this.currentMode
    this.currentMode = 'none'
    this.activeHandle = ''

    if (previousMode === 'none') return
    if (this.cropW < this.MIN_SIZE || this.cropH < this.MIN_SIZE) {
      this.reset()
    } else {
      this.onSelectionComplete()
    }
  }

  /** Обновляет DOM-представление рамки выделения в соответствии с текущими координатами. */
  public renderBox(): void {
    const zoom = this.getZoom()
    this.selectionBox.style.left = `${this.cropX * zoom}px`
    this.selectionBox.style.top = `${this.cropY * zoom}px`
    this.selectionBox.style.width = `${this.cropW * zoom}px`
    this.selectionBox.style.height = `${this.cropH * zoom}px`
  }

  /** Выделяет всё изображение и уведомляет слушателей. */
  public selectAll(): void {
    if (!this.targetImage.naturalWidth || !this.targetImage.naturalHeight) return

    this.currentMode = 'none'
    this.cropX = 0
    this.cropY = 0
    this.cropW = this.targetImage.naturalWidth
    this.cropH = this.targetImage.naturalHeight
    this.selectionBox.style.display = 'block'

    this.renderBox()
    this.onSelectionChange({ x: this.cropX, y: this.cropY, w: this.cropW, h: this.cropH })
    this.onSelectionComplete()
  }

  /** Сбрасывает выделение и уведомляет слушателей. */
  public reset(): void {
    this.selectionBox.style.display = 'none'
    this.cropX = this.cropY = this.cropW = this.cropH = 0
    this.onSelectionChange({ x: 0, y: 0, w: 0, h: 0 })
  }

  /** Возвращает текущую область выделения. */
  public getCrop(): CropRect {
    return { x: this.cropX, y: this.cropY, w: this.cropW, h: this.cropH }
  }
}
