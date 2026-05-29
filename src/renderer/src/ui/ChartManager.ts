interface ChartTheme {
  backgroundColor: string
  gridColor: string
  axisColor: string
  textColor: string
  barGradientStart: string
  barGradientEnd: string
  trendLineColor: string
  font: string
}

const THEME: ChartTheme = {
  backgroundColor: '#111111',
  gridColor: '#222222',
  axisColor: '#444444',
  textColor: '#888888',
  barGradientStart: 'rgba(0, 255, 170, 0.4)',
  barGradientEnd: 'rgba(0, 255, 170, 0.01)',
  trendLineColor: '#00ffaa',
  font: '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
}

/**
 * Менеджер отрисовки аналитических графиков (гистограмма MSCN и вспомогательные
 * визуализации). Работает напрямую с Canvas 2D и адаптирует разрешение под DPR.
 */
export class ChartManager {
  private ctx: CanvasRenderingContext2D

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!
  }

  private stddev(data: Float32Array): number {
    if (data.length === 0) return 1
    let mean = 0
    for (let i = 0; i < data.length; i++) mean += data[i]
    mean = mean / data.length
    let s = 0
    for (let i = 0; i < data.length; i++) {
      const d = data[i] - mean
      s += d * d
    }
    return Math.sqrt(s / data.length)
  }

  // Быстрая свёртка по бинам с гауссовым ядром.
  private smoothBins(bins: Float32Array, sigmaBins = 1): Float32Array {
    const n = bins.length
    const out = new Float32Array(n)
    const radius = Math.min(n, Math.ceil(sigmaBins * 3))
    // Предвычислим ядро
    const kernel: number[] = []
    let ksum = 0
    for (let i = -radius; i <= radius; i++) {
      const v = Math.exp((-0.5 * (i * i)) / (sigmaBins * sigmaBins))
      kernel.push(v)
      ksum += v
    }
    for (let i = 0; i < kernel.length; i++) kernel[i] = kernel[i] / ksum

    for (let i = 0; i < n; i++) {
      let s = 0
      for (let k = -radius; k <= radius; k++) {
        const idx = i + k
        if (idx < 0 || idx >= n) continue
        s += bins[idx] * kernel[k + radius]
      }
      out[i] = s
    }
    return out
  }

  private gaussianPdf(x: number, mean: number, sigma: number): number {
    const inv = 1 / (sigma * Math.sqrt(2 * Math.PI))
    const u = (x - mean) / sigma
    return inv * Math.exp(-0.5 * u * u)
  }

  /**
   * Главный метод отрисовки гистограммы на основе сырых данных MSCN.
   * @param rawMscn Массив коэффициентов MSCN.
   * @param opts Опции отображения (сглаживание, гауссова кривая, столбцы).
   */
  public drawMscnHistogram(
    rawMscn: Float32Array,
    opts?: { showSmoothed?: boolean; showGaussian?: boolean; showBars?: boolean }
  ): void {
    const parent = this.canvas.parentElement
    if (!parent) return

    // Вычисляем реальные размеры контейнера в DOM
    const rect = parent.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    // Адаптируем внутреннее разрешение Canvas под DPI дисплея
    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr

    // Задаем физические размеры через CSS
    this.canvas.style.width = `${rect.width}px`
    this.canvas.style.height = `${rect.height}px`

    const width = rect.width
    const height = rect.height

    this.ctx.save()
    this.ctx.scale(dpr, dpr)
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'high'

    // Очистка холста
    this.ctx.fillStyle = THEME.backgroundColor
    this.ctx.fillRect(0, 0, width, height)

    if (rawMscn.length === 0) {
      this.ctx.restore()
      return
    }

    // Параметры разбиения (Биннинг)
    const BINS_COUNT = 600
    const bins = new Float32Array(BINS_COUNT)
    const MIN_VAL = -3.0
    const MAX_VAL = 3.0
    const RANGE = MAX_VAL - MIN_VAL
    const BIN_WIDTH = RANGE / BINS_COUNT

    // Распределяем пиксели по "корзинам" (bins)
    for (let i = 0; i < rawMscn.length; i++) {
      const val = rawMscn[i]
      let binIdx = Math.floor((val - MIN_VAL) / BIN_WIDTH)
      if (binIdx < 0) binIdx = 0
      if (binIdx >= BINS_COUNT) binIdx = BINS_COUNT - 1
      bins[binIdx]++
    }

    // Нормируем значения гистограммы (переходим к плотности/частоте)
    let maxBinValue = 0
    for (let b = 0; b < BINS_COUNT; b++) {
      bins[b] = bins[b] / rawMscn.length
      if (bins[b] > maxBinValue) maxBinValue = bins[b]
    }
    if (maxBinValue === 0) maxBinValue = 1

    // Геометрия отступов рабочей области графика
    const padding = { top: 15, right: 15, bottom: 20, left: 15 }
    const graphWidth = width - padding.left - padding.right
    const graphHeight = height - padding.top - padding.bottom

    // Рендеринг вертикальной координатной сетки
    this.ctx.strokeStyle = THEME.gridColor
    this.ctx.lineWidth = 1
    this.ctx.fillStyle = THEME.textColor
    this.ctx.font = THEME.font
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'top'

    const ticks = [-3, -2, -1, 0, 1, 2, 3]
    ticks.forEach(tick => {
      const pct = (tick - MIN_VAL) / RANGE
      const x = padding.left + pct * graphWidth

      this.ctx.beginPath()
      this.ctx.moveTo(x, padding.top)
      this.ctx.lineTo(x, padding.top + graphHeight)
      this.ctx.stroke()

      this.ctx.fillText(tick.toString(), x, padding.top + graphHeight + 4)
    })

    // Отрисовка столбцов гистограммы (Заливка градиентом)
    const showBars = opts?.showBars ?? true
    const barWidth = graphWidth / BINS_COUNT
    const gradient = this.ctx.createLinearGradient(0, padding.top, 0, padding.top + graphHeight)
    gradient.addColorStop(0, THEME.barGradientStart)
    gradient.addColorStop(1, THEME.barGradientEnd)
    if (showBars) {
      this.ctx.fillStyle = gradient
      for (let b = 0; b < BINS_COUNT; b++) {
        const hRatio = bins[b] / maxBinValue
        const bHeight = hRatio * graphHeight
        const x = padding.left + b * barWidth
        const y = padding.top + graphHeight - bHeight

        // Добавка +0.5 убирает субпиксельные дыры между барами холста
        this.ctx.fillRect(x, y, barWidth + 0.5, bHeight)
      }
    }

    // Отрисовка непрерывного графика (Линия тренда распределения через центры бинов)
    this.ctx.strokeStyle = THEME.trendLineColor
    this.ctx.lineWidth = 1.5
    this.ctx.beginPath()
    for (let b = 0; b < BINS_COUNT; b++) {
      const hRatio = bins[b] / maxBinValue
      const x = padding.left + b * barWidth + barWidth / 2
      const y = padding.top + graphHeight - hRatio * graphHeight

      if (b === 0) this.ctx.moveTo(x, y)
      else this.ctx.lineTo(x, y)
    }
    this.ctx.stroke()

    // Смягчённая линия через бины (быстрая альтернатива KDE)
    const showSmoothed = opts?.showSmoothed ?? true
    if (showSmoothed) {
      const sigmaBins = 1.0
      const smooth = this.smoothBins(bins, sigmaBins)
      this.ctx.strokeStyle = 'rgba(255,200,60,0.95)'
      this.ctx.lineWidth = 1.6
      this.ctx.beginPath()
      for (let b = 0; b < BINS_COUNT; b++) {
        const hRatio = smooth[b] / maxBinValue
        const x = padding.left + b * barWidth + barWidth / 2
        const y = padding.top + graphHeight - hRatio * graphHeight
        if (b === 0) this.ctx.moveTo(x, y)
        else this.ctx.lineTo(x, y)
      }
      this.ctx.stroke()
    }

    // Эталонная гауссова кривая
    const showGaussian = opts?.showGaussian ?? true
    if (showGaussian) {
      const mean = 0
      const sigma = this.stddev(rawMscn) || 1
      // Вычисляем pdf по центрам бинов
      const pdf: Float32Array = new Float32Array(BINS_COUNT)
      let maxPdf = 0
      for (let b = 0; b < BINS_COUNT; b++) {
        const center = MIN_VAL + (b + 0.5) * BIN_WIDTH
        pdf[b] = this.gaussianPdf(center, mean, sigma)
        if (pdf[b] > maxPdf) maxPdf = pdf[b]
      }
      const scale = maxPdf > 0 ? maxBinValue / maxPdf : 1
      this.ctx.strokeStyle = 'rgba(100,200,255,0.9)'
      this.ctx.lineWidth = 1.2
      this.ctx.setLineDash([6, 4])
      this.ctx.beginPath()
      for (let b = 0; b < BINS_COUNT; b++) {
        const val = pdf[b] * scale
        const x = padding.left + b * barWidth + barWidth / 2
        const y = padding.top + graphHeight - (val / maxBinValue) * graphHeight
        if (b === 0) this.ctx.moveTo(x, y)
        else this.ctx.lineTo(x, y)
      }
      this.ctx.stroke()
      this.ctx.setLineDash([])
    }

    // Отрисовка центральной оси симметрии (Математический ноль)
    const zeroPct = (0 - MIN_VAL) / RANGE
    const zeroX = padding.left + zeroPct * graphWidth

    this.ctx.strokeStyle = THEME.axisColor
    this.ctx.lineWidth = 1
    this.ctx.setLineDash([4, 4])
    this.ctx.beginPath()
    this.ctx.moveTo(zeroX, padding.top)
    this.ctx.lineTo(zeroX, padding.top + graphHeight)
    this.ctx.stroke()
    this.ctx.setLineDash([])

    // Легенда и подписи осей
    // Y-axis label
    this.ctx.save()
    this.ctx.fillStyle = THEME.textColor
    this.ctx.font = THEME.font
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.translate(8, padding.top + graphHeight / 2)
    this.ctx.rotate(-Math.PI / 2)
    this.ctx.fillText('Probability density', 0, 0)
    this.ctx.restore()

    // Легенда (в верхнем правом углу)
    const legendX = padding.left + graphWidth - 6
    const legendY = padding.top + 8
    const lineH = 12
    const gap = 6
    this.ctx.fillStyle = THEME.textColor
    this.ctx.font = '10px sans-serif'
    this.ctx.textAlign = 'right'
    // Bars
    if (showBars) {
      this.ctx.fillStyle = gradient
      this.ctx.fillRect(legendX - 40, legendY, 12, lineH)
      this.ctx.fillStyle = THEME.textColor
      this.ctx.fillText('Histogram', legendX - 46, legendY + lineH / 2)
    }
    // Smoothed
    if (showSmoothed) {
      const yOff = legendY + (showBars ? lineH + gap : 0)
      this.ctx.strokeStyle = 'rgba(255,200,60,0.95)'
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.moveTo(legendX - 40, yOff + lineH / 2)
      this.ctx.lineTo(legendX - 28, yOff + lineH / 2)
      this.ctx.stroke()
      this.ctx.fillStyle = THEME.textColor
      this.ctx.fillText('Smoothed trend', legendX - 46, yOff + lineH / 2)
    }
    // Gaussian
    if (showGaussian) {
      const yOff = legendY + (showBars ? lineH + gap : 0) + (showSmoothed ? lineH + gap : 0)
      this.ctx.strokeStyle = 'rgba(100,200,255,0.9)'
      this.ctx.lineWidth = 1.2
      this.ctx.setLineDash([6, 4])
      this.ctx.beginPath()
      this.ctx.moveTo(legendX - 40, yOff + lineH / 2)
      this.ctx.lineTo(legendX - 28, yOff + lineH / 2)
      this.ctx.stroke()
      this.ctx.setLineDash([])
      this.ctx.fillStyle = THEME.textColor
      this.ctx.fillText('Gaussian fit', legendX - 46, yOff + lineH / 2)
    }

    this.ctx.restore()
  }
}
