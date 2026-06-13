import { PairwiseMaps, BrisqueWorkerSuccess } from './types'
import { AnalysisResult } from '../../shell/types'

/** Данные BRISQUE для визуализаций (масштаб 1) */
export interface BrisquePayload {
  mu: Float32Array
  sigma: Float32Array
  mscn: Float32Array
  pairwise: PairwiseMaps
  features36: Float32Array
}

export function brisquePayloadFromWorker(data: BrisqueWorkerSuccess): BrisquePayload {
  return {
    mu: data.mu,
    sigma: data.sigma,
    mscn: data.mscn,
    pairwise: data.pairwise,
    features36: data.features36
  }
}

export function analysisResultFromWorker(data: BrisqueWorkerSuccess): AnalysisResult<BrisquePayload> {
  return {
    requestId: data.requestId,
    width: data.width,
    height: data.height,
    score: { label: 'BRISQUE', value: data.finalScore },
    payload: brisquePayloadFromWorker(data)
  }
}
