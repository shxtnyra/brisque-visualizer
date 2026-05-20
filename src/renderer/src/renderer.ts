export {}

declare global {
  interface Window {
    api: {
      openFile: () => Promise<string | null>
    }
  }
}

const openBtn = document.getElementById('open-btn') as HTMLButtonElement
const zoomInfo = document.getElementById('zoom-info') as HTMLSpanElement
const workspace = document.getElementById('workspace') as HTMLDivElement
const imageWrapper = document.getElementById('image-wrapper') as HTMLDivElement
const targetImage = document.getElementById('target-image') as HTMLImageElement
const selectionBox = document.getElementById('selection-box') as HTMLDivElement
const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement
const selectionInfo = document.getElementById('selection-info') as HTMLDivElement
const ctx = previewCanvas.getContext('2d')

// --- ДОБАВИТЬ К СУЩЕСТВУЮЩИМ ПЕРЕМЕННЫМ В НАЧАЛЕ ФАЙЛА ---
const qaVisuals = document.getElementById('qa-visuals') as HTMLDivElement
const muCanvas = document.getElementById('mu-canvas') as HTMLCanvasElement
const sigmaCanvas = document.getElementById('sigma-canvas') as HTMLCanvasElement
const mscnCanvas = document.getElementById('mscn-canvas') as HTMLCanvasElement
const ctxMu = muCanvas.getContext('2d')
const ctxSigma = sigmaCanvas.getContext('2d')
const ctxMscn = mscnCanvas.getContext('2d')

// Состояние приложения
let zoom = 1.0
type Mode = 'none' | 'drawing' | 'dragging' | 'resizing'
let currentMode: Mode = 'none'
let activeHandle = '' // 'nw', 'ne', 'sw', 'se'

// Координаты мыши для расчетов
let startX = 0
let startY = 0
let dragOffsetX = 0
let dragOffsetY = 0

// Исходные координаты рамки на момент начала ресайза (в оригинальных пикселях картинки)
let initCropX = 0
let initCropY = 0
let initCropW = 0
let initCropH = 0

// Координаты выделенной области относительно ОРИГИНАЛЬНОГО разрешения (1:1)
let cropX = 0
let cropY = 0
let cropW = 0
let cropH = 0

// Минимальный размер рамки в оригинальных пикселях (чтобы не схлопывалась в 0)
const MIN_SIZE = 10

// Открытие файла
openBtn.addEventListener('click', async () => {
  const filePath = await window.api.openFile()
  if (filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/')
    targetImage.crossOrigin = 'anonymous' // КРИТИЧЕСКИ ВАЖНО: запрашиваем CORS-доступ к пикселям
    targetImage.src = `media:///${normalizedPath}`
  }
})

targetImage.addEventListener('load', () => {
  targetImage.style.display = 'block'
  zoom = 1.0
  resetSelection()
  updateImageScale()
})

function updateImageScale(): void {
  if (!targetImage.naturalWidth) return

  targetImage.style.width = `${targetImage.naturalWidth * zoom}px`
  targetImage.style.height = `${targetImage.naturalHeight * zoom}px`
  zoomInfo.innerText = `Масштаб: ${Math.round(zoom * 100)}%`

  if (cropW > 0 && cropH > 0) {
    selectionBox.style.left = `${cropX * zoom}px`
    selectionBox.style.top = `${cropY * zoom}px`
    selectionBox.style.width = `${cropW * zoom}px`
    selectionBox.style.height = `${cropH * zoom}px`
  }
}

