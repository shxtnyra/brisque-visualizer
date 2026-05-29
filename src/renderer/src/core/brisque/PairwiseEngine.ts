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

    const horizontal = new Float32Array(totalPixels)
    const vertical = new Float32Array(totalPixels)
    const diagonal1 = new Float32Array(totalPixels)
    const diagonal2 = new Float32Array(totalPixels)

    for (let y = 0; y < height; y++) {
      const offset = y * width
      const nextRowOffset = (y + 1) * width
      const hasNextRow = y < height - 1

      for (let x = 0; x < width; x++) {
        const idx = offset + x
        const hasNextCol = x < width - 1
        const hasPrevCol = x > 0

        const currentMscn = mscn[idx]

        // 1. Горизонтальные попарные произведения: H(i, j) = I(i, j) * I(i, j + 1)
        if (hasNextCol) {
          horizontal[idx] = currentMscn * mscn[idx + 1]
        } else {
          horizontal[idx] = 0
        }

        // 2. Вертикальные попарные произведения: V(i, j) = I(i, j) * I(i + 1, j)
        if (hasNextRow) {
          vertical[idx] = currentMscn * mscn[nextRowOffset + x]
        } else {
          vertical[idx] = 0
        }

        // 3. Главная диагональ: D1(i, j) = I(i, j) * I(i + 1, j + 1)
        if (hasNextRow && hasNextCol) {
          diagonal1[idx] = currentMscn * mscn[nextRowOffset + x + 1]
        } else {
          diagonal1[idx] = 0
        }

        // 4. Побочная диагональ: D2(i, j) = I(i, j) * I(i + 1, j - 1)
        if (hasNextRow && hasPrevCol) {
          diagonal2[idx] = currentMscn * mscn[nextRowOffset + x - 1]
        } else {
          diagonal2[idx] = 0
        }
      }
    }

    return { horizontal, vertical, diagonal1, diagonal2 }
  }
}
