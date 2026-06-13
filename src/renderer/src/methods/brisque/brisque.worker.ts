import { BrisquePipeline } from '../../core/brisque/BrisquePipeline'
import { WorkerInput } from '../../types'
import { BrisqueWorkerSuccess, BrisqueWorkerError } from './types'

/**
 * Воркер BRISQUE: тонкий адаптер между UI (postMessage) и core/brisque.
 * Живёт в methods/, не в core — это слой интеграции метода.
 */
export {}

const pipeline = new BrisquePipeline()

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { rgbaArray, width, height, requestId } = e.data

  try {
    const result = pipeline.execute(rgbaArray, width, height)

    const mu = result.scale1Mscn.mu
    const sigma = result.scale1Mscn.sigma
    const mscn = result.scale1Mscn.mscn
    const pairwise = result.scale1Pairwise
    const features36 = result.features36
    const finalScore = result.finalScore

    const response: BrisqueWorkerSuccess = {
      success: true,
      requestId,
      mu,
      sigma,
      mscn,
      pairwise: {
        horizontal: pairwise.horizontal,
        vertical: pairwise.vertical,
        diagonal1: pairwise.diagonal1,
        diagonal2: pairwise.diagonal2
      },
      features36,
      finalScore,
      width,
      height
    }

    self.postMessage(response, [
      mu.buffer,
      sigma.buffer,
      mscn.buffer,
      pairwise.horizontal.buffer,
      pairwise.vertical.buffer,
      pairwise.diagonal1.buffer,
      pairwise.diagonal2.buffer,
      features36.buffer
    ])
  } catch (error: unknown) {
    const sourceError = error instanceof Error ? error : new Error(String(error))
    const errorResponse: BrisqueWorkerError = {
      success: false,
      requestId,
      error: sourceError.message
    }
    self.postMessage(errorResponse)
  }
}
