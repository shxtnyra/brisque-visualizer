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
    this.initEvents()
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

      // Задаем строгие эксплуатационные ограничения [420px; 900px]
      if (newWidth >= 460 && newWidth <= 900) {
        this.sidebar.style.width = `${newWidth}px`
        // Уведомляем систему о необходимости перерисовать графики
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
