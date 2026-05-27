import { BufferPool } from './BufferPool'
import { MscnEngine, MscnOutput } from './MscnEngine'
import { PairwiseEngine, PairwiseOutput } from './PairwiseEngine'
import { FeaturesExtractor } from './FeaturesExtractor'
import { SvrRegressor } from './SvrRegressor'
import { BicubicResizer } from './utils/BicubicResizer'

export interface PipelineOutput {
  scale1Mscn: MscnOutput
  scale1Pairwise: PairwiseOutput
  scale2Mscn: MscnOutput
  finalScore: number
  features36: Float32Array
}

export class BrisquePipeline {
  private pool = new BufferPool()
  private mscnEngine = new MscnEngine(this.pool)
  private resizer = new BicubicResizer(this.pool)
  private pairwiseEngine = new PairwiseEngine()
  private extractor = new FeaturesExtractor()
  private regressor = new SvrRegressor()

  /**
   * Запуск полного цикла обработки BRISQUE.
   */
  public execute(rgba: Uint8ClampedArray, width: number, height: number): PipelineOutput {
    const totalPixels = width * height
    const grayScale1 = this.pool.getBuffer('pipeline-gray1', totalPixels)

    // Шаг 1. Перевод RGBA пикселей в карту излучательной яркости (Grayscale) по ITU-R BT.601
    for (let i = 0; i < totalPixels; i++) {
      const idx = i << 2
      grayScale1[i] = 0.2989 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2]
    }

    // Шаг 2. Расчет MSCN и попарных произведений для Scale 1
    const scale1Mscn = this.mscnEngine.compute(grayScale1, width, height)
    const scale1Pairwise = this.pairwiseEngine.compute(scale1Mscn.mscn, width, height)

    // Шаг 3. Бикубическое сжатие изображения в 2 раза для многомасштабного анализа (Scale 2)
    const w2 = Math.floor(width / 2)
    const h2 = Math.floor(height / 2)
    const totalPixels2 = w2 * h2
    const grayScale2 = this.pool.getBuffer('pipeline-gray2', totalPixels2)
    this.resizer.resize(grayScale1, width, height, grayScale2, w2, h2)

    // Шаг 4. Расчет MSCN и попарных произведений для Scale 2
    const scale2Mscn = this.mscnEngine.compute(grayScale2, w2, h2)
    const scale2Pairwise = this.pairwiseEngine.compute(scale2Mscn.mscn, w2, h2)

    // Шаг 5. Экстракция признаков на обоих масштабах (Сборка 36-мерного вектора)
    const features36 = new Float32Array(36)
    this.extractScaleFeatures(scale1Mscn, scale1Pairwise, features36, 0)
    this.extractScaleFeatures(scale2Mscn, scale2Pairwise, features36, 18)

    // Шаг 6. SVR Регрессия — превращение вектора в оценку DMOS
    const finalScore = this.regressor.predict(features36)

    console.log('ВОТ' + features36)

    return {
      scale1Mscn,
      scale1Pairwise,
      scale2Mscn,
      finalScore,
      features36
    }
  }

  /**
   * Сборка 18 признаков для конкретного масштаба в общий вектор.
   */
  private extractScaleFeatures(
    mscn: MscnOutput,
    pw: PairwiseOutput,
    out: Float32Array,
    offset: number
  ): void {
    // 1-2: Фит GGD на карту MSCN
    const [alpha, variance] = this.extractor.fitGgd(mscn.mscn)
    out[offset + 0] = alpha
    out[offset + 1] = variance

    // 3-6: Фит AGGD на Горизонтальные произведения
    const [hAlpha, hVarL, hVarR, hEta] = this.extractor.fitAggd(pw.horizontal)
    // Align with imquality.brisque ordering: [alpha, mean(eta), sigma^2_L, sigma^2_R]
    out[offset + 2] = hAlpha
    out[offset + 3] = hEta
    out[offset + 4] = hVarL
    out[offset + 5] = hVarR

    // 7-10: Фит AGGD на Вертикальные произведения
    const [vAlpha, vVarL, vVarR, vEta] = this.extractor.fitAggd(pw.vertical)
    out[offset + 6] = vAlpha
    out[offset + 7] = vEta
    out[offset + 8] = vVarL
    out[offset + 9] = vVarR

    // 11-14: Фит AGGD на Диагональ 1
    const [d1Alpha, d1VarL, d1VarR, d1Eta] = this.extractor.fitAggd(pw.diagonal1)
    out[offset + 10] = d1Alpha
    out[offset + 11] = d1Eta
    out[offset + 12] = d1VarL
    out[offset + 13] = d1VarR

    // 15-18: Фит AGGD на Диагональ 2
    const [d2Alpha, d2VarL, d2VarR, d2Eta] = this.extractor.fitAggd(pw.diagonal2)
    out[offset + 14] = d2Alpha
    out[offset + 15] = d2Eta
    out[offset + 16] = d2VarL
    out[offset + 17] = d2VarR
  }

  /**
   * Очистить память пула при уничтожении пайплайна.
   */
  public dispose(): void {
    this.pool.clear()
  }
}
