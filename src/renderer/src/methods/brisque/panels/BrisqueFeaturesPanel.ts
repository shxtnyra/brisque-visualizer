import { FeaturesRenderer } from '../../../ui/FeaturesRenderer'
import { AnalysisResult, SidebarPanel } from '../../../shell/types'
import { BrisquePayload } from '../brisquePayload'

/**
 * Вкладка «Признаки»: таблица 36 параметров BRISQUE.
 */
export class BrisqueFeaturesPanel implements SidebarPanel {
  readonly id = 'tab-features'
  readonly title = 'Признаки'
  readonly helpContext = 'tab-features'

  private featuresRenderer!: FeaturesRenderer

  mount(host: HTMLElement): void {
    host.innerHTML = ''
    const root = document.createElement('div')
    root.className = 'features-panel-root'
    host.appendChild(root)
    this.featuresRenderer = new FeaturesRenderer(root)
  }

  destroy(): void {}

  onResult(result: AnalysisResult | null): void {
    if (!result) return
    const payload = result.payload as BrisquePayload
    this.featuresRenderer.render(payload.features36)
  }

  onActivate(): void {}
}
