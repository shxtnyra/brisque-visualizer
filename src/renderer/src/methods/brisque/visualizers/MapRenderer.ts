import { isPairwiseBorderPixel, PairwiseDirection } from '../types'

const MSCN_DISPLAY_GAIN = 40
const MSCN_ZERO_GRAY = 128
const SIGMA_DISPLAY_GAIN = 2
const BORDER_PIXEL_GRAY = 48

/**
 * Рендеринг карт BRISQUE (μ, σ, MSCN, попарные) в ImageData.
 */
export class MapRenderer {
  private assertBufferSize(data: Float32Array, w: number, h: number): void {
    if (data.length !== w * h) {
      throw new Error(`MapRenderer: ожидался буфер ${w * h}, получено ${data.length}`)
    }
  }

  private writeGrayPixel(img: ImageData, i: number, gray: number): void {
    const idx = i * 4
    const clamped = Math.max(0, Math.min(255, gray))
    img.data[idx] = img.data[idx + 1] = img.data[idx + 2] = clamped
    img.data[idx + 3] = 255
  }

  private normalizedToGray(value: number): number {
    return value * MSCN_DISPLAY_GAIN + MSCN_ZERO_GRAY
  }

  renderMu(mu: Float32Array, w: number, h: number): ImageData {
    this.assertBufferSize(mu, w, h)
    const img = new ImageData(w, h)
    for (let i = 0; i < mu.length; i++) {
      this.writeGrayPixel(img, i, mu[i])
    }
    return img
  }

  renderSigma(sigma: Float32Array, w: number, h: number): ImageData {
    this.assertBufferSize(sigma, w, h)
    const img = new ImageData(w, h)
    for (let i = 0; i < sigma.length; i++) {
      this.writeGrayPixel(img, i, sigma[i] * SIGMA_DISPLAY_GAIN)
    }
    return img
  }

  renderMscn(mscn: Float32Array, w: number, h: number): ImageData {
    this.assertBufferSize(mscn, w, h)
    const img = new ImageData(w, h)
    for (let i = 0; i < mscn.length; i++) {
      this.writeGrayPixel(img, i, this.normalizedToGray(mscn[i]))
    }
    return img
  }

  renderPairwise(
    pairwise: Float32Array,
    w: number,
    h: number,
    direction: PairwiseDirection
  ): ImageData {
    this.assertBufferSize(pairwise, w, h)
    const img = new ImageData(w, h)
    for (let i = 0; i < pairwise.length; i++) {
      const gray = isPairwiseBorderPixel(i, w, h, direction)
        ? BORDER_PIXEL_GRAY
        : this.normalizedToGray(pairwise[i])
      this.writeGrayPixel(img, i, gray)
    }
    return img
  }
}
