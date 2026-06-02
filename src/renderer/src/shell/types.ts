/**
 * Контракты оболочки приложения (независимы от конкретного метода оценки качества).
 */

export interface AnalysisScore {
  label: string
  value: number
}

/** Унифицированный ответ анализа для UI */
export interface AnalysisResult<TPayload = unknown> {
  requestId: number
  width: number
  height: number
  score: AnalysisScore
  payload: TPayload
}

/** Вкладка сайдбара, создаваемая плагином метода */
export interface SidebarPanel {
  readonly id: string
  readonly title: string
  /** Ключ контекста для HelpManager */
  readonly helpContext: string
  mount(host: HTMLElement): void
  destroy(): void
  onResult(result: AnalysisResult | null): void
  onActivate?(): void
  onSidebarResize?(): void
}

export type HelpContextKey = string
