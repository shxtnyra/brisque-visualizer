import { FeaturesExtractor } from '../core/brisque/FeaturesExtractor'
import {
  AggdFitParams,
  ChartYMode,
  GgdFitParams,
  REFERENCE_GGD_ALPHA
} from '../types'

// ---------------------------------------------------------------------------
// Визуальная тема графика (цвета, шрифты). Не влияет на расчёты BRISQUE.
// ---------------------------------------------------------------------------
interface ChartTheme {
  backgroundColor: string
  gridColor: string
  axisColor: string
  textColor: string
  barGradientStart: string
  barGradientEnd: string
  trendLineColor: string
  ggdReferenceColor: string
  ggdFitColor: string
  aggdFitColor: string
  font: string
}

const CHART_CSS_VARS: Record<keyof ChartTheme, string> = {
  backgroundColor: '--chart-bg',
  gridColor: '--chart-grid',
  axisColor: '--chart-axis',
  textColor: '--chart-text',
  barGradientStart: '--chart-bar-start',
  barGradientEnd: '--chart-bar-end',
  trendLineColor: '--chart-trend',
  ggdReferenceColor: '--chart-ggd-ref',
  ggdFitColor: '--chart-ggd-fit',
  aggdFitColor: '--chart-aggd-fit',
  font: '--font-base'
}

// ---------------------------------------------------------------------------
// Параметры гистограммы по оси X.
// Диапазон [-3, 3] покрывает типичные значения MSCN и попарных произведений;
// значения за пределами попадают в крайние бины (намеренное усечение хвостов).
// ---------------------------------------------------------------------------
const BINS_COUNT = 80
const MIN_VAL = -3.0
const MAX_VAL = 3.0
const RANGE = MAX_VAL - MIN_VAL
const BIN_WIDTH = RANGE / BINS_COUNT

interface ChartLayout {
  barWidth: number
  padding: { top: number; left: number }
  graphWidth: number
  graphHeight: number
  maxDensity: number
}

/** Элемент легенды: прямоугольник (столбцы) или линия (кривая / маркер) */
interface HistogramLegendItem {
  type: 'bar' | 'line' | 'dashed-line'
  color: string
  label: string
  lineWidth?: number
  dash?: number[]
}

/**
 * ChartManager — отрисовка гистограмм распределений BRISQUE на HTML Canvas.
 *
 * Не считает признаки заново: получает сырые массивы пикселей и параметры
 * подгонки (α, σ², η) из features36, которые уже вычислил пайплайн.
 *
 * Два публичных входа:
 *  - drawMscnHistogram   — распределение коэффициентов MSCN + кривые GGD
 *  - drawPairwiseHistogram — попарные произведения + кривая AGGD
 */
