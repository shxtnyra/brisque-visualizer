/** Canvas и имя файла для пункта «Сохранить как PNG…». */
type ExportTarget = { canvas: HTMLCanvasElement; filename: string }

type ContextMenuHandler = (e: Event) => void

/** Одна привязка contextmenu: контейнер + обработчик для detachAll. */
interface Attachment {
  container: HTMLElement
  handler: ContextMenuHandler
}

/**
 * Контекстное меню ПКМ для экспорта canvas: копировать в буфер / сохранить PNG.
 *
 * Разметки меню в index.html нет — div.canvas-context-menu создаётся в constructor
 * и вешается на document.body. Один экземпляр на приложение (AppController);
 * в MethodUiContext передаётся в UI-плагин метода.
 *
 * Плагин (BRISQUE: initCanvasExportMenu) вызывает attach на контейнерах вокруг
 * preview, карт, графиков и fullscreen; при смене метода — detachAll в dispose.
 * AppController не знает, на каких canvas меню активно.
 */
export class CanvasContextMenu {
  private menu: HTMLDivElement
  /** Цель последнего ПКМ: canvas и filename для действий меню. */
  private target: ExportTarget | null = null
  /** Список attach для снятия listeners в detachAll. */
  private attachments: Attachment[] = []

  /**
   * Создаёт DOM меню, обработчики клика по пунктам и глобальное закрытие
   * (клик вне меню, Escape).
   */
  constructor() {
    // 1. Разметка меню (скрыто до show)
    this.menu = document.createElement('div')
    this.menu.className = 'canvas-context-menu'
    this.menu.hidden = true
    this.menu.innerHTML = `
      <button type="button" data-action="copy">Копировать изображение</button>
      <button type="button" data-action="save">Сохранить как PNG…</button>
    `
    document.body.appendChild(this.menu)

    // 2. Действия по клику на пункт меню
    this.menu.addEventListener('click', e => {
      const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLButtonElement | null
      if (!btn || !this.target) return
      const action = btn.dataset.action
      if (action === 'copy') void this.copy(this.target.canvas)
      if (action === 'save') this.save(this.target.canvas, this.target.filename)
      this.hide()
    })

    // 3. Закрытие без выбора пункта
    document.addEventListener('mousedown', e => {
      if (!this.menu.hidden && !this.menu.contains(e.target as Node)) this.hide()
    })
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.hide()
    })
  }

  /**
   * Вешает contextmenu на контейнер (обычно parentElement canvas).
   * resolve вызывается при ПКМ: null — меню не показываем (пустой canvas, fullscreen закрыт).
   *
   * @param container Элемент, по которому ловится ПКМ (область вокруг canvas).
   * @param resolve Возвращает canvas + filename или null, если экспорт недоступен.
   */
  attach(container: HTMLElement, resolve: () => ExportTarget | null): void {
    const handler: ContextMenuHandler = e => {
      const exportTarget = resolve()
      if (!exportTarget) return
      e.preventDefault()
      this.target = exportTarget
      const mouse = e as MouseEvent
      this.show(mouse.clientX, mouse.clientY)
    }
    container.addEventListener('contextmenu', handler)
    this.attachments.push({ container, handler })
  }

  /**
   * Снимает все привязки, созданные через attach.
   * Вызывается из UI-плагина перед повторным initCanvasExportMenu и в dispose.
   */
  detachAll(): void {
    for (const { container, handler } of this.attachments) {
      container.removeEventListener('contextmenu', handler)
    }
    this.attachments = []
    this.hide()
  }

  /**
   * Показывает меню у курсора с учётом границ окна (не вылезает за viewport).
   *
   * @param x clientX из MouseEvent.
   * @param y clientY из MouseEvent.
   */
  private show(x: number, y: number): void {
    this.menu.hidden = false
    const pad = 4
    const rect = this.menu.getBoundingClientRect()
    const left = Math.min(x, window.innerWidth - rect.width - pad)
    const top = Math.min(y, window.innerHeight - rect.height - pad)
    this.menu.style.left = `${Math.max(pad, left)}px`
    this.menu.style.top = `${Math.max(pad, top)}px`
  }

  /** Скрывает меню и сбрасывает target (после действия или отмены). */
  private hide(): void {
    this.menu.hidden = true
    this.target = null
  }

  /**
   * Экспорт canvas в Blob PNG для clipboard / download.
   *
   * @param canvas Источник пикселей.
   * @throws Если toBlob вернул null.
   */
  private blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Не удалось экспортировать canvas'))
      }, 'image/png')
    })
  }

  /**
   * Копирует PNG в системный буфер обмена (Clipboard API).
   * Ошибки логируются в console — UI не блокируется.
   */
  private async copy(canvas: HTMLCanvasElement): Promise<void> {
    try {
      const blob = await this.blobFromCanvas(canvas)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    } catch (error) {
      console.error('Ошибка копирования в буфер:', error)
    }
  }

  /**
   * Скачивание PNG через временную ссылку <a download>.
   *
   * @param filename Имя файла из resolve плагина (например brisque-map-….png).
   */
  private save(canvas: HTMLCanvasElement, filename: string): void {
    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }
}
