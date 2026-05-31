type ExportTarget = { canvas: HTMLCanvasElement; filename: string }

/**
 * Контекстное меню ПКМ: копировать / сохранить PNG с canvas.
 */
export class CanvasContextMenu {
  private menu: HTMLDivElement
  private target: ExportTarget | null = null

  constructor() {
    this.menu = document.createElement('div')
    this.menu.className = 'canvas-context-menu'
    this.menu.hidden = true
    this.menu.innerHTML = `
      <button type="button" data-action="copy">Копировать изображение</button>
      <button type="button" data-action="save">Сохранить как PNG…</button>
    `
    document.body.appendChild(this.menu)

    this.menu.addEventListener('click', e => {
      const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLButtonElement | null
      if (!btn || !this.target) return
      const action = btn.dataset.action
      if (action === 'copy') void this.copy(this.target.canvas)
      if (action === 'save') this.save(this.target.canvas, this.target.filename)
      this.hide()
    })

    document.addEventListener('mousedown', e => {
      if (!this.menu.hidden && !this.menu.contains(e.target as Node)) this.hide()
    })
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.hide()
    })
  }

  attach(container: HTMLElement, resolve: () => ExportTarget | null): void {
    container.addEventListener('contextmenu', e => {
      const exportTarget = resolve()
      if (!exportTarget) return
      e.preventDefault()
      this.target = exportTarget
      this.show(e.clientX, e.clientY)
    })
  }

  private show(x: number, y: number): void {
    this.menu.hidden = false
    const pad = 4
    const rect = this.menu.getBoundingClientRect()
    const left = Math.min(x, window.innerWidth - rect.width - pad)
    const top = Math.min(y, window.innerHeight - rect.height - pad)
    this.menu.style.left = `${Math.max(pad, left)}px`
    this.menu.style.top = `${Math.max(pad, top)}px`
  }

  private hide(): void {
    this.menu.hidden = true
    this.target = null
  }

  private blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Не удалось экспортировать canvas'))
      }, 'image/png')
    })
  }

  private async copy(canvas: HTMLCanvasElement): Promise<void> {
    try {
      const blob = await this.blobFromCanvas(canvas)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    } catch (error) {
      console.error('Ошибка копирования в буфер:', error)
    }
  }

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
