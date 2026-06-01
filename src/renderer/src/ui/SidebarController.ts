const SIDEBAR_MIN_WIDTH = 470
const SIDEBAR_MAX_WIDTH = 900
const SIDEBAR_DEFAULT_WIDTH = 470

/**
 * Управляет интерактивным ресайзером сайдбара и уведомляет о смене размеров.
 */
export class SidebarController {
  private isDragging = false

  constructor(
    private sidebar: HTMLElement,
    private resizer: HTMLElement,
    private onResizeCallback: () => void
  ) {
    this.clampSidebarWidth()
    this.initEvents()
  }

  /** Не даёт панели быть уже минимума (в т.ч. после сжатия flex). */
  private clampSidebarWidth(): void {
    const parsed = Number.parseInt(this.sidebar.style.width, 10)
    const current = Number.isFinite(parsed) && parsed > 0 ? parsed : this.sidebar.offsetWidth
    const clamped = Math.min(
      SIDEBAR_MAX_WIDTH,
      Math.max(SIDEBAR_MIN_WIDTH, current || SIDEBAR_DEFAULT_WIDTH)
    )
    this.sidebar.style.width = `${clamped}px`
  }

  /** Инициализация обработчиков для перемещения ресайзера. */
  private initEvents(): void {
    this.resizer.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault()
      this.isDragging = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    })

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging) return

      // Вычисляем новую ширину сайдбара (панель расположена справа)
      const newWidth = window.innerWidth - e.clientX

      if (newWidth >= SIDEBAR_MIN_WIDTH && newWidth <= SIDEBAR_MAX_WIDTH) {
        this.sidebar.style.width = `${newWidth}px`
        this.onResizeCallback()
      }
    })

    window.addEventListener('mouseup', () => {
      if (!this.isDragging) return
      this.isDragging = false
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    })
  }
}
