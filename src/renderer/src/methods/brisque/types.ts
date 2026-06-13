/**
 * Типы и метаданные UI/воркера BRISQUE (не общие для приложения).
 */

export interface PairwiseMaps {
  horizontal: Float32Array
  vertical: Float32Array
  diagonal1: Float32Array
  diagonal2: Float32Array
}

export type PairwiseDirection = 'horizontal' | 'vertical' | 'diagonal1' | 'diagonal2'

export type ChartKind = 'mscn' | PairwiseDirection

export type MapKind = 'mu' | 'sigma' | 'mscn' | PairwiseDirection

export type ChartYMode = 'pdf' | 'peak'

export interface GgdFitParams {
  alpha: number
  variance: number
}

export interface AggdFitParams {
  alpha: number
  eta: number
  leftVariance: number
  rightVariance: number
}

export interface MapViewMeta {
  title: string
  hint: string
}

export interface PairwiseChartMeta {
  xLabel: string
  featureOffset: number
}

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

export function readGgdFit(features: Float32Array, offset = 0): GgdFitParams {
  return { alpha: features[offset], variance: features[offset + 1] }
}

export function readAggdFit(features: Float32Array, offset: number): AggdFitParams {
  return {
    alpha: features[offset],
    eta: features[offset + 1],
    leftVariance: features[offset + 2],
    rightVariance: features[offset + 3]
  }
}

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

export interface BrisqueWorkerError {
  success: false
  requestId: number
  error: string
}
