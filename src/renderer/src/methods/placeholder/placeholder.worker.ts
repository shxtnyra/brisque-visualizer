/**
 * Заглушка воркера для демонстрации смены метода (без вычислений).
 */
export {}

self.onmessage = (e: MessageEvent<{ requestId: number; width: number; height: number }>) => {
  const { requestId, width, height } = e.data
  self.postMessage({
    success: true,
    requestId,
    width,
    height
  })
}
