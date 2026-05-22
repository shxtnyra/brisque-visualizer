export function initViewport(
  openBtn: HTMLButtonElement,
  targetImage: HTMLImageElement,
  workspace: HTMLDivElement,
  zoomInfo: HTMLSpanElement,
  onImageLoad: () => void,
  onZoomChange: (newZoom: number) => void
) {
  let zoom = 1.0

  // 1. Открытие файла
  openBtn.addEventListener('click', async () => {
    const filePath = await window.api.openFile()
    if (filePath) {
      const normalizedPath = filePath.replace(/\\/g, '/')
      targetImage.crossOrigin = 'anonymous' // CORS для getImageData
      targetImage.src = `media:///${normalizedPath}`
    }
  })

  // 2. Изображение загрузилось
  targetImage.addEventListener('load', () => {
    targetImage.style.display = 'block'
    zoom = 1.0
    updateScale()
    onImageLoad()
  })

  // 3. Масштабирование колесом мыши
  workspace.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      if (!targetImage.src) return
      e.preventDefault()

      const rect = workspace.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const imagePointX = mouseX + workspace.scrollLeft
      const imagePointY = mouseY + workspace.scrollTop

      const oldZoom = zoom
      const zoomStep = 0.1

      if (e.deltaY < 0) {
        zoom = Math.min(zoom + zoomStep, 8.0)
      } else {
        zoom = Math.max(zoom - zoomStep, 0.1)
      }

      if (oldZoom === zoom) return

      updateScale()

      const zoomRatio = zoom / oldZoom
      workspace.scrollLeft = imagePointX * zoomRatio - mouseX
      workspace.scrollTop = imagePointY * zoomRatio - mouseY

      onZoomChange(zoom)
    },
    { passive: false }
  )

  // Внутренняя функция обновления стилей
  function updateScale() {
    if (!targetImage.naturalWidth) return
    targetImage.style.width = `${targetImage.naturalWidth * zoom}px`
    targetImage.style.height = `${targetImage.naturalHeight * zoom}px`
    zoomInfo.innerText = `Масштаб: ${Math.round(zoom * 100)}%`
  }

  // Возвращаем метод (getter), чтобы другие модули могли узнать текущий зум
  return {
    getZoom: () => zoom
  }
}
