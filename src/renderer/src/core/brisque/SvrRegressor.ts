import { BRISQUE_WEIGHTS } from './BrisqueWeights'

/**
 * SVR-регрессор, реализующий предсказание DMOS на основе 36-мерного вектора признаков.
 * Использует заранее обученные веса, опорные векторы и параметры ядра.
 */
export class SvrRegressor {
  private readonly gamma = BRISQUE_WEIGHTS.gamma
  private readonly rho = BRISQUE_WEIGHTS.rho
  private readonly scaleMin = BRISQUE_WEIGHTS.scaleMin
  private readonly scaleMax = BRISQUE_WEIGHTS.scaleMax
  private readonly svCoef = BRISQUE_WEIGHTS.svCoef
  private readonly supportVectorsFlat = BRISQUE_WEIGHTS.supportVectorsFlat

  /**
   * Предсказывает оценку качества изображения (DMOS) по вектору признаков.
   * @param features36 36-мерный вектор признаков.
   * @returns {number} Предсказанное значение DMOS.
   */
  public predict(features36: Float32Array): number {
    const scaledFeatures = this.scaleFeatures(features36)

    let sum = 0
    const numSVs = this.svCoef.length

    for (let i = 0; i < numSVs; i++) {
      const coef = this.svCoef[i]
      // Передаем индекс опорного вектора для смещения в плоском массиве
      const kernelValue = this.rbfKernel(scaledFeatures, i)
      sum += coef * kernelValue
    }

    // Возвращаем результат смещённый на rho.
    return sum - this.rho
  }

  /**
   * Масштабирует признаки в диапазон [-1, 1] по заранее вычисленным min/max.
   * @param features Входной 36-мерный вектор.
   * @returns {Float32Array} Масштабированный вектор.
   */
  private scaleFeatures(features: Float32Array): Float32Array {
    const scaled = new Float32Array(36)

    for (let i = 0; i < 36; i++) {
      const val = features[i]
      const min = this.scaleMin[i]
      const max = this.scaleMax[i]

      if (min === max) {
        scaled[i] = 0
      } else {
        // Формула скейлинга от -1 до 1
        scaled[i] = -1.0 + (2.0 * (val - min)) / (max - min)
      }
    }
    return scaled
  }

  /**
   * RBF-ядро между входным вектором и i-тым опорным вектором.
   * Поддерживает плоское хранение опорных векторов в `supportVectorsFlat`.
   * @param x Входной вектор.
   * @param svIndex Индекс опорного вектора.
   * @returns {number} Значение ядра.
   */
  private rbfKernel(x: Float32Array, svIndex: number): number {
    let sumSqDiff = 0
    const offset = svIndex * 36 // Смещение для конкретного опорного вектора

    for (let i = 0; i < 36; i++) {
      const diff = x[i] - this.supportVectorsFlat[offset + i]
      sumSqDiff += diff * diff
    }

    return Math.exp(-this.gamma * sumSqDiff)
  }
}
