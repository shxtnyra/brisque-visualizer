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
  backgroundColor: '#1a1a1a',
  gridColor: '#2d2d2d',
  axisColor: '#444444',
  textColor: '#aaaaaa', // Сделали текст чуть ярче для лучшей читаемости
  barGradientStart: 'rgba(0, 255, 204, 0.35)',
  barGradientEnd: 'rgba(0, 255, 204, 0.02)',
  trendLineColor: '#00ffcc',
  // Используем стандартные системные шрифты, которые отлично сглаживаются ОС
  font: '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
}

export function initCharts(canvasElement: HTMLCanvasElement) {
  const ctx = canvasElement.getContext('2d', { alpha: false })!

  const drawHistograms = (rawMscn: Float32Array): void => {
    const parent = canvasElement.parentElement
    if (!parent) return

    // Автоматически определяем физический размер контейнера в DOM
    const rect = parent.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    // КРИТИЧЕСКИЙ ШАГ: Корректируем внутреннее разрешение под DPI экрана
    canvasElement.width = rect.width * dpr
    canvasElement.height = rect.height * dpr

    // Фиксируем отображаемый размер через CSS-стили элемента
    canvasElement.style.width = `${rect.width}px`
    canvasElement.style.height = `${rect.height}px`

    // Логические (клиентские) размеры для расчета графических координат
    const width = rect.width
    const height = rect.height

    ctx.save()
    // Масштабируем контекст, чтобы писать код в стандартных логических координатах
    ctx.scale(dpr, dpr)

    // Включаем алгоритмы субпиксельного сглаживания
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Заливка фона графика
    ctx.fillStyle = THEME.backgroundColor
    ctx.fillRect(0, 0, width, height)

    if (rawMscn.length === 0) {
      ctx.restore()
      return
    }

    // Алгоритм построения интервалов (Биннинг)
    const BINS_COUNT = 50
    const bins = new Float32Array(BINS_COUNT)
    const MIN_VAL = -3.0
    const MAX_VAL = 3.0
    const RANGE = MAX_VAL - MIN_VAL
    const BIN_WIDTH = RANGE / BINS_COUNT

    for (let i = 0; i < rawMscn.length; i++) {
      const val = rawMscn[i]
      let binIdx = Math.floor((val - MIN_VAL) / BIN_WIDTH)
      if (binIdx < 0) binIdx = 0
      if (binIdx >= BINS_COUNT) binIdx = BINS_COUNT - 1
      bins[binIdx]++
    }

    let maxBinValue = 0
    for (let b = 0; b < BINS_COUNT; b++) {
      bins[b] = bins[b] / rawMscn.length
      if (bins[b] > maxBinValue) maxBinValue = bins[b]
    }

    if (maxBinValue === 0) maxBinValue = 1

    // Внутренние отступы рабочей области графика от краев холста
    const padding = { top: 20, right: 20, bottom: 25, left: 20 }
    const graphWidth = width - padding.left - padding.right
    const graphHeight = height - padding.top - padding.bottom

    // Отрисовка координатной сетки и шрифтовых подписей
    ctx.strokeStyle = THEME.gridColor
    ctx.lineWidth = 1
    ctx.fillStyle = THEME.textColor
    ctx.font = THEME.font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    const labelTicks = [-3, -2, -1, 0, 1, 2, 3]
    labelTicks.forEach(tick => {
      const pct = (tick - MIN_VAL) / RANGE
      const x = padding.left + pct * graphWidth

      ctx.beginPath()
      ctx.moveTo(x, padding.top)
      ctx.lineTo(x, padding.top + graphHeight)
      ctx.stroke()

      // Смещение текста по вертикали вниз под ось
      ctx.fillText(tick.toString(), x, padding.top + graphHeight + 6)
    })

    // Отрисовка столбцов гистограммы плотности вероятности
    const barWidth = graphWidth / BINS_COUNT
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + graphHeight)
    gradient.addColorStop(0, THEME.barGradientStart)
    gradient.addColorStop(1, THEME.barGradientEnd)
    ctx.fillStyle = gradient

    for (let b = 0; b < BINS_COUNT; b++) {
      const hRatio = bins[b] / maxBinValue
      const bHeight = hRatio * graphHeight
      const x = padding.left + b * barWidth
      const y = padding.top + graphHeight - bHeight

      // Добавка +0.4 предотвращает появление пустых субпиксельных зазоров из-за округления координат
      ctx.fillRect(x, y, barWidth + 0.4, bHeight)
    }

    // Отрисовка сглаженной аппроксимирующей кривой распределения
    ctx.strokeStyle = THEME.trendLineColor
    ctx.lineWidth = 1.5
    ctx.beginPath()

    for (let b = 0; b < BINS_COUNT; b++) {
      const hRatio = bins[b] / maxBinValue
      const x = padding.left + b * barWidth + barWidth / 2
      const y = padding.top + graphHeight - hRatio * graphHeight

      if (b === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()

    // Маркировка математического нуля (Ось симметрии распределения)
    const zeroPct = (0 - MIN_VAL) / RANGE
    const zeroX = padding.left + zeroPct * graphWidth

    ctx.strokeStyle = THEME.axisColor
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(zeroX, padding.top)
    ctx.lineTo(zeroX, padding.top + graphHeight)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.restore()
  }

  return {
    drawHistograms
  }
}
