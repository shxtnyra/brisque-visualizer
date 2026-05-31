import { BrisquePipeline } from './BrisquePipeline'
import { WorkerInput, BrisqueWorkerSuccess, BrisqueWorkerError } from '../../types'

/**
 * Воркeр, выполняющий BRISQUE-пайплайн в отдельном потоке для избежания
 * блокировки UI. Обменивается данными через postMessage/Transferable.
 */
declare const self: DedicatedWorkerGlobalScope

const pipeline = new BrisquePipeline()

/**
 * Обработчик входящих сообщений: принимает `WorkerInput`, выполняет вычисления
 * и отсылает результат обратно в основной поток. Активно использует Transferable
 * buffers для эффективной передачи больших массивов.
 */
self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { rgbaArray, width, height, requestId } = e.data

  try {
    // Выполняем тяжелую математику в фоновом потоке
    const result = pipeline.execute(rgbaArray, width, height)

    // Извлекаем типизированные массивы
    const mu = result.scale1Mscn.mu
    const sigma = result.scale1Mscn.sigma
    const mscn = result.scale1Mscn.mscn
    const pairwise = result.scale1Pairwise
    const features36 = result.features36
    const finalScore = result.finalScore

    // Передаем данные обратно в Main-поток.
    // Вторым аргументом указываем список буферов для депортации (Transferable),
    // чтобы избежать тяжелого копирования памяти.
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
