import { MapRenderer } from './ui/MapRenderer'
import { ChartManager } from './ui/ChartManager'
import { SidebarController } from './ui/SidebarController'
import { ViewportManager } from './ui/ViewportManager'
import { SelectionManager } from './ui/SelectionManager'
import { FeaturesRenderer } from './ui/FeaturesRenderer'
import { HelpManager } from './ui/HelpManager' // Импортируем менеджер
import { TooltipManager } from './ui/TooltipManager'

export {}
declare global {
  interface Window {
    api: { openFile: () => Promise<string | null> }
  }
}

// 1. Получаем все элементы DOM
const els = {
  openBtn: document.getElementById('open-btn') as HTMLButtonElement,
  zoomInfo: document.getElementById('zoom-info') as HTMLSpanElement,
  workspace: document.getElementById('workspace') as HTMLDivElement,
  imageWrapper: document.getElementById('image-wrapper') as HTMLDivElement,
  targetImage: document.getElementById('target-image') as HTMLImageElement,
  selectionBox: document.getElementById('selection-box') as HTMLDivElement,
  selectionInfo: document.getElementById('selection-info') as HTMLDivElement,
  scoreContainer: document.getElementById('brisque-score-container') as HTMLDivElement,
  scoreVal: document.getElementById('brisque-score-val') as HTMLDivElement,

  // Канвасы
  previewCanvas: document.getElementById('preview-canvas') as HTMLCanvasElement,
  muCanvas: document.getElementById('mu-canvas') as HTMLCanvasElement,
  sigmaCanvas: document.getElementById('sigma-canvas') as HTMLCanvasElement,
  mscnCanvas: document.getElementById('mscn-canvas') as HTMLCanvasElement,
  mscnChartCanvas: document.getElementById('mscn-chart-canvas') as HTMLCanvasElement,

  // Вкладки и сайдбар
  sidebar: document.getElementById('sidebar') as HTMLDivElement,
  resizer: document.getElementById('sidebar-resizer') as HTMLDivElement,
  qaTabsNav: document.getElementById('qa-tabs-nav') as HTMLDivElement,
  qaTabsContainer: document.getElementById('qa-tabs-container') as HTMLDivElement,
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content')
}

// willReadFrequently: true критически важен, так как мы постоянно читаем пиксели
const ctx = els.previewCanvas.getContext('2d', { willReadFrequently: true })!
ctx.imageSmoothingEnabled = false

// 2. Инициализация Воркера и Менеджеров UI
const brisqueWorker = new Worker(new URL('./core/brisque/brisque.worker.ts', import.meta.url), {
  type: 'module'
})

new TooltipManager()
const mapRenderer = new MapRenderer()
const chartManager = new ChartManager(els.mscnChartCanvas)
const featuresRenderer = new FeaturesRenderer('tab-features')
const helpManager = new HelpManager('academic-help-container')

// Кэш и флаг занятости фонового потока
let lastMscnData: Float32Array | null = null
let isWorkerBusy = false

// 3. Обработка ответов от Web Worker
brisqueWorker.onmessage = (e: MessageEvent) => {
  isWorkerBusy = false // Воркер освободился, готов принять новую задачу

  const response = e.data
  if (!response.success) {
    console.error('Ошибка в воркере:', response.error)
    return
  }

  const { mu, sigma, mscn, features36, finalScore, width, height } = response

  // Кэшируем массив для перерисовки графика при ресайзе окна
  lastMscnData = mscn

  // Рендерим маски на канвасы (Main Thread занимается только UI)
  els.muCanvas.getContext('2d')!.putImageData(mapRenderer.renderMu(mu, width, height), 0, 0)
  els.sigmaCanvas
    .getContext('2d')!
    .putImageData(mapRenderer.renderSigma(sigma, width, height), 0, 0)
  els.mscnCanvas.getContext('2d')!.putImageData(mapRenderer.renderMscn(mscn, width, height), 0, 0)

  // Отрисовываем графики и таблицы
  chartManager.drawMscnHistogram(lastMscnData)
  featuresRenderer.render(features36)

  if (finalScore !== undefined) {
    els.scoreContainer.style.display = 'block'
    // Округляем до двух знаков
    els.scoreVal.textContent = finalScore.toFixed(2)

    // Цветовая индикация качества (оценки примерные, можно настроить под себя)
    if (finalScore < 30) {
      els.scoreVal.style.color = '#00ffcc' // Отличное качество (Зелено-голубой)
    } else if (finalScore < 60) {
      els.scoreVal.style.color = '#ffaa00' // Среднее качество (Оранжевый)
    } else {
      els.scoreVal.style.color = '#ff4444' // Плохое качество (Красный)
    }
  }
}