workspace.addEventListener(
  'wheel',
  (e: WheelEvent) => {
    if (!targetImage.src) return
    e.preventDefault() // Отключаем стандартный скролл браузера

    // 1. Запоминаем координаты курсора ОТНОСИТЕЛЬНО КОНТЕЙНЕРА workspace
    const rect = workspace.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // 2. Вычисляем, в какую точку НА САМОЙ КАРТИНКЕ указывает курсор сейчас (с учётом текущего скролла)
    const imagePointX = mouseX + workspace.scrollLeft
    const imagePointY = mouseY + workspace.scrollTop

    // 3. Запоминаем старый зум перед изменением
    const oldZoom = zoom

    // 4. Считаем новый масштаб (шаг 10%, границы от 10% до 800%)
    const zoomStep = 0.1
    if (e.deltaY < 0) {
      zoom = Math.min(zoom + zoomStep, 8.0)
    } else {
      zoom = Math.max(zoom - zoomStep, 0.1)
    }

    // Если масштаб не изменился (достиг лимита), ничего не пересчитываем
    if (oldZoom === zoom) return

    // 5. Применяем новый масштаб к картинке и рамке выделения
    updateImageScale()

    // 6. МАГИЯ ГЕОМЕТРИИ: Находим, где эта же точка на картинке окажется при новом зуме
    // Формула: Новая_Точка = Старая_Точка * (Новый_Зум / Старый_Зум)
    const zoomRatio = zoom / oldZoom
    const newImagePointX = imagePointX * zoomRatio
    const newImagePointY = imagePointY * zoomRatio

    // 7. Корректируем положение скролла контейнера, чтобы точка осталась точно под мышкой
    workspace.scrollLeft = newImagePointX - mouseX
    workspace.scrollTop = newImagePointY - mouseY
  },
  { passive: false }
)

/* ================= LOGIC: MOUSE EVENTS ================= */

// 1. Клик по контейнеру (Рисование новой рамки)
imageWrapper.addEventListener('mousedown', (e: MouseEvent) => {
  if (!targetImage.src || e.button !== 0) return

  // Если кликнули по самой рамке или маркеру — игнорируем этот блок
  if (e.target === selectionBox || (e.target as HTMLElement).classList.contains('resize-handle'))
    return

  currentMode = 'drawing'
  const rect = imageWrapper.getBoundingClientRect()
  startX = e.clientX - rect.left
  startY = e.clientY - rect.top

  selectionBox.style.left = `${startX}px`
  selectionBox.style.top = `${startY}px`
  selectionBox.style.width = '0px'
  selectionBox.style.height = '0px'
  selectionBox.style.display = 'block'
})

// 2. Клик по самой рамке (Перетаскивание)
selectionBox.addEventListener('mousedown', (e: MouseEvent) => {
  if (e.button !== 0) return

  // Если кликнули по маркеру, этот обработчик не должен мешать ресайзу
  if ((e.target as HTMLElement).classList.contains('resize-handle')) return

  e.stopPropagation()
  currentMode = 'dragging'

  const rect = imageWrapper.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const clickY = e.clientY - rect.top

  dragOffsetX = clickX - cropX * zoom
  dragOffsetY = clickY - cropY * zoom
})

// 3. Клик по маркеру ресайза (Изменение размера)
selectionBox.querySelectorAll('.resize-handle').forEach(handle => {
  handle.addEventListener('mousedown', (e: Event) => {
    const mouseEvent = e as MouseEvent
    if (mouseEvent.button !== 0) return
    mouseEvent.stopPropagation() // Предотвращаем запуск режима dragging

    currentMode = 'resizing'
    activeHandle = (mouseEvent.target as HTMLElement).dataset.handle || ''

    const rect = imageWrapper.getBoundingClientRect()
    startX = mouseEvent.clientX - rect.left
    startY = mouseEvent.clientY - rect.top

    // Фиксируем стартовую геометрию рамки в оригинальных пикселях
    initCropX = cropX
    initCropY = cropY
    initCropW = cropW
    initCropH = cropH
  })
})

