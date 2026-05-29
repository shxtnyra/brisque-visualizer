/**
 * Общие типы для приложения BRISQUE Visualizer
 */

/** Размеры и координаты выделения на холсте */
export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

/** Входные данные для BRISQUE воркера */
export interface WorkerInput {
  rgbaArray: Uint8ClampedArray
  width: number
  height: number
  requestId: number
}

/** Ответ от BRISQUE воркера успешный */
export interface BrisqueWorkerSuccess {
  success: true
  requestId: number
  mu: Float32Array
  sigma: Float32Array
  mscn: Float32Array
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
