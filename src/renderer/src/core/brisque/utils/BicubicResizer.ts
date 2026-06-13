import { BufferPool } from '../../shared/BufferPool'

/**
 * Реализация бикубической интерполяции/ресайза с предвычислением весов
 * и индексов для повышения производительности.
 */
export class BicubicResizer {
  private pool: BufferPool

  constructor(pool: BufferPool) {
    this.pool = pool
  }

  /**
   * Бикубическая функция весов (как в MATLAB).
   * @param x Расстояние от центра.
   * @returns {number} Вес ядра для данной дистанции.
   */
  private cubic(x: number): number {
    const a = -0.5
    const absX = Math.abs(x)
    if (absX <= 1.0) {
      return (a + 2) * absX * absX * absX - (a + 3) * absX * absX + 1.0
    } else if (absX <= 2.0) {
      return a * absX * absX * absX - 5 * a * absX * absX + 8 * a * absX - 4 * a
    }
    return 0.0
  }

  /**
   * Предрасчет индексов и весов для одного измерения. Возвращает плоские
   * массивы весов и индексов для каждого выходного пикселя.
   * @param inSize Входный размер (ширина или высота).
   * @param outSize Выходный размер.
   * @returns Объект {weights, indices, windowSize}.
   */
  private createWeights(
    inSize: number,
    outSize: number
  ): { weights: Float32Array; indices: Int32Array; windowSize: number } {
    const scale = outSize / inSize
    // При scale < 1 мы расширяем ядро для антиалиасинга
    const kernelWidth = 4 / scale
    const windowSize = Math.ceil(kernelWidth)

    const weights = new Float32Array(outSize * windowSize)
    const indices = new Int32Array(outSize * windowSize)

    for (let u = 0; u < outSize; u++) {
      // MATLAB center pixel mapping
      const center = (u + 0.5) / scale - 0.5
      const left = Math.floor(center - kernelWidth / 2)

      let weightSum = 0
      const offset = u * windowSize

      for (let i = 0; i < windowSize; i++) {
        const inIndex = left + i
        const distance = (inIndex - center) * scale

        const w = this.cubic(distance) * scale // Умножаем на scale для сохранения яркости
        weights[offset + i] = w
        weightSum += w

        // Обработка краев: Clamp to edge (Replicate padding)
        indices[offset + i] = Math.max(0, Math.min(inSize - 1, inIndex))
      }

      // Нормализация весов, чтобы сумма строго равнялась 1
      for (let i = 0; i < windowSize; i++) {
        weights[offset + i] /= weightSum
      }
    }

    return { weights, indices, windowSize }
  }

  /**
   * Главный метод изменения размера изображения с использованием bi-cubic.
   * @param src Входной монохромный массив пикселей.
   * @param wIn Ширина входного изображения.
   * @param hIn Высота входного изображения.
   * @param dst Выходной массив (предварительно выделен).
   * @param wOut Ширина выходного изображения.
   * @param hOut Высота выходного изображения.
   */
  public resize(
    src: Float32Array,
    wIn: number,
    hIn: number,
    dst: Float32Array,
    wOut: number,
    hOut: number
  ): void {
    // 1. Предварительный расчет весов для X и Y
    const xData = this.createWeights(wIn, wOut)
    const yData = this.createWeights(hIn, hOut)

    // 2. Выделяем временный буфер для результатов горизонтального прохода
    // Размер: (Ширина новая) x (Высота старая)
    const tempBuffer = this.pool.getBuffer('bicubic-temp', wOut * hIn)

    // 3. Горизонтальный проход (сжатие по ширине)
    for (let y = 0; y < hIn; y++) {
      const srcRowOffset = y * wIn
      const tmpRowOffset = y * wOut

      for (let xOut = 0; xOut < wOut; xOut++) {
        let sum = 0
        const weightOffset = xOut * xData.windowSize

        for (let k = 0; k < xData.windowSize; k++) {
          const xIn = xData.indices[weightOffset + k]
          const w = xData.weights[weightOffset + k]
          sum += src[srcRowOffset + xIn] * w
        }
        tempBuffer[tmpRowOffset + xOut] = sum
      }
    }

    // 4. Вертикальный проход (сжатие по высоте)
    for (let x = 0; x < wOut; x++) {
      for (let yOut = 0; yOut < hOut; yOut++) {
        let sum = 0
        const weightOffset = yOut * yData.windowSize

        for (let k = 0; k < yData.windowSize; k++) {
          const yIn = yData.indices[weightOffset + k]
          const w = yData.weights[weightOffset + k]
          // Читаем из временного буфера с учетом шага (stride) = wOut
          sum += tempBuffer[yIn * wOut + x] * w
        }
        dst[yOut * wOut + x] = sum
      }
    }
  }
}