export class ChartManager {
  private ctx: CanvasRenderingContext2D

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!
  }

  /** Цвета графика из CSS-переменных темы (theme-dark / theme-light). */
  private readTheme(): ChartTheme {
    const root = getComputedStyle(document.documentElement)
    const value = (cssVar: string, fallback: string): string => {
      const raw = root.getPropertyValue(cssVar).trim()
      return raw || fallback
    }

    const theme = {} as ChartTheme
    for (const key of Object.keys(CHART_CSS_VARS) as (keyof ChartTheme)[]) {
      const cssVar = CHART_CSS_VARS[key]
      theme[key] =
        key === 'font'
          ? `12px ${value(cssVar, "'Segoe UI', Roboto, sans-serif")}`
          : value(cssVar, '')
    }
    return theme
  }

  /** Форматирование подписи деления оси Y в зависимости от режима и величины */
  private formatAxisValue(value: number, yMode: ChartYMode): string {
    if (value === 0) return '0'
    if (yMode === 'peak') return value.toFixed(2)
    if (value >= 1) return value.toFixed(1)
    if (value >= 0.1) return value.toFixed(2)
    return value.toFixed(3)
  }

  /** Название оси Y: PDF — настоящая плотность; peak — относительная высота */
  private yAxisLabel(yMode: ChartYMode): string {
    return yMode === 'pdf' ? 'Плотность вероятности' : 'Относительная амплитуда'
  }

  /** Равномерные деления оси Y от 0 до maxDensity (обычно 5 меток) */
  private computeYTicks(max: number, count = 5): number[] {
    if (max <= 0) return [0]
    const ticks: number[] = []
    for (let i = 0; i < count; i++) {
      ticks.push((max * i) / (count - 1))
    }
    return ticks
  }

  /**
   * Шаг 1 статистики: каждый пиксель попадает в один из 80 бинов по значению.
   * Возвращает сырые счётчики (целые числа «сколько пикселей в бине»).
   * Используются все элементы массива — как в fitGgd/fitAggd пайплайна.
   */
  private buildRawBins(values: Float32Array): Float32Array {
    const bins = new Float32Array(BINS_COUNT)

    for (let i = 0; i < values.length; i++) {
      const val = values[i]
      let binIdx = Math.floor((val - MIN_VAL) / BIN_WIDTH)
      if (binIdx < 0) binIdx = 0
      if (binIdx >= BINS_COUNT) binIdx = BINS_COUNT - 1
      bins[binIdx]++
    }

    return bins
  }

  /**
   * Шаг 2 статистики: перевод сырых счётчиков в высоту столбцов графика.
   *
   * pdf:     count / (N · Δx) — оценка плотности вероятности (интеграл ≈ 1)
   * peak:    count / max(count) — самый высокий столбец = 1 (удобно сравнивать форму)
   */
  private normalizeBins(
    rawBins: Float32Array,
    sampleCount: number,
    yMode: ChartYMode
  ): Float32Array {
    const bins = new Float32Array(BINS_COUNT)

    if (yMode === 'pdf') {
      for (let b = 0; b < BINS_COUNT; b++) {
        bins[b] = sampleCount > 0 ? rawBins[b] / (sampleCount * BIN_WIDTH) : 0
      }
      return bins
    }

    let maxCount = 0
    for (let b = 0; b < BINS_COUNT; b++) {
      if (rawBins[b] > maxCount) maxCount = rawBins[b]
    }
    const denom = maxCount > 0 ? maxCount : 1
    for (let b = 0; b < BINS_COUNT; b++) {
      bins[b] = rawBins[b] / denom
    }
    return bins
  }

  /**
   * Вычисляет 80 точек теоретической кривой (GGD или AGGD) в центрах бинов.
   * В режиме peak кривая дополнительно делится на свой максимум (= 1).
   */
  private sampleCurveValues(sampleFn: (center: number) => number, yMode: ChartYMode): Float32Array {
    const values = new Float32Array(BINS_COUNT)
    for (let b = 0; b < BINS_COUNT; b++) {
      const center = MIN_VAL + (b + 0.5) * BIN_WIDTH
      values[b] = sampleFn(center)
    }

    if (yMode === 'pdf') return values

    let maxVal = 0
    for (let b = 0; b < BINS_COUNT; b++) {
      if (values[b] > maxVal) maxVal = values[b]
    }
    const denom = maxVal > 0 ? maxVal : 1
    for (let b = 0; b < BINS_COUNT; b++) {
      values[b] /= denom
    }
    return values
  }

  /** Общий масштаб оси Y: максимум среди столбцов и всех кривых на одном графике */
  private computeMaxScale(bins: Float32Array, curves: Float32Array[]): number {
    let maxDensity = 0
    for (let b = 0; b < BINS_COUNT; b++) {
      if (bins[b] > maxDensity) maxDensity = bins[b]
    }
    for (const curve of curves) {
      for (let b = 0; b < BINS_COUNT; b++) {
        if (curve[b] > maxDensity) maxDensity = curve[b]
      }
    }
    return maxDensity > 0 ? maxDensity : 1
  }

  /** Рисует одну линию поверх гистограммы (эталон, подгонка или огибающая) */
  private drawCurveSamples(
    layout: ChartLayout,
    samples: Float32Array,
    color: string,
    lineWidth: number,
    dash: number[]
  ): void {
    const { barWidth, padding, graphHeight, maxDensity } = layout
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = lineWidth
    this.ctx.setLineDash(dash)
    this.ctx.beginPath()
    for (let b = 0; b < BINS_COUNT; b++) {
      const x = padding.left + b * barWidth + barWidth / 2
      const y = padding.top + graphHeight - (samples[b] / maxDensity) * graphHeight
      if (b === 0) this.ctx.moveTo(x, y)
      else this.ctx.lineTo(x, y)
    }
    this.ctx.stroke()
    this.ctx.setLineDash([])
  }

  /** Вертикальный пунктир: x = 0 для MSCN, x = η для попарных произведений */
  private drawVerticalMarker(layout: ChartLayout, value: number, theme: ChartTheme): void {
    const { padding, graphWidth, graphHeight } = layout
    const pct = (value - MIN_VAL) / RANGE
    const x = padding.left + pct * graphWidth

    this.ctx.strokeStyle = theme.axisColor
    this.ctx.lineWidth = 1
    this.ctx.setLineDash([4, 4])
    this.ctx.beginPath()
    this.ctx.moveTo(x, padding.top)
    this.ctx.lineTo(x, padding.top + graphHeight)
    this.ctx.stroke()
    this.ctx.setLineDash([])
  }

  /**
   * Легенда в правой колонке за пределами сетки графика.
   * Текст выровнен по правому краю canvas, образцы — слева от подписи.
   */
  private drawLegend(
    layout: ChartLayout,
    gradient: CanvasGradient,
    items: HistogramLegendItem[],
    theme: ChartTheme
  ): void {
    const { padding, graphWidth } = layout
    const legendX = padding.left + graphWidth - 6
    let legendY = padding.top + 8
    const lineH = 12
    const gap = 8

    this.ctx.font = '12px sans-serif'
    this.ctx.textAlign = 'right'
    this.ctx.textBaseline = 'middle'

    for (const item of items) {
      if (item.type === 'bar') {
        this.ctx.fillStyle = gradient
        this.ctx.fillRect(legendX- 8, legendY, 12, lineH)
      } else {
        this.ctx.strokeStyle = item.color
        this.ctx.lineWidth = item.lineWidth ?? 1.5
        this.ctx.setLineDash(item.dash ?? [])
        this.ctx.beginPath()
        this.ctx.moveTo(legendX, legendY + lineH / 2)
        this.ctx.lineTo(legendX - 8, legendY + lineH / 2)
        this.ctx.stroke()
        this.ctx.setLineDash([])
      }

      this.ctx.fillStyle = theme.textColor
      this.ctx.fillText(item.label, legendX - 12, legendY + lineH / 2)
      legendY += lineH + gap
    }
  }

  /**
   * Ядро отрисовки: один кадр гистограммы с сеткой, осями, столбцами и легендой.
   * drawCurves — callback, который рисует поверх столбцов линии GGD/AGGD.
   */
  private drawHistogram(
    bins: Float32Array,
    maxDensity: number,
    xLabel: string,
    yMode: ChartYMode,
    legendItems: HistogramLegendItem[],
    markerValue: number | null,
    drawCurves: (layout: ChartLayout) => void
  ): void {
    const theme = this.readTheme()
    const parent = this.canvas.parentElement
    if (!parent) return

    // Подгонка canvas под размер контейнера и DPR (чёткость на Retina)
    const rect = parent.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr
    this.canvas.style.width = `${rect.width}px`
    this.canvas.style.height = `${rect.height}px`

    const width = rect.width
    const height = rect.height

    this.ctx.save()
    this.ctx.scale(dpr, dpr)
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'high'

    this.ctx.fillStyle = theme.backgroundColor
    this.ctx.fillRect(0, 0, width, height)

    const padding = { top: 15, right: 15, bottom: 38, left: 52 }
    const graphWidth = width - padding.left - padding.right
    const graphHeight = height - padding.top - padding.bottom
    const barWidth = graphWidth / BINS_COUNT
    const layout: ChartLayout = { barWidth, padding, graphWidth, graphHeight, maxDensity }

    // --- Сетка и подписи оси Y ---
    this.ctx.strokeStyle = theme.gridColor
    this.ctx.lineWidth = 1
    this.ctx.fillStyle = theme.textColor
    this.ctx.font = theme.font

    const yTicks = this.computeYTicks(maxDensity)
    this.ctx.textAlign = 'right'
    this.ctx.textBaseline = 'middle'
    yTicks.forEach(tick => {
      const y = padding.top + graphHeight - (tick / maxDensity) * graphHeight
      this.ctx.beginPath()
      this.ctx.moveTo(padding.left, y)
      this.ctx.lineTo(padding.left + graphWidth, y)
      this.ctx.stroke()
      this.ctx.fillText(this.formatAxisValue(tick, yMode), padding.left - 6, y)
    })

    // --- Сетка и подписи оси X ---
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'top'
    const xTicks = [-3, -2, -1, 0, 1, 2, 3]
    xTicks.forEach(tick => {
      const pct = (tick - MIN_VAL) / RANGE
      const x = padding.left + pct * graphWidth
      this.ctx.beginPath()
      this.ctx.moveTo(x, padding.top)
      this.ctx.lineTo(x, padding.top + graphHeight)
      this.ctx.stroke()
      this.ctx.fillText(tick.toString(), x, padding.top + graphHeight + 4)
    })
    this.ctx.fillText(xLabel, padding.left + graphWidth / 2, padding.top + graphHeight + 20)

    // --- Столбцы гистограммы ---
    const gradient = this.ctx.createLinearGradient(0, padding.top, 0, padding.top + graphHeight)
    gradient.addColorStop(0, theme.barGradientStart)
    gradient.addColorStop(1, theme.barGradientEnd)

    this.ctx.fillStyle = gradient
    for (let b = 0; b < BINS_COUNT; b++) {
      const hRatio = bins[b] / maxDensity
      const bHeight = hRatio * graphHeight
      const x = padding.left + b * barWidth
      const y = padding.top + graphHeight - bHeight
      // +0.5 px убирает тонкие щели между соседними столбцами
      this.ctx.fillRect(x, y, barWidth + 0.5, bHeight)
    }

    // --- Огибающая: ломаная через вершины столбцов (та же высота, что у bars) ---
    this.ctx.strokeStyle = theme.trendLineColor
    this.ctx.lineWidth = 1.5
    this.ctx.beginPath()
    for (let b = 0; b < BINS_COUNT; b++) {
      const hRatio = bins[b] / maxDensity
      const x = padding.left + b * barWidth + barWidth / 2
      const y = padding.top + graphHeight - hRatio * graphHeight
      if (b === 0) this.ctx.moveTo(x, y)
      else this.ctx.lineTo(x, y)
    }
    this.ctx.stroke()

    // --- Теоретические кривые GGD / AGGD (передаются через callback) ---
    drawCurves(layout)

    if (markerValue !== null) {
      this.drawVerticalMarker(layout, markerValue, theme)
    }

    // --- Подпись оси Y (повёрнута на 90°) ---
    this.ctx.save()
    this.ctx.fillStyle = theme.textColor
    this.ctx.font = theme.font
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.translate(14, padding.top + graphHeight / 2)
    this.ctx.rotate(-Math.PI / 2)
    this.ctx.fillText(this.yAxisLabel(yMode), 0, 0)
    this.ctx.restore()

    this.drawLegend(layout, gradient, legendItems, theme)
    this.ctx.restore()
  }

  /**
   * График распределения MSCN.
   *
   * Вход:
   *  - rawMscn — все коэффициенты MSCN выделенной области (один пиксель = одно число)
   *  - fit — α и σ² из features36 (та же подгонка, что в таблице признаков)
   *  - yMode — pdf или peak
   *
   * На графике:
   *  - столбцы — реальное распределение пикселей
   *  - зелёная пунктирная — эталон GGD с α=2 (идеальное натуральное фото)
   *  - красная — GGD с подогнанным α
   *  - вертикальная линия x=0 — центр симметрии
   */
  public drawMscnHistogram(
    rawMscn: Float32Array,
    fit: GgdFitParams,
    yMode: ChartYMode = 'pdf'
  ): void {
    if (rawMscn.length === 0) return

    const rawBins = this.buildRawBins(rawMscn)
    const bins = this.normalizeBins(rawBins, rawMscn.length, yMode)
    const { alpha: fittedAlpha, variance: fittedVariance } = fit

    const refCurve = this.sampleCurveValues(
      center => FeaturesExtractor.ggdPdf(center, REFERENCE_GGD_ALPHA, fittedVariance),
      yMode
    )
    const fitCurve = this.sampleCurveValues(
      center => FeaturesExtractor.ggdPdf(center, fittedAlpha, fittedVariance),
      yMode
    )
    const maxDensity = this.computeMaxScale(bins, [refCurve, fitCurve])
    const theme = this.readTheme()

    this.drawHistogram(
      bins,
      maxDensity,
      'Коэффициент MSCN',
      yMode,
      [
        { type: 'bar', color: '', label: 'Гистограмма' },
        { type: 'line', color: theme.trendLineColor, label: 'Огибающая', lineWidth: 1.5 },
        {
          type: 'dashed-line',
          color: theme.ggdReferenceColor,
          label: `GGD эталон (α=${REFERENCE_GGD_ALPHA})`,
          lineWidth: 1.2,
          dash: [6, 4]
        },
        {
          type: 'line',
          color: theme.ggdFitColor,
          label: `GGD подгонка (α=${fittedAlpha.toFixed(2)})`,
          lineWidth: 1.5
        }
      ],
      0,
      layout => {
        this.drawCurveSamples(layout, refCurve, theme.ggdReferenceColor, 1.2, [6, 4])
        this.drawCurveSamples(layout, fitCurve, theme.ggdFitColor, 1.5, [])
      }
    )
  }

  /**
   * График распределения попарных произведений MSCN (H, V, D1, D2).
   *
   * Вход:
   *  - data — карта произведений соседних MSCN-пикселей
   *  - fit — параметры AGGD (α, η, σ²_L, σ²_R) из features36
   *
   * На графике:
   *  - красная кривая — теоретическая AGGD-подгонка
   *  - пунктир x=η — смещение асимметрии (признак BRISQUE)
   *  - эталонной кривой нет: для попарных произведений нет универсального α=2
   */
  public drawPairwiseHistogram(
    data: Float32Array,
    xLabel: string,
    fit: AggdFitParams,
    yMode: ChartYMode = 'pdf'
  ): void {
    if (data.length === 0) return

    const rawBins = this.buildRawBins(data)
    const bins = this.normalizeBins(rawBins, data.length, yMode)
    const { alpha: fittedAlpha, leftVariance, rightVariance, eta } = fit

    const fitCurve = this.sampleCurveValues(
      center => FeaturesExtractor.aggdPdf(center, fittedAlpha, leftVariance, rightVariance, eta),
      yMode
    )
    const maxDensity = this.computeMaxScale(bins, [fitCurve])
    const theme = this.readTheme()

    this.drawHistogram(
      bins,
      maxDensity,
      xLabel,
      yMode,
      [
        { type: 'bar', color: '', label: 'Гистограмма' },
        { type: 'line', color: theme.trendLineColor, label: 'Огибающая', lineWidth: 1.5 },
        {
          type: 'line',
          color: theme.aggdFitColor,
          label: `AGGD подгонка (α=${fittedAlpha.toFixed(2)})`,
          lineWidth: 1.5
        },
        {
          type: 'dashed-line',
          color: theme.axisColor,
          label: `η = ${eta.toFixed(4)}`,
          lineWidth: 1,
          dash: [4, 4]
        }
      ],
      eta,
      layout => {
        this.drawCurveSamples(layout, fitCurve, theme.aggdFitColor, 1.5, [])
      }
    )
  }
}
