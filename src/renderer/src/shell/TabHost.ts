import { HelpManager } from '../ui/HelpManager'
import { AnalysisResult, SidebarPanel } from './types'

/**
 * Динамические вкладки сайдбара: кнопки + контейнеры панелей из плагина метода.
 */
export class TabHost {
  private panels: SidebarPanel[] = []
  private activePanelId: string | null = null

  constructor(
    private tabsNav: HTMLElement,
    private tabsContainer: HTMLElement,
    private helpManager: HelpManager
  ) {}

  install(panels: SidebarPanel[]): void {
    this.clear()
    this.panels = panels

    panels.forEach((panel, index) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'tab-btn' + (index === 0 ? ' active' : '')
      btn.dataset.target = panel.id
      btn.textContent = panel.title
      btn.addEventListener('click', () => this.activate(panel.id))
      this.tabsNav.appendChild(btn)

      const content = document.createElement('div')
      content.className = 'tab-content' + (index === 0 ? ' active' : '')
      content.id = panel.id
      this.tabsContainer.appendChild(content)
      panel.mount(content)
    })

    this.activePanelId = panels[0]?.id ?? null
    if (this.activePanelId) {
      this.helpManager.updateContext(this.panels[0].helpContext)
    }
  }

  show(): void {
    this.tabsNav.style.display = 'flex'
    this.tabsContainer.style.display = 'block'
  }

  hide(): void {
    this.tabsNav.style.display = 'none'
    this.tabsContainer.style.display = 'none'
  }

  clear(): void {
    this.panels.forEach(p => p.destroy())
    this.panels = []
    this.activePanelId = null
    this.tabsNav.innerHTML = ''
    this.tabsContainer.innerHTML = ''
  }

  dispatchResult(result: AnalysisResult | null): void {
    this.panels.forEach(p => p.onResult(result))
    const active = this.getActivePanel()
    if (active) {
      this.helpManager.updateContext(active.helpContext)
    }
  }

  refreshActivePanel(): void {
    const active = this.getActivePanel()
    active?.onActivate?.()
  }

  onSidebarResize(): void {
    this.panels.forEach(p => p.onSidebarResize?.())
  }

  getActiveHelpContext(): string | null {
    return this.getActivePanel()?.helpContext ?? null
  }

  private activate(panelId: string): void {
    this.activePanelId = panelId

    this.tabsNav.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.target === panelId)
    })
    this.tabsContainer.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === panelId)
    })

    const panel = this.getActivePanel()
    if (panel) {
      this.helpManager.updateContext(panel.helpContext)
      panel.onActivate?.()
    }
  }

  private getActivePanel(): SidebarPanel | undefined {
    if (!this.activePanelId) return undefined
    return this.panels.find(p => p.id === this.activePanelId)
  }
}