// Загружаем начальный контекст для первого открытого таба (например, карт)
helpManager.updateContext('tab-maps')

// 4. Инициализация UI Вкладок
els.tabBtns.forEach(btn => {
  btn.addEventListener('click', e => {
    const targetId = (e.target as HTMLElement).dataset.target
    els.tabBtns.forEach(b => b.classList.remove('active'))
    els.tabContents.forEach(c => c.classList.remove('active'))
    ;(e.target as HTMLElement).classList.add('active')

    const activeContent = document.getElementById(targetId!)
    activeContent?.classList.add('active')

    // Принудительное обновление при переключении табов
    if (targetId === 'tab-maps' || targetId === 'tab-charts') {
      helpManager.updateContext(targetId)
      const crop = selection.getCrop()
      if (crop.w > 0 && crop.h > 0) {
        // Игнорируем флаг занятости принудительно, если пользователь сам кликнул по табу
        runBrisquePipeline(true)
      }
    }
  })
})

// 5. Интеграция контроллеров (Viewport, Selection, Sidebar)
const viewport = new ViewportManager(
  els.openBtn,
  els.targetImage,
  els.workspace,
  els.zoomInfo,
  () => selection.reset(),
  () => selection.renderBox()
)

const selection = new SelectionManager(
  els.imageWrapper,
  els.targetImage,
  els.selectionBox,
  () => viewport.getZoom(),
  (x, y, w, h) => {
    // 1. Отрисовка рамки и превью оригинала работает всегда мгновенно
    updateOriginalPreview(x, y, w, h)
    // 2. Пробуем запустить расчет (запустится только если воркер свободен)
    runBrisquePipeline()
  },
  // 3. Финальный точный расчет, когда пользователь отпустил мышь
  () => runBrisquePipeline(true)
)

// Обработка ресайза сайдбара и мгновенная перерисовка графика из кэша
new SidebarController(els.sidebar, els.resizer, () => {
  if (lastMscnData) {
    chartManager.drawMscnHistogram(lastMscnData)
  }
})

// 6. Связующие функции
function updateOriginalPreview(x: number, y: number, w: number, h: number) {
  if (w === 0 || h === 0) {
    els.selectionInfo.innerText = 'Размер: 0 x 0 px'
    ctx.clearRect(0, 0, els.previewCanvas.width, els.previewCanvas.height)
    els.qaTabsNav.style.display = 'none'
    els.qaTabsContainer.style.display = 'none'
    lastMscnData = null
    return
  }

  els.selectionInfo.innerText = `Размер: ${w} x ${h} px`
  els.previewCanvas.width = w
  els.previewCanvas.height = h
  ctx.drawImage(els.targetImage, x, y, w, h, 0, 0, w, h)
}

/**
 * Главная функция запуска вычислений.
 * @param force Запустить принудительно (например, при отпускании мыши)
 */
function runBrisquePipeline(force: boolean = false) {
  const crop = selection.getCrop()
  if (crop.w <= 0 || crop.h <= 0) return

  // Встроенный троттлинг: если воркер занят предыдущим кадром, просто пропускаем тик.
  // Это предотвращает накопление очереди сообщений при быстром движении мыши.
  if (isWorkerBusy && !force) return

  // Открываем вкладки
  els.qaTabsNav.style.display = 'flex'
  els.qaTabsContainer.style.display = 'block'

  // Настраиваем размеры холстов под текущий кроп
  els.muCanvas.width = els.sigmaCanvas.width = els.mscnCanvas.width = crop.w
  els.muCanvas.height = els.sigmaCanvas.height = els.mscnCanvas.height = crop.h

  try {
    const imageData = ctx.getImageData(0, 0, crop.w, crop.h)
    const rgbaArray = imageData.data

    isWorkerBusy = true // Блокируем новые запросы до получения ответа

    // Передаем данные в воркер с использованием Transferable Objects (без копирования памяти)
    brisqueWorker.postMessage(
      {
        rgbaArray,
        width: crop.w,
        height: crop.h
      },
      [rgbaArray.buffer]
    )
  } catch (error) {
    console.error('Ошибка отправки задачи в воркер:', error)
    isWorkerBusy = false // Сбрасываем блокировку в случае ошибки
  }
}
