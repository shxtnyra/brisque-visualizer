import { AnalysisResult, SidebarPanel } from '../../../shell/types'

/**
 * Единственная вкладка заглушки: сообщение о разработке.
 */
export class PlaceholderInfoPanel implements SidebarPanel {
  readonly id = 'tab-placeholder'
  readonly title = 'Обзор'
  readonly helpContext = 'tab-placeholder'

  mount(host: HTMLElement): void {
    host.innerHTML = `
      <div class="placeholder-method-box">
        <p><strong>NIQE</strong> пока не подключён.</p>
        <p>Эта вкладка — пример UI-плагина с другим набором панелей (без карт и гистограмм).</p>
        <p>Выберите <strong>BRISQUE</strong> в toolbar, чтобы вернуться к полному анализу.</p>
      </div>
    `
  }

  destroy(): void {}

  onResult(_result: AnalysisResult | null): void {}

  onActivate(): void {}
}
