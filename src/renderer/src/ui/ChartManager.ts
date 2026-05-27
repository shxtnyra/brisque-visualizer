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

export class ChartManager {
  private ctx: CanvasRenderingContext2D

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!
  }

  /**
   * Главный метод отрисовки гистограммы на основе сырых данных MSCN.
   */
  public drawMscnHistogram(rawMscn: Float32Array): void {
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
    const BINS_COUNT = 60
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

    // Нормируем значения гистограммы (переходим к плотности вероятности)
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
    const barWidth = graphWidth / BINS_COUNT
    const gradient = this.ctx.createLinearGradient(0, padding.top, 0, padding.top + graphHeight)
    gradient.addColorStop(0, THEME.barGradientStart)
    gradient.addColorStop(1, THEME.barGradientEnd)
    this.ctx.fillStyle = gradient

    for (let b = 0; b < BINS_COUNT; b++) {
      const hRatio = bins[b] / maxBinValue
      const bHeight = hRatio * graphHeight
      const x = padding.left + b * barWidth
      const y = padding.top + graphHeight - bHeight

      // Добавка +0.5 убирает субпиксельные дыры между барами холста
      this.ctx.fillRect(x, y, barWidth + 0.5, bHeight)
    }

    // Отрисовка непрерывного графика (Линия тренда распределения)
    this.ctx.strokeStyle = THEME.trendLineColor
    this.ctx.lineWidth = 1.5
    this.ctx.beginPath()

    for (let b = 0; b < BINS_COUNT; b++) {
      const hRatio = bins[b] / maxBinValue
      const x = padding.left + b * barWidth + barWidth / 2
      const y = padding.top + graphHeight - hRatio * graphHeight

      if (b === 0) {
        this.ctx.moveTo(x, y)
      } else {
        this.ctx.lineTo(x, y)
      }
    }
    this.ctx.stroke()

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

    this.ctx.restore()
  }
}