// 4. Движение мыши (Общий расчет)
window.addEventListener('mousemove', (e: MouseEvent) => {
  if (currentMode === 'none') return

  const rect = imageWrapper.getBoundingClientRect()
  let currentX = e.clientX - rect.left
  let currentY = e.clientY - rect.top

  // Ограничиваем движение курсора краями изображения
  currentX = Math.max(0, Math.min(currentX, rect.width))
  currentY = Math.max(0, Math.min(currentY, rect.height))

  if (currentMode === 'drawing') {
    const x = Math.min(startX, currentX)
    const y = Math.min(startY, currentY)
    const w = Math.abs(startX - currentX)
    const h = Math.abs(startY - currentY)

    cropX = x / zoom
    cropY = y / zoom
    cropW = w / zoom
    cropH = h / zoom
  } else if (currentMode === 'dragging') {
    let targetLeft = currentX - dragOffsetX
    let targetTop = currentY - dragOffsetY

    const maxLeft = rect.width - cropW * zoom
    const maxTop = rect.height - cropH * zoom

    targetLeft = Math.max(0, Math.min(targetLeft, maxLeft))
    targetTop = Math.max(0, Math.min(targetTop, maxTop))

    cropX = targetLeft / zoom
    cropY = targetTop / zoom
  } else if (currentMode === 'resizing') {
    // Переводим текущее смещение мыши в оригинальные пиксели картинки
    const deltaX = (currentX - startX) / zoom
    const deltaY = (currentY - startY) / zoom

    // Математика изменения сторон в зависимости от выбранного угла
    if (activeHandle === 'se') {
      // Нижний-правый
      cropW = Math.max(MIN_SIZE, initCropW + deltaX)
      cropH = Math.max(MIN_SIZE, initCropH + deltaY)
      // Проверка правой и нижней границы картинки
      if (cropX + cropW > targetImage.naturalWidth) cropW = targetImage.naturalWidth - cropX
      if (cropY + cropH > targetImage.naturalHeight) cropH = targetImage.naturalHeight - cropY
    } else if (activeHandle === 'sw') {
      // Нижний-левый
      const potentialW = initCropW - deltaX
      if (potentialW >= MIN_SIZE) {
        const newX = initCropX + deltaX
        if (newX >= 0) {
          cropX = newX
          cropW = potentialW
        }
      }
      cropH = Math.max(MIN_SIZE, initCropH + deltaY)
      if (cropY + cropH > targetImage.naturalHeight) cropH = targetImage.naturalHeight - cropY
    } else if (activeHandle === 'ne') {
      // Верхний-правый
      cropW = Math.max(MIN_SIZE, initCropW + deltaX)
      if (cropX + cropW > targetImage.naturalWidth) cropW = targetImage.naturalWidth - cropX

      const potentialH = initCropH - deltaY
      if (potentialH >= MIN_SIZE) {
        const newY = initCropY + deltaY
        if (newY >= 0) {
          cropY = newY
          cropH = potentialH
        }
      }
    } else if (activeHandle === 'nw') {
      // Верхний-левый
      const potentialW = initCropW - deltaX
      if (potentialW >= MIN_SIZE) {
        const newX = initCropX + deltaX
        if (newX >= 0) {
          cropX = newX
          cropW = potentialW
        }
      }
      const potentialH = initCropH - deltaY
      if (potentialH >= MIN_SIZE) {
        const newY = initCropY + deltaY
        if (newY >= 0) {
          cropY = newY
          cropH = potentialH
        }
      }
    }
  }

  // Синхронизируем визуальное отображение рамки на экране
  selectionBox.style.left = `${cropX * zoom}px`
  selectionBox.style.top = `${cropY * zoom}px`
  selectionBox.style.width = `${cropW * zoom}px`
  selectionBox.style.height = `${cropH * zoom}px`

  updatePreview()
})

// 5. Отпускание мыши
window.addEventListener('mouseup', () => {
  const previousMode = currentMode

  // Сбрасываем режимы СРАЗУ, чтобы мышь не залипала ни при каких обстоятельствах
  currentMode = 'none'
  activeHandle = ''

  // Теперь спокойно и изолированно выполняем тяжелые расчеты
  try {
    if (previousMode === 'drawing') {
      if (cropW === 0 || cropH === 0) {
        resetSelection()
      } else {
        generateBrisqueVisuals()
      }
    } else if (previousMode === 'resizing' || previousMode === 'dragging') {
      generateBrisqueVisuals()
    }
  } catch (error) {
    console.error('Критическая ошибка при расчете визуализаций BRISQUE:', error)
  }
})

function resetSelection(): void {
  selectionBox.style.display = 'none'
  cropX = cropY = cropW = cropH = 0
  selectionInfo.innerText = 'Размер: 0 x 0 px'
  if (ctx) ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
}

