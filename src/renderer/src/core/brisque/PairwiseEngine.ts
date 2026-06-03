/**
 * Выходы, содержащие карты попарных произведений для соседних пикселей.
 */
export interface PairwiseOutput {
  horizontal: Float32Array
  vertical: Float32Array
  diagonal1: Float32Array
  diagonal2: Float32Array
}

/**
 * Вычисляет попарные произведения (горизонталь, вертикаль, диагонали)
 * для MSCN карты, необходимые для дальнейшей подгонки AGGD.
 */
export class PairwiseEngine {
  /**
   * Вычисляет пространственные попарные произведения смежных пикселей MSCN карты.
   * @param mscn Карта MSCN значений.
   * @param width Ширина изображения.
   * @param height Высота изображения.
   * @returns {PairwiseOutput} Объекты с картами попарных произведений.
   */
  public compute(mscn: Float32Array, width: number, height: number): PairwiseOutput {
    const totalPixels = width * height

    // Массивы ИЗНАЧАЛЬНО заполнены нулями!
    const horizontal = new Float32Array(totalPixels)
    const vertical = new Float32Array(totalPixels)
    const diagonal1 = new Float32Array(totalPixels)
    const diagonal2 = new Float32Array(totalPixels)

    // 1. Горизонтальные попарные произведения: H(i, j) = I(i, j) * I(i, j + 1)
    for (let y = 0; y < height; y++) {
      const offset = y * width
      for (let x = 0; x < width - 1; x++) {
        const idx = offset + x
        horizontal[idx] = mscn[idx] * mscn[idx + 1]
      }
    }

    // 2. Вертикальные попарные произведения: V(i, j) = I(i, j) * I(i + 1, j)
    for (let y = 0; y < height - 1; y++) {
      const offset = y * width
      const nextRowOffset = (y + 1) * width
      for (let x = 0; x < width; x++) {
        const idx = offset + x
        vertical[idx] = mscn[idx] * mscn[nextRowOffset + x]
      }
    }

    // 3. Главная диагональ: D1(i, j) = I(i, j) * I(i + 1, j + 1)
    for (let y = 0; y < height - 1; y++) {
      const offset = y * width
      const nextRowOffset = (y + 1) * width
      for (let x = 0; x < width - 1; x++) {
        const idx = offset + x
        diagonal1[idx] = mscn[idx] * mscn[nextRowOffset + x + 1]
      }
    }

    // 4. Побочная диагональ: D2(i, j) = I(i, j) * I(i + 1, j - 1)
    for (let y = 0; y < height - 1; y++) {
      const offset = y * width
      const nextRowOffset = (y + 1) * width
      for (let x = 1; x < width; x++) {
        const idx = offset + x
        diagonal2[idx] = mscn[idx] * mscn[nextRowOffset + x - 1]
      }
    }

    return { horizontal, vertical, diagonal1, diagonal2 }
  }
}
