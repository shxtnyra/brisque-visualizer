import { QualityMethod } from '../../shell/QualityMethod'
import { AnalysisResult } from '../../shell/types'
import { BrisqueWorkerSuccess, BrisqueWorkerError } from './types'
import { analysisResultFromWorker } from './brisquePayload'

/**
 * BRISQUE: воркер-пайплайн и преобразование ответа в AnalysisResult.
 */
export class BrisqueQualityMethod implements QualityMethod {
  readonly id = 'brisque'
  readonly displayName = 'BRISQUE'

  createWorker(): Worker {
    return new Worker(new URL('./brisque.worker.ts', import.meta.url), {
      type: 'module'
    })
  }

  parseWorkerMessage(data: unknown): AnalysisResult | null {
    const response = data as BrisqueWorkerSuccess | BrisqueWorkerError
    if (!response.success) return null
    return analysisResultFromWorker(response as BrisqueWorkerSuccess)
  }

  getWorkerError(data: unknown): string | null {
    const response = data as BrisqueWorkerSuccess | BrisqueWorkerError
    if (response.success) return null
    return (response as BrisqueWorkerError).error
  }
}
