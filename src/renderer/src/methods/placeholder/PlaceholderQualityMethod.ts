import { QualityMethod } from '../../shell/QualityMethod'
import { AnalysisResult } from '../../shell/types'

export interface PlaceholderWorkerSuccess {
  success: true
  requestId: number
  width: number
  height: number
}

export interface PlaceholderWorkerError {
  success: false
  requestId: number
  error: string
}

/**
 * Заглушка метода (NIQE и др.) — для проверки MethodSwitcher в UI.
 */
export class PlaceholderQualityMethod implements QualityMethod {
  readonly id = 'placeholder'
  readonly displayName = 'NIQE (заглушка)'

  createWorker(): Worker {
    return new Worker(new URL('./placeholder.worker.ts', import.meta.url), { type: 'module' })
  }

  parseWorkerMessage(data: unknown): AnalysisResult | null {
    const response = data as PlaceholderWorkerSuccess | PlaceholderWorkerError
    if (!response.success) return null
    return {
      requestId: response.requestId,
      width: response.width,
      height: response.height,
      score: { label: 'NIQE', value: 0 },
      payload: null
    }
  }

  getWorkerError(data: unknown): string | null {
    const response = data as PlaceholderWorkerSuccess | PlaceholderWorkerError
    if (response.success) return null
    return (response as PlaceholderWorkerError).error
  }
}
