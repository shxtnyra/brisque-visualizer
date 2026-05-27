import { BrisquePipeline } from './BrisquePipeline'

const pipeline = new BrisquePipeline()

self.onmessage = (e: MessageEvent) => {
  const { rgbaArray, width, height } = e.data

  try {
    // Выполняем тяжелую математику в фоновом потоке
    const result = pipeline.execute(rgbaArray, width, height)

    // Извлекаем типизированные массивы
    const mu = result.scale1Mscn.mu
    const sigma = result.scale1Mscn.sigma
    const mscn = result.scale1Mscn.mscn
    const features36 = result.features36
    const finalScore = result.finalScore

    // Передаем данные обратно в Main-поток.
    // Вторым аргументом указываем список буферов для депортации (Transferable),
    // чтобы избежать тяжелого копирования памяти.
    self.postMessage(
      {
        success: true,
        mu,
        sigma,
        mscn,
        features36,
        finalScore,
        width,
        height
      },
      [mu.buffer, sigma.buffer, mscn.buffer, features36.buffer]
    )
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message })
  }
}
