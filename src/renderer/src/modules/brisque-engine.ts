/**
 * Результаты математического анализа и визуализации алгоритма BRISQUE.
 */
export interface BrisquePipelineResult {
  /** Карта локального среднего (визуализация) */
  muImageData: ImageData
  /** Карта локального стандартного отклонения (визуализация) */
  sigmaImageData: ImageData
  /** Карта MSCN-коэффициентов (визуализация для пользователя) */
  mscnImageData: ImageData
  /** Реальные непрерывные коэффициенты MSCN для статистического анализа (построения гистограмм) */
  rawMscnFeatures: Float32Array
}

let cachedSize = 0
let tBuffer = new Float32Array(0)

/**
 * Выделяет или переиспользует буфер для оптимизации работы с памятью.
 * Исключает частый вызов Garbage Collector при интерактивном изменении ROI.
 * Вычислительная сложность: O(1) при повторном использовании.
 */
function getTmpBuffer(size: number): Float32Array {
  if (size > cachedSize) {
    tBuffer = new Float32Array(size)
    cachedSize = size
  }
  return tBuffer
}

/**
 * Выполняет вычисление карт признаков безэталонной оценки качества BRISQUE.
 * Использует оптимизированный алгоритм скользящего окна для детекции локальных искажений.
 *
 * @param imageData Исходные пиксели выделенной области (ROI)
 * @param width Ширина области в пикселях
 * @param height Высота области в пикселях
 * @returns Объект с картами визуализации и массивом сырых признаков для гистограмм
 */
export function processBrisqueMaps(
  imageData: ImageData,
  width: number,
  height: number
): BrisquePipelineResult {
  const data = imageData.data
  const totalPixels = width * height

  const gray = new Float32Array(totalPixels)
  const mu = new Float32Array(totalPixels)
  const diffSquared = new Float32Array(totalPixels)
  const sigma = new Float32Array(totalPixels)
  const rawMscnFeatures = new Float32Array(totalPixels)

  // 1. Конвертация в пространство градаций серого (излучательная яркость)
  // Используются стандартные веса ITU-R BT.601
  for (let i = 0; i < totalPixels; i++) {
    const idx = i << 2
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
  }

  // 2. Вычисление локального математического ожидания (mu) методом скользящего окна
  applySlidingBoxBlur(gray, mu, width, height, 3)

  // 3. Вычисление центрированной разности (вычитание локального среднего)
  for (let i = 0; i < totalPixels; i++) {
    const diff = gray[i] - mu[i]
    diffSquared[i] = diff * diff
  }

  // 4. Вычисление локальной дисперсии и среднеквадратичного отклонения (sigma)
  applySlidingBoxBlur(diffSquared, sigma, width, height, 3)
  for (let i = 0; i < totalPixels; i++) {
    sigma[i] = Math.sqrt(Math.max(0, sigma[i]))
  }

  // 5. Формирование буферов визуализации и извлечение истинных признаков
  const muImgArray = new Uint8ClampedArray(totalPixels * 4)
  const sigmaImgArray = new Uint8ClampedArray(totalPixels * 4)
  const mscnImgArray = new Uint8ClampedArray(totalPixels * 4)

  const CONST_C = 1.0 // Константа стабилизации при делении на близкие к нулю значения

  for (let i = 0; i < totalPixels; i++) {
    const pxIdx = i << 2

    // Истинное значение MSCN (используется для анализа и графиков)
    const mscn = (gray[i] - mu[i]) / (sigma[i] + CONST_C)
    rawMscnFeatures[i] = mscn

    // --- БЛОК ПОДГОТОВКИ ДАННЫХ К ВИЗУАЛИЗАЦИИ (КЛЭМПИНГ И МАСШТАБИРОВАНИЕ) ---

    // Ограничение яркости локального среднего [0; 255]
    const muVal = Math.min(255, Math.max(0, mu[i]))

    // Искусственное усиление контраста карты дисперсии (в 3 раза) для улучшения читаемости границ
    const sigmaVal = Math.min(255, sigma[i] * 3.0)

    // Линейное отображение вещественного диапазона MSCN [-3.2; 3.2] в оптический диапазон [0; 255]
    const mscnDisplayVal = Math.min(255, Math.max(0, mscn * 40.0 + 128.0))

    // Заполнение каналов RGBA для отображения на холсте (оттенки серого)
    muImgArray[pxIdx] = muImgArray[pxIdx + 1] = muImgArray[pxIdx + 2] = muVal
    muImgArray[pxIdx + 3] = 255

    sigmaImgArray[pxIdx] = sigmaImgArray[pxIdx + 1] = sigmaImgArray[pxIdx + 2] = sigmaVal
    sigmaImgArray[pxIdx + 3] = 255

    mscnImgArray[pxIdx] = mscnImgArray[pxIdx + 1] = mscnImgArray[pxIdx + 2] = mscnDisplayVal
    mscnImgArray[pxIdx + 3] = 255
  }

  return {
    muImageData: new ImageData(muImgArray, width, height),
    sigmaImageData: new ImageData(sigmaImgArray, width, height),
    mscnImageData: new ImageData(mscnImgArray, width, height),
    rawMscnFeatures // Передаем чистые данные без искажений масштабирования
  }
}

/**
 * Алгоритм быстрого размытия скользящим средним.
 * Вычислительная сложность: O(N) по числу пикселей, инвариантна к радиусу фильтра.
 */
function applySlidingBoxBlur(
  input: Float32Array,
  output: Float32Array,
  width: number,
  height: number,
  radius: number
): void {
  const totalPixels = width * height
  const temp = getTmpBuffer(totalPixels)
  const windowSize = radius * 2 + 1

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width
    let sum = 0
    for (let k = -radius; k <= radius; k++) {
      sum += input[rowOffset + Math.max(0, Math.min(width - 1, k))]
    }
    temp[rowOffset] = sum / windowSize

    for (let x = 1; x < width; x++) {
      const li = Math.max(0, x - radius - 1)
      const ri = Math.min(width - 1, x + radius)
      sum += input[rowOffset + ri] - input[rowOffset + li]
      temp[rowOffset + x] = sum / windowSize
    }
  }

  for (let x = 0; x < width; x++) {
    let sum = 0
    for (let k = -radius; k <= radius; k++) {
      sum += temp[Math.max(0, Math.min(height - 1, k)) * width + x]
    }
    output[x] = sum / windowSize

    for (let y = 1; y < height; y++) {
      const ti = Math.max(0, y - radius - 1)
      const bi = Math.min(height - 1, y + radius)
      sum += temp[bi * width + x] - temp[ti * width + x]
      output[y * width + x] = sum / windowSize
    }
  }
}
