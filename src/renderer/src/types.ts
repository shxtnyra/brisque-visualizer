/**
 * Общие типы оболочки приложения (не привязаны к конкретному методу).
 */

/** Размеры и координаты выделения на холсте */
export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

/** Вход воркера: RGBA crop + id запроса */
export interface WorkerInput {
  rgbaArray: Uint8ClampedArray
  width: number
  height: number
  requestId: number
}
