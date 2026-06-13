import { HelpPanel } from '../ui/HelpPanel'

import { AnalysisResult, SidebarPanel } from './types'



/**
 * Менеджер вкладок сайдбара.
 *
 * В index.html заданы только пустые контейнеры (#qa-tabs-nav, #qa-tabs-container).
 * Содержимое вкладок (кнопки, панели, canvas) создаёт TabHost по списку SidebarPanel
 * из активного UI-плагина метода (BRISQUE: «Карты», «Графики», «Признаки»).
 *
 * AppController не знает про конкретные вкладки — он лишь вызывает show/hide,
 * install (через MethodSwitcher) и dispatchResult после ответа воркера.
 */
export class TabHost {
  /** Панели текущего метода (порядок = порядок вкладок слева направо). */
  private panels: SidebarPanel[] = []
  /** id активной вкладки (совпадает с panel.id и id div.tab-content). */
  private activePanelId: string | null = null

  /**
   * @param tabsNav Пустой #qa-tabs-nav из HTML — сюда добавляются кнопки .tab-btn.
   * @param tabsContainer Пустой #qa-tabs-container — сюда добавляются div.tab-content.
   * @param helpPanel Блок теории внизу сайдбара; контекст меняется при смене вкладки.
   */
  constructor(
    private tabsNav: HTMLElement,
    private tabsContainer: HTMLElement,
    private helpPanel: HelpPanel
  ) {}



  /**
   * Монтирует набор вкладок нового метода (вызывается из MethodSwitcher при смене UI).
   * Старые вкладки предварительно снимаются через clear().
   *
   * @param panels Массив SidebarPanel из MethodUiPlugin.panels.
   */
  install(panels: SidebarPanel[]): void {
    this.clear()
    this.panels = panels

    panels.forEach((panel, index) => {
      // 1. Кнопка в полосе вкладок
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'tab-btn' + (index === 0 ? ' active' : '')
      btn.dataset.target = panel.id
      btn.textContent = panel.title
      btn.addEventListener('click', () => this.activate(panel.id))
      this.tabsNav.appendChild(btn)

      // 2. Контейнер содержимого вкладки
      const content = document.createElement('div')
      content.className = 'tab-content' + (index === 0 ? ' active' : '')
      content.id = panel.id
      this.tabsContainer.appendChild(content)

      // 3. Панель вставляет свой HTML/canvas внутрь content
      panel.mount(content)
    })

    this.activePanelId = panels[0]?.id ?? null
    if (this.activePanelId) {
      this.helpPanel.updateContext(this.panels[0].helpContext)
    }
  }

  /**
   * Показывает полосу вкладок и контейнер панелей.
   * Вызывается из AppController перед отправкой crop в worker.
   */
  show(): void {
    this.tabsNav.style.display = 'flex'
    this.tabsContainer.style.display = 'block'
  }

  /**
   * Скрывает вкладки (нет crop, сброс выделения, смена метода без пересчёта).
   */
  hide(): void {
    this.tabsNav.style.display = 'none'
    this.tabsContainer.style.display = 'none'
  }

  /**
   * Полностью убирает вкладки текущего метода: destroy панелей, очистка DOM контейнеров.
   * Вызывается перед install другого метода или при teardown в MethodSwitcher.
   */
  clear(): void {
    this.panels.forEach(p => p.destroy())
    this.panels = []
    this.activePanelId = null
    this.tabsNav.innerHTML = ''
    this.tabsContainer.innerHTML = ''
  }


  /**
   * Рассылает результат анализа во все панели метода.
   * Каждая панель сама решает, что рисовать (карты, графики, таблица признаков).
   *
   * @param result Унифицированный ответ shell или null (ошибка worker / сброс crop).
   */
  dispatchResult(result: AnalysisResult | null): void {
    this.panels.forEach(p => p.onResult(result))

    const active = this.getActivePanel()
    if (active) {
      this.helpPanel.updateContext(active.helpContext)
    }
  }


  /**
   * Перерисовка/пересчёт layout активной вкладки (например после ресайза сайдбара).
   */
  refreshActivePanel(): void {
    const active = this.getActivePanel()
    active?.onActivate?.()
  }


  /**
   * Уведомляет все панели об изменении ширины сайдбара (опциональный хук SidebarPanel).
   */
  onSidebarResize(): void {
    this.panels.forEach(p => p.onSidebarResize?.())
  }

  /**
   * Ключ контекста справки для активной вкладки.
   * @returns helpContext панели или null, если вкладок нет.
   */
  getActiveHelpContext(): string | null {
    return this.getActivePanel()?.helpContext ?? null
  }


  /**
   * Переключает видимую вкладку по клику на .tab-btn.
   * Обновляет CSS-класс active, блок теории и вызывает onActivate у панели.
   *
   * @param panelId Значение panel.id / content.id (например 'tab-maps').
   */
  private activate(panelId: string): void {
    this.activePanelId = panelId

    // 1. Подсветка кнопки в nav
    this.tabsNav.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.target === panelId)

    })

    // 2. Показать только div.tab-content с совпадающим id
    this.tabsContainer.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === panelId)
    })

    // 3. Теория
    const panel = this.getActivePanel()
    if (panel) {
      this.helpPanel.updateContext(panel.helpContext)
      panel.onActivate?.()
    }
  }

  /**
   * @returns Панель, соответствующая activePanelId, или undefined.
   */
  private getActivePanel(): SidebarPanel | undefined {
    if (!this.activePanelId) return undefined
    return this.panels.find(p => p.id === this.activePanelId)
  }
}