function updatePreview(): void {
  if (!ctx || cropW <= 0 || cropH <= 0) return

  selectionInfo.innerText = `Размер: ${Math.round(cropW)} x ${Math.round(cropH)} px`

  previewCanvas.width = cropW
  previewCanvas.height = cropH

  ctx.drawImage(targetImage, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
}

// --- ДОБАВИТЬ В ФУНКЦИЮ resetSelection() ---
// Внутри resetSelection() добавьте: qaVisuals.style.display = 'none'

/* ================= LOGIC: BRISQUE VISUALIZATION ================= */

function generateBrisqueVisuals() {
  if (!ctx || cropW <= 0 || cropH <= 0) return

  // Показываем блок с визуализациями
  qaVisuals.style.display = 'flex'

  const width = Math.round(cropW)
  const height = Math.round(cropH)

  // Настраиваем размеры холстов
  muCanvas.width = sigmaCanvas.width = mscnCanvas.width = width
  muCanvas.height = sigmaCanvas.height = mscnCanvas.height = height

  // Получаем сырые пиксели из оригинального превью (rgba)
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const totalPixels = width * height

  // 1. Перевод в оттенки серого (Luminance)
  const gray = new Float32Array(totalPixels)
  for (let i = 0; i < totalPixels; i++) {
    // Формула яркости
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  }

  // 2. Расчет Локального среднего (μ) - Упрощенный Gaussian Blur 7x7
  const mu = applyFastGaussian(gray, width, height)

  // 3. Расчет Локальной дисперсии (σ)
  const diffSquared = new Float32Array(totalPixels)
  for (let i = 0; i < totalPixels; i++) {
    const diff = gray[i] - mu[i]
    diffSquared[i] = diff * diff
  }
  // sigma = sqrt( blur( (I - mu)^2 ) )
  const blurredDiffSq = applyFastGaussian(diffSquared, width, height)
  const sigma = new Float32Array(totalPixels)
  for (let i = 0; i < totalPixels; i++) {
    sigma[i] = Math.sqrt(Math.max(0, blurredDiffSq[i]))
  }

  // 4. Расчет MSCN-коэффициентов и отрисовка на холсты
  const muImgData = ctxMu!.createImageData(width, height)
  const sigmaImgData = ctxSigma!.createImageData(width, height)
  const mscnImgData = ctxMscn!.createImageData(width, height)

  const C = 1 // Константа для стабильности (согласно статье)

  for (let i = 0; i < totalPixels; i++) {
    // MSCN формула: (I - mu) / (sigma + C)
    const mscn = (gray[i] - mu[i]) / (sigma[i] + C)

    const pxIdx = i * 4

    // Отрисовка μ (просто серое размытое)
    const muVal = Math.min(255, Math.max(0, mu[i]))
    muImgData.data[pxIdx] = muImgData.data[pxIdx + 1] = muImgData.data[pxIdx + 2] = muVal
    muImgData.data[pxIdx + 3] = 255

    // Отрисовка σ (усилим контраст в 3 раза для наглядности границ)
    const sigmaVal = Math.min(255, sigma[i] * 3)
    sigmaImgData.data[pxIdx] =
      sigmaImgData.data[pxIdx + 1] =
      sigmaImgData.data[pxIdx + 2] =
        sigmaVal
    sigmaImgData.data[pxIdx + 3] = 255

    // Отрисовка MSCN (диапазон обычно от -3 до 3, приведем к 0-255, где 0 это 128)
    const mscnDisplayVal = Math.min(255, Math.max(0, mscn * 40 + 128))
    mscnImgData.data[pxIdx] =
      mscnImgData.data[pxIdx + 1] =
      mscnImgData.data[pxIdx + 2] =
        mscnDisplayVal
    mscnImgData.data[pxIdx + 3] = 255
  }

  ctxMu!.putImageData(muImgData, 0, 0)
  ctxSigma!.putImageData(sigmaImgData, 0, 0)
  ctxMscn!.putImageData(mscnImgData, 0, 0)
}

// Вспомогательная функция для быстрого размытия (Box Blur аппроксимация Гаусса)
// Идеально подходит для прототипирования на JS в реальном времени
function applyFastGaussian(input: Float32Array, width: number, height: number): Float32Array {
  const output = new Float32Array(width * height)
  const radius = 3 // Эквивалент окна 7x7

  // Проход по строкам (Горизонтальный)
  const temp = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0,
        count = 0
      for (let k = -radius; k <= radius; k++) {
        const nx = x + k
        if (nx >= 0 && nx < width) {
          sum += input[y * width + nx]
          count++
        }
      }
      temp[y * width + x] = sum / count
    }
  }

  // Проход по столбцам (Вертикальный)
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let sum = 0,
        count = 0
      for (let k = -radius; k <= radius; k++) {
        const ny = y + k
        if (ny >= 0 && ny < height) {
          sum += temp[ny * width + x]
          count++
        }
      }
      output[y * width + x] = sum / count
    }
  }
  return output
}
