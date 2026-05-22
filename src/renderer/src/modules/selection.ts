export function initSelection(
  imageWrapper: HTMLDivElement,
  targetImage: HTMLImageElement,
  selectionBox: HTMLDivElement,
  getZoom: () => number,
  onSelectionChange: (cropX: number, cropY: number, cropW: number, cropH: number) => void,
  onSelectionComplete: () => void
) {
  type Mode = 'none' | 'drawing' | 'dragging' | 'resizing'
  let currentMode: Mode = 'none'
  let activeHandle = ''

  let startX = 0,
    startY = 0
  let dragOffsetX = 0,
    dragOffsetY = 0
  let initCropX = 0,
    initCropY = 0,
    initCropW = 0,
    initCropH = 0
  let cropX = 0,
    cropY = 0,
    cropW = 0,
    cropH = 0

  const MIN_SIZE = 10

  // 1. Рисование новой рамки
  imageWrapper.addEventListener('mousedown', (e: MouseEvent) => {
    if (!targetImage.src || e.button !== 0) return
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

  // 2. Перетаскивание рамки
  selectionBox.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).classList.contains('resize-handle')) return
    e.stopPropagation()
    currentMode = 'dragging'

    const rect = imageWrapper.getBoundingClientRect()
    const zoom = getZoom()
    dragOffsetX = e.clientX - rect.left - cropX * zoom
    dragOffsetY = e.clientY - rect.top - cropY * zoom
  })

  // 3. Ресайз за углы
  selectionBox.querySelectorAll('.resize-handle').forEach(handle => {
    handle.addEventListener('mousedown', (e: Event) => {
      const mouseEvent = e as MouseEvent
      if (mouseEvent.button !== 0) return
      mouseEvent.stopPropagation()

      currentMode = 'resizing'
      activeHandle = (mouseEvent.target as HTMLElement).dataset.handle || ''

      const rect = imageWrapper.getBoundingClientRect()
      startX = mouseEvent.clientX - rect.left
      startY = mouseEvent.clientY - rect.top

      initCropX = cropX
      initCropY = cropY
      initCropW = cropW
      initCropH = cropH
    })
  })

  // 4. Движение мыши
  // 4. Движение мыши
  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (currentMode === 'none') return

    const rect = imageWrapper.getBoundingClientRect()
    let currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    let currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    const zoom = getZoom()

    if (currentMode === 'drawing') {
      const x = Math.min(startX, currentX)
      const y = Math.min(startY, currentY)
      // Округляем до целых пикселей оригинального изображения
      cropW = Math.floor(Math.abs(startX - currentX) / zoom)
      cropH = Math.floor(Math.abs(startY - currentY) / zoom)
      cropX = Math.floor(x / zoom)
      cropY = Math.floor(y / zoom)
    } else if (currentMode === 'dragging') {
      let targetLeft = Math.max(0, Math.min(currentX - dragOffsetX, rect.width - cropW * zoom))
      let targetTop = Math.max(0, Math.min(currentY - dragOffsetY, rect.height - cropH * zoom))
      cropX = Math.floor(targetLeft / zoom)
      cropY = Math.floor(targetTop / zoom)
    } else if (currentMode === 'resizing') {
      const deltaX = (currentX - startX) / zoom
      const deltaY = (currentY - startY) / zoom

      if (activeHandle === 'se') {
        cropW = Math.floor(
          Math.min(targetImage.naturalWidth - cropX, Math.max(MIN_SIZE, initCropW + deltaX))
        )
        cropH = Math.floor(
          Math.min(targetImage.naturalHeight - cropY, Math.max(MIN_SIZE, initCropH + deltaY))
        )
      } else if (activeHandle === 'sw') {
        if (initCropW - deltaX >= MIN_SIZE && initCropX + deltaX >= 0) {
          cropX = Math.floor(initCropX + deltaX)
          cropW = Math.floor(initCropW - deltaX)
        }
        cropH = Math.floor(
          Math.min(targetImage.naturalHeight - cropY, Math.max(MIN_SIZE, initCropH + deltaY))
        )
      } else if (activeHandle === 'ne') {
        cropW = Math.floor(
          Math.min(targetImage.naturalWidth - cropX, Math.max(MIN_SIZE, initCropW + deltaX))
        )
        if (initCropH - deltaY >= MIN_SIZE && initCropY + deltaY >= 0) {
          cropY = Math.floor(initCropY + deltaY)
          cropH = Math.floor(initCropH - deltaY)
        }
      } else if (activeHandle === 'nw') {
        if (initCropW - deltaX >= MIN_SIZE && initCropX + deltaX >= 0) {
          cropX = Math.floor(initCropX + deltaX)
          cropW = Math.floor(initCropW - deltaX)
        }
        if (initCropH - deltaY >= MIN_SIZE && initCropY + deltaY >= 0) {
          cropY = Math.floor(initCropY + deltaY)
          cropH = Math.floor(initCropH - deltaY)
        }
      }
    }

    renderBox()
    // Теперь наружу гарантированно уходят только «чистые» целые числа
    onSelectionChange(cropX, cropY, cropW, cropH)
  })

  // 5. Отпускание мыши
  window.addEventListener('mouseup', () => {
    const previousMode = currentMode
    currentMode = 'none'
    activeHandle = ''

    if (previousMode !== 'none') {
      if (cropW < MIN_SIZE || cropH < MIN_SIZE) {
        reset()
      } else {
        onSelectionComplete()
      }
    }
  })

  function renderBox() {
    const zoom = getZoom()
    selectionBox.style.left = `${cropX * zoom}px`
    selectionBox.style.top = `${cropY * zoom}px`
    selectionBox.style.width = `${cropW * zoom}px`
    selectionBox.style.height = `${cropH * zoom}px`
  }

  function reset() {
    selectionBox.style.display = 'none'
    cropX = cropY = cropW = cropH = 0
    onSelectionChange(0, 0, 0, 0)
  }

  // Экспортируем методы для внешнего управления
  return {
    reset,
    renderBox,
    getCrop: () => ({ x: cropX, y: cropY, w: cropW, h: cropH })
  }
}
