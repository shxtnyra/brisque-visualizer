export interface FullscreenShellElements {
  modal: HTMLDivElement
  title: HTMLSpanElement
  zoomInfo: HTMLSpanElement
  resetBtn: HTMLButtonElement
  closeBtn: HTMLButtonElement
  toolbarHost: HTMLDivElement
  bodyHost: HTMLDivElement
  hint: HTMLParagraphElement
}

/** Узлы, которые метод заполняет при открытии fullscreen. */
export interface FullscreenMountHosts {
  toolbarHost: HTMLElement
  bodyHost: HTMLElement
  zoomInfo: HTMLSpanElement
  signal: AbortSignal
}

/** Колбэки сессии после mount (resize / reset / export). */
export interface FullscreenSessionHandles {
  onResize?: () => void
  onReset?: () => void
}

export interface FullscreenOpenOptions {
  title: string
  hint: string
  showZoom?: boolean
  showReset?: boolean
  onMount: (hosts: FullscreenMountHosts) => FullscreenSessionHandles
}

/**
 * Единая модалка fullscreen: open/close/Esc, пустые toolbar/body hosts.
 * Содержимое задаёт onMount активного метода (см. methods/brisque/brisqueFullscreenMount.ts).
 */
export class FullscreenView {
  readonly bodyHost: HTMLDivElement

  private session: FullscreenSessionHandles | null = null
  private sessionAbort: AbortController | null = null
  private onResetView: (() => void) | null = null

  constructor(private els: FullscreenShellElements) {
    this.bodyHost = els.bodyHost

    this.els.closeBtn.addEventListener('click', () => this.close())
    this.els.resetBtn.addEventListener('click', () => this.onResetView?.())


    this.els.modal.addEventListener('click', e => {
      if (e.target === this.els.modal) this.close()
    })

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isOpen()) this.close()
    })
  }

  /**
   * Открывает модалку и вызывает onMount для заполнения toolbar/body.
   * @returns handles сессии (для отладки; resize идёт через onResize()).
   */
  open(options: FullscreenOpenOptions): FullscreenSessionHandles {
    this.close()

    this.els.title.textContent = options.title
    this.els.zoomInfo.style.display = options.showZoom ? '' : 'none'
    this.els.resetBtn.style.display = options.showReset ? '' : 'none'
    this.els.hint.textContent = options.hint


    this.els.toolbarHost.innerHTML = ''
    this.els.bodyHost.innerHTML = ''
    this.sessionAbort = new AbortController()

    // Сначала показываем модалку — иначе getBoundingClientRect у chart-container = 0.
    this.els.modal.classList.add('open')
    this.els.modal.setAttribute('aria-hidden', 'false')
    document.body.classList.add('fullscreen-open')

    this.session = options.onMount({
      toolbarHost: this.els.toolbarHost,
      bodyHost: this.els.bodyHost,
      zoomInfo: this.els.zoomInfo,
      signal: this.sessionAbort.signal
    })

    this.onResetView = () => this.session?.onReset?.()

    return this.session
  }

  close(): void {
    this.sessionAbort?.abort()
    this.sessionAbort = null
    this.session = null
    this.onResetView = null

    this.els.toolbarHost.innerHTML = ''
    this.els.bodyHost.innerHTML = ''
    this.els.modal.classList.remove('open')
    this.els.modal.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('fullscreen-open')
  }

  isOpen(): boolean {
    return this.els.modal.classList.contains('open')
  }

  onResize(): void {
    if (!this.isOpen()) return
    this.session?.onResize?.()
  }
}
