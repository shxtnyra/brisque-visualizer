import { AnalysisResult, SidebarPanel } from './types'
import { ShellFullscreenHost } from './ShellFullscreenHost'

/** Вход воркера: RGBA crop + id запроса */
export interface ImageCropInput {
  rgbaArray: Uint8ClampedArray
  width: number
  height: number
  requestId: number
}

/** Вычислительный метод (воркер + разбор ответа) */
export interface QualityMethod {
  readonly id: string
  readonly displayName: string
  createWorker(): Worker
  /** null — ошибка или неуспешный ответ */
  parseWorkerMessage(data: unknown): AnalysisResult | null
  getWorkerError(data: unknown): string | null
}

export interface MethodUiContext {
  previewCanvas: HTMLCanvasElement
  fullscreenHost: ShellFullscreenHost
}

/** UI-плагин метода: вкладки сайдбара и вспомогательные контролы */
export interface MethodUiPlugin {
  readonly panels: SidebarPanel[]
  initFullscreenControls(): void
  initCanvasExportMenu(previewCanvas: HTMLCanvasElement): void
  onSidebarResize(): void
  /** Снять listeners и отвязать fullscreen перед сменой метода */
  dispose(): void
}

export interface RegisteredMethod {
  method: QualityMethod
  createUi: (ctx: MethodUiContext) => MethodUiPlugin
}
