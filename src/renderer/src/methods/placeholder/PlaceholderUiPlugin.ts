import { MethodUiPlugin } from '../../shell/QualityMethod'
import { PlaceholderInfoPanel } from './panels/PlaceholderInfoPanel'

/**
 * UI заглушки: одна вкладка, без fullscreen и экспорта карт.
 */
export class PlaceholderUiPlugin implements MethodUiPlugin {
  readonly panels = [new PlaceholderInfoPanel()]

  initFullscreenControls(): void {}

  initCanvasExportMenu(_previewCanvas: HTMLCanvasElement): void {}

  onSidebarResize(): void {}

  dispose(): void {
    this.panels.forEach(p => p.destroy())
  }
}
