/**
 * Утилиты для рендеринга карт (`mu`, `sigma`, `mscn`) в виде ImageData,
 * пригодного для отрисовки на Canvas.
 */
export class MapRenderer {
  /**
   * Карта средних значений (μ) - отображается как оттенок серого.
   */
  renderMu(mu: Float32Array, w: number, h: number): ImageData {
    const img = new ImageData(w, h)
    for (let i = 0; i < mu.length; i++) {
      const val = Math.max(0, Math.min(255, mu[i]))
      const idx = i * 4
      img.data[idx] = img.data[idx + 1] = img.data[idx + 2] = val
      img.data[idx + 3] = 255 // Alpha
    }
    return img
  }

  /**
   * Карта локального контраста (σ) - черно-белая.
   */
  renderSigma(sigma: Float32Array, w: number, h: number): ImageData {
    const img = new ImageData(w, h)
    for (let i = 0; i < sigma.length; i++) {
      // Дисперсия может быть небольшой, часто ее умножают на коэффициент (например, 2 или 3) для наглядности
      const val = Math.max(0, Math.min(255, sigma[i] * 2))
      const idx = i * 4
      img.data[idx] = img.data[idx + 1] = img.data[idx + 2] = val
      img.data[idx + 3] = 255
    }
    return img
  }

  /**
   * Коэффициенты MSCN - нормализуем и сдвигаем ноль в серый (128).
   */
  renderMscn(mscn: Float32Array, w: number, h: number): ImageData {
    const img = new ImageData(w, h)
    for (let i = 0; i < mscn.length; i++) {
      // mscn обычно лежит в пределах от -3 до 3. Умножаем на 40 для контраста и сдвигаем к 128
      const val = Math.max(0, Math.min(255, mscn[i] * 40 + 128))
      const idx = i * 4
      img.data[idx] = img.data[idx + 1] = img.data[idx + 2] = val
      img.data[idx + 3] = 255
    }
    return img
  }
}
