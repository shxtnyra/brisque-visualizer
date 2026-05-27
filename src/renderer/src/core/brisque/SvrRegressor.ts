import { BRISQUE_WEIGHTS } from './BrisqueWeights'

export class SvrRegressor {
  private readonly gamma = BRISQUE_WEIGHTS.gamma
  private readonly rho = BRISQUE_WEIGHTS.rho
  private readonly scaleMin = BRISQUE_WEIGHTS.scaleMin
  private readonly scaleMax = BRISQUE_WEIGHTS.scaleMax
  private readonly svCoef = BRISQUE_WEIGHTS.svCoef
  private readonly supportVectorsFlat = BRISQUE_WEIGHTS.supportVectorsFlat

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

    // Возвращаем результат
    return sum - this.rho
  }

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
