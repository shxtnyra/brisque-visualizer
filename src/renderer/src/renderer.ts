import { initViewport } from './modules/viewport'
import { initSelection } from './modules/selection'
import { processBrisqueMaps } from './modules/brisque-engine'
import { initCharts } from './modules/charts-manager'

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

  // Канвасы
  previewCanvas: document.getElementById('preview-canvas') as HTMLCanvasElement,
  muCanvas: document.getElementById('mu-canvas') as HTMLCanvasElement,
  sigmaCanvas: document.getElementById('sigma-canvas') as HTMLCanvasElement,
  mscnCanvas: document.getElementById('mscn-canvas') as HTMLCanvasElement,
  mscnChartCanvas: document.getElementById('mscn-chart-canvas') as HTMLCanvasElement,

  // Вкладки
  qaTabsNav: document.getElementById('qa-tabs-nav') as HTMLDivElement,
  qaTabsContainer: document.getElementById('qa-tabs-container') as HTMLDivElement,
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content')
}

const ctx = els.previewCanvas.getContext('2d', { willReadFrequently: true })!
ctx.imageSmoothingEnabled = false

// 2. Инициализация UI Вкладок
els.tabBtns.forEach(btn => {
  btn.addEventListener('click', e => {
    const targetId = (e.target as HTMLElement).dataset.target
    els.tabBtns.forEach(b => b.classList.remove('active'))
    els.tabContents.forEach(c => c.classList.remove('active'))
    ;(e.target as HTMLElement).classList.add('active')
    const activeContent = document.getElementById(targetId!)
    activeContent?.classList.add('active')

    // Если пользователь переключился на "Карты", принудительно обновляем содержимое холстов
    if (targetId === 'tab-maps') {
      const crop = selection.getCrop()
      if (crop.w > 0 && crop.h > 0) {
        updateOriginalPreview(crop.x, crop.y, crop.w, crop.h)
        runBrisquePipeline()
      }
    }
  })
})

// 3. Инициализация Модулей
const viewport = initViewport(
  els.openBtn,
  els.targetImage,
  els.workspace,
  els.zoomInfo,
  () => selection.reset(), // При новой картинке сбрасываем рамку
  () => selection.renderBox() // При зуме перерисовываем рамку
)

const charts = initCharts(els.mscnChartCanvas)

// Флаг для контроля кадров анимации
let isPipelinePending = false

const selection = initSelection(
  els.imageWrapper,
  els.targetImage,
  els.selectionBox,
  viewport.getZoom,
  (x, y, w, h) => {
    // 1. Сначала обновляем оригинальный превью
    updateOriginalPreview(x, y, w, h)

    // 2. Запускаем расчет BRISQUE в реальном времени, но не чаще чем обновляется монитор!
    if (!isPipelinePending) {
      isPipelinePending = true
      requestAnimationFrame(() => {
        runBrisquePipeline()
        isPipelinePending = false
      })
    }
  },
  () => {
    // При отпускании мыши просто финально пересчитываем (на всякий случай)
    runBrisquePipeline()
  }
)

// 4. Связующие функции
function updateOriginalPreview(x: number, y: number, w: number, h: number) {
  if (w === 0 || h === 0) {
    els.selectionInfo.innerText = 'Размер: 0 x 0 px'
    ctx.clearRect(0, 0, els.previewCanvas.width, els.previewCanvas.height)
    els.qaTabsNav.style.display = 'none'
    els.qaTabsContainer.style.display = 'none'
    return
  }

  els.selectionInfo.innerText = `Размер: ${w} x ${h} px`

  els.previewCanvas.width = w
  els.previewCanvas.height = h

  ctx.drawImage(els.targetImage, x, y, w, h, 0, 0, w, h)
}

function runBrisquePipeline() {
  const crop = selection.getCrop()
  if (crop.w <= 0 || crop.h <= 0) return

  // Открываем вкладки
  els.qaTabsNav.style.display = 'flex'
  els.qaTabsContainer.style.display = 'block'

  // Настраиваем размеры холстов
  els.muCanvas.width = els.sigmaCanvas.width = els.mscnCanvas.width = crop.w
  els.muCanvas.height = els.sigmaCanvas.height = els.mscnCanvas.height = crop.h

  try {
    // 1. Забираем пиксели
    const imageData = ctx.getImageData(0, 0, crop.w, crop.h)

    // 2. Считаем математику в движке
    // Внутри функции runBrisquePipeline() в renderer.ts:
    const maps = processBrisqueMaps(imageData, crop.w, crop.h)
    lastMscnCache = maps.rawMscnFeatures

    // Рендерим маски на канвасы (они оптимизированы под отображение)
    els.muCanvas.getContext('2d')!.putImageData(maps.muImageData, 0, 0)
    els.sigmaCanvas.getContext('2d')!.putImageData(maps.sigmaImageData, 0, 0)
    els.mscnCanvas.getContext('2d')!.putImageData(maps.mscnImageData, 0, 0)

    // И Самое главное: на графики отправляем чистые математические данные!
    charts.drawHistograms(maps.rawMscnFeatures)

    // Прямой вызов сверхбыстрой отрисовки без задержек интерфейса
    charts.drawHistograms(maps.rawMscnFeatures)
  } catch (error) {
    console.error('Ошибка пайплайна BRISQUE:', error)
  }
}

//Пока тут
const resizer = document.getElementById('sidebar-resizer') as HTMLDivElement
const sidebar = document.getElementById('sidebar') as HTMLDivElement

resizer.addEventListener('mousedown', e => {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = sidebar.offsetWidth

  const doDrag = (moveEvent: MouseEvent) => {
    // Устанавливаем ширину сайдбара равной координате мыши X
    const delta = startX - moveEvent.clientX
    const newWidth = Math.max(420, Math.min(900, startWidth + delta))
    sidebar.style.width = `${newWidth}px`
  }

  const stopDrag = () => {
    window.removeEventListener('mousemove', doDrag)
    window.removeEventListener('mouseup', stopDrag)
  }

  window.addEventListener('mousemove', doDrag)
  window.addEventListener('mouseup', stopDrag)
})

// Кэш для хранения последних рассчитанных признаков
let lastMscnCache: Float32Array | null = null

// Наблюдатель за контейнером графика
const chartContainer = els.mscnChartCanvas.parentElement!

const sidebarObserver = new ResizeObserver(() => {
  // Как только сайдбар поменял ширину — перерисовываем график
  if (lastMscnCache) {
    charts.drawHistograms(lastMscnCache)
  }
})

sidebarObserver.observe(chartContainer)
