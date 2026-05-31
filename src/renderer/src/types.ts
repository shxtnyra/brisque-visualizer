/**
 * Общие типы и конфигурация UI для BRISQUE Visualizer.
 */

/** Размеры и координаты выделения на холсте */
export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

/** Размер обработанного изображения в пикселях */
export interface ImageSize {
  width: number
  height: number
}

/** Входные данные для BRISQUE воркера */
export interface WorkerInput {
  rgbaArray: Uint8ClampedArray
  width: number
  height: number
  requestId: number
}

/** Карты попарных произведений MSCN (масштаб 1) */
export interface PairwiseMaps {
  horizontal: Float32Array
  vertical: Float32Array
  diagonal1: Float32Array
  diagonal2: Float32Array
}

export type PairwiseDirection = 'horizontal' | 'vertical' | 'diagonal1' | 'diagonal2'

export type ChartKind = 'mscn' | PairwiseDirection

export type MapKind = 'mu' | 'sigma' | 'mscn' | PairwiseDirection

/** Режим шкалы Y на гистограммах */
export type ChartYMode = 'pdf' | 'peak'

/** Режим полноэкранного просмотра */
export type FullscreenMode = 'map' | 'chart'

/** Параметры GGD-подгонки для MSCN (первые 2 признака масштаба) */
export interface GgdFitParams {
  alpha: number
  variance: number
}

/** Параметры AGGD-подгонки для попарных произведений (4 признака на направление) */
export interface AggdFitParams {
  alpha: number
  eta: number
  leftVariance: number
  rightVariance: number
}

/** Метаданные вкладки карты: заголовок и ключ контекстной подсказки */
export interface MapViewMeta {
  title: string
  hint: string
}

/** Метаданные графика попарного направления */
export interface PairwiseChartMeta {
  /** Подпись оси X */
  xLabel: string
  /** Смещение в векторе features36 для scale 1 */
  featureOffset: number
}

/** Эталонное значение α для натуральных MSCN (GGD) по Mittal et al. */
export const REFERENCE_GGD_ALPHA = 2.0

export const MAP_VIEW_META: Record<MapKind, MapViewMeta> = {
  mu: { title: 'Карта μ', hint: 'hint-mu' },
  sigma: { title: 'Карта σ', hint: 'hint-sigma' },
  mscn: { title: 'Карта MSCN', hint: 'hint-mscn' },
  horizontal: { title: 'Попарное H', hint: 'hint-pairwise-h' },
  vertical: { title: 'Попарное V', hint: 'hint-pairwise-v' },
  diagonal1: { title: 'Попарное D1 ↘', hint: 'hint-pairwise-d1' },
  diagonal2: { title: 'Попарное D2 ↙', hint: 'hint-pairwise-d2' }
}

export const PAIRWISE_CHART_META: Record<PairwiseDirection, PairwiseChartMeta> = {
  horizontal: { xLabel: 'Горизонтальное произведение', featureOffset: 2 },
  vertical: { xLabel: 'Вертикальное произведение', featureOffset: 6 },
  diagonal1: { xLabel: 'Диагональное произведение D1', featureOffset: 10 },
  diagonal2: { xLabel: 'Диагональное произведение D2', featureOffset: 14 }
}

/** Читает GGD-параметры MSCN из вектора признаков BRISQUE */
export function readGgdFit(features: Float32Array, offset = 0): GgdFitParams {
  return { alpha: features[offset], variance: features[offset + 1] }
}

/** Читает AGGD-параметры направления из вектора признаков BRISQUE */
export function readAggdFit(features: Float32Array, offset: number): AggdFitParams {
  return {
    alpha: features[offset],
    eta: features[offset + 1],
    leftVariance: features[offset + 2],
    rightVariance: features[offset + 3]
  }
}

/**
 * Пиксели-«заглушки» на границах карты попарных произведений (PairwiseEngine пишет 0).
 * Используется только для визуального затемнения на картах, не для статистики.
 */
export function isPairwiseBorderPixel(
  idx: number,
  width: number,
  height: number,
  direction: PairwiseDirection
): boolean {
  const x = idx % width
  const y = Math.floor(idx / width)

  switch (direction) {
    case 'horizontal':
      return x >= width - 1
    case 'vertical':
      return y >= height - 1
    case 'diagonal1':
      return x >= width - 1 || y >= height - 1
    case 'diagonal2':
      return x === 0 || y >= height - 1
  }
}

/** Ответ от BRISQUE воркера успешный */
export interface BrisqueWorkerSuccess {
  success: true
  requestId: number
  mu: Float32Array
  sigma: Float32Array
  mscn: Float32Array
  pairwise: PairwiseMaps
  features36: Float32Array
  finalScore: number
  width: number
  height: number
}

/** Ответ от BRISQUE воркера при ошибке */
export interface BrisqueWorkerError {
  success: false
  requestId: number
  error: string
}

/** Союз возможных ответов от воркера */
export type BrisqueWorkerResponse = BrisqueWorkerSuccess | BrisqueWorkerError

/** Тип ключа для табуляции (помощь + функции) */
export type HelpTabKey = 'tab-maps' | 'tab-charts' | 'tab-features' | 'empty'
