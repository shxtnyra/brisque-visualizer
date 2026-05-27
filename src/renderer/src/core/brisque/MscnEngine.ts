import { BufferPool } from './BufferPool'

export interface MscnOutput {
  mu: Float32Array
  sigma: Float32Array
  mscn: Float32Array
}

export class MscnEngine {
  private readonly CONST_C = 1.0

  constructor(private pool: BufferPool) {}

  /**
   * Выполняет пространственную локальную нормализацию яркости пикселей.
   */
  public compute(gray: Float32Array, width: number, height: number): MscnOutput {
    const totalPixels = width * height

    const mu = new Float32Array(totalPixels)
    // Изменение: нам нужен буфер для квадратов исходных пикселей (I^2)
    const graySquared = this.pool.getBuffer('mscn-gray-squared', totalPixels)
    const sigma = new Float32Array(totalPixels)
    const mscn = new Float32Array(totalPixels)

    const blurTempBuffer = this.pool.getBuffer('blur-temporal', totalPixels)

    // 1. Вычисление локального математического ожидания μ (Гаусс радиуса 3, размер окна 7)
    this.applySeparableGaussian(gray, mu, width, height, 3, blurTempBuffer)

    // 2. Подготовка массива I^2
    for (let i = 0; i < totalPixels; i++) {
      graySquared[i] = gray[i] * gray[i]
    }

    // 3. Вычисление сглаженного массива I^2. Результат пишем во временный массив sigma
    this.applySeparableGaussian(graySquared, sigma, width, height, 3, blurTempBuffer)

    // 4. Вычисление финальных σ и MSCN по формуле MATLAB: sqrt(abs(filter(I^2) - mu^2))
    for (let i = 0; i < totalPixels; i++) {
      const mu_val = mu[i]
      const mu_sq = mu_val * mu_val

      // sigma[i] сейчас содержит filter(I^2)
      // Используем Math.abs для защиты от плавающей погрешности (как в MATLAB)
      sigma[i] = Math.sqrt(Math.abs(sigma[i] - mu_sq))

      // Вычисление финальных коэффициентов MSCN: (I - μ) / (σ + C)
      mscn[i] = (gray[i] - mu_val) / (sigma[i] + this.CONST_C)
    }

    return { mu, sigma, mscn }
  }

  /**
   * Оптимизированный двухпроходной алгоритм размытия скользящим средним.
   * Вычислительная сложность O(N) инвариантна к радиусу фильтра.
   */
  private applySeparableGaussian(
    input: Float32Array,
    output: Float32Array,
    width: number,
    height: number,
    radius: number,
    temp: Float32Array
  ): void {
    // Use a separable Gaussian kernel sampled out to the given radius.
    const size = radius * 2 + 1
    const sigma = 7.0 / 6.0
    const kernel = new Float32Array(size)
    let sumK = 0
    for (let i = -radius; i <= radius; i++) {
      const v = Math.exp(-(i * i) / (2 * sigma * sigma))
      kernel[i + radius] = v
      sumK += v
    }
    // normalize
    for (let i = 0; i < size; i++) kernel[i] /= sumK

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width
      for (let x = 0; x < width; x++) {
        let s = 0
        for (let k = -radius; k <= radius; k++) {
          const xx = Math.max(0, Math.min(width - 1, x + k))
          s += input[rowOffset + xx] * kernel[k + radius]
        }
        temp[rowOffset + x] = s
      }
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let s = 0
        for (let k = -radius; k <= radius; k++) {
          const yy = Math.max(0, Math.min(height - 1, y + k))
          s += temp[yy * width + x] * kernel[k + radius]
        }
        output[y * width + x] = s
      }
    }
  }
}
