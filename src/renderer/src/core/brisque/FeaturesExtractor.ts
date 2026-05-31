/**
 * Утилита для извлечения статистических признаков из карт MSCN и попарных
 * произведений: содержит методы подгонки GGD/AGGD и вспомогательные функции.
 */
export class FeaturesExtractor {
  // Статическая таблица поиска (Lookup Table) для соответствия alpha -> theoreticalRho
  private static ggdTable: { alpha: number; rho: number }[] = []

  constructor() {
    // Инициализируем таблицу один раз при создании экземпляра
    if (FeaturesExtractor.ggdTable.length === 0) {
      FeaturesExtractor.initGgdTable()
    }
  }

  /**
   * Инициализация таблицы соответствия alpha -> theoreticalRho для быстрого поиска.
   * Использует шаг 0.001 для компромисса между точностью и временем инициализации.
   */
  private static initGgdTable(): void {
    for (let a = 0.2; a <= 10.0; a += 0.001) {
      const g1 = FeaturesExtractor.calculateGamma(1 / a)
      const g2 = FeaturesExtractor.calculateGamma(2 / a)
      const g3 = FeaturesExtractor.calculateGamma(3 / a)
      // Возвращаем оригинальную "перевернутую" формулу из MATLAB BRISQUE
      const theoreticalRho = (g2 * g2) / (g1 * g3)
      FeaturesExtractor.ggdTable.push({ alpha: a, rho: theoreticalRho })
    }
  }

  /**
   * Вычисляет гамма-функцию Γ(x) с помощью аппроксимации Ланцоша.
   * @param x Аргумент функции гамма.
   * @returns Значение Γ(x).
   */
  private static calculateGamma(x: number): number {
    const p = [
      676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
      12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
    ]
    if (x < 0.5) {
      return Math.PI / (Math.sin(Math.PI * x) * this.calculateGamma(1 - x))
    }
    x -= 1
    const g = 7.0
    let sum = 0.99999999999980993
    for (let i = 0; i < p.length; i++) {
      sum += p[i] / (x + i + 1)
    }
    const t = x + g + 0.5
    return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * sum
  }

  /**
   * Находит ближайшее значение `alpha` в предвычисленной таблице по заданному `rho`.
   * Используется бинарный поиск по упорядоченной таблице.
   * @param targetRho Целевая величина rho для поиска соответствующего alpha.
   * @returns {number} Ближайшее значение alpha.
   */
  private findClosestAlpha(targetRho: number): number {
    const table = FeaturesExtractor.ggdTable
    let low = 0
    let high = table.length - 1
    let bestAlpha = 2.0
    let minDiff = Infinity

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const currentDiff = Math.abs(table[mid].rho - targetRho)

      if (currentDiff < minDiff) {
        minDiff = currentDiff
        bestAlpha = table[mid].alpha
      }

      // ВАЖНО: При формуле (g2*g2)/(g1*g3) значение rho ВОЗРАСТАЕТ при росте alpha.
      // Если rho в таблице больше нашего targetRho, нам нужен МЕНЬШИЙ alpha (идем влево).
      if (table[mid].rho > targetRho) {
        high = mid - 1
      } else {
        low = mid + 1
      }
    }
    return bestAlpha
  }

  /**
   * Масштабный параметр β GGD при нулевом среднем и дисперсии σ².
   * σ² = β² · Γ(3/α) / Γ(1/α)
   */
  public static ggdBeta(alpha: number, variance: number): number {
    const g1 = FeaturesExtractor.calculateGamma(1 / alpha)
    const g3 = FeaturesExtractor.calculateGamma(3 / alpha)
    return Math.sqrt((variance * g1) / g3)
  }

  /**
   * Масштабные параметры β_L и β_R AGGD по дисперсиям левого/правого хвостов.
   * Согласовано с формулами (13)–(15) Mittal et al.
   */
  public static aggdBetas(
    alpha: number,
    leftVariance: number,
    rightVariance: number
  ): { betaL: number; betaR: number } {
    const g1 = FeaturesExtractor.calculateGamma(1 / alpha)
    const g3 = FeaturesExtractor.calculateGamma(3 / alpha)
    return {
      betaL: Math.sqrt((leftVariance * g1) / g3),
      betaR: Math.sqrt((rightVariance * g1) / g3)
    }
  }

  /**
   * PDF zero-mean GGD из BRISQUE: f(x) = α / (2β Γ(1/α)) · exp(-(|x|/β)^α)
   * Используется для визуализации гистограммы MSCN.
   */
  public static ggdPdf(x: number, alpha: number, variance: number): number {
    const beta = FeaturesExtractor.ggdBeta(alpha, variance)
    if (beta <= 0) return 0
    const g1 = FeaturesExtractor.calculateGamma(1 / alpha)
    const coef = alpha / (2 * beta * g1)
    return coef * Math.exp(-Math.pow(Math.abs(x) / beta, alpha))
  }

  /**
   * PDF AGGD для попарных произведений: две ветви GGD, сшитые в точке η.
   * Используется для наложения кривой на гистограмму (визуализация).
   */
  public static aggdPdf(
    x: number,
    alpha: number,
    leftVariance: number,
    rightVariance: number,
    eta: number
  ): number {
    const g1 = FeaturesExtractor.calculateGamma(1 / alpha)
    const { betaL, betaR } = FeaturesExtractor.aggdBetas(alpha, leftVariance, rightVariance)
    if (betaL <= 0 || betaR <= 0) return 0

    if (x < eta) {
      const coefL = alpha / (2 * betaL * g1)
      return coefL * Math.exp(-Math.pow((eta - x) / betaL, alpha))
    }
    const coefR = alpha / (2 * betaR * g1)
    return coefR * Math.exp(-Math.pow((x - eta) / betaR, alpha))
  }

  /**
   * Подгоняет параметры GGD по входному массиву значений (предполагается
   * нулевое математическое ожидание для MSCN). Возвращает параметр alpha и дисперсию.
   * @param arr Входной массив значений (MSCN map).
   * @returns {[number, number]} Массив [alpha, variance].
   */
  public fitGgd(arr: Float32Array): [number, number] {
    const len = arr.length
    if (len === 0) return [2.0, 1.0]

    let variance = 0
    let meanAbsolute = 0

    // Считаем моменты исходя из предположения, что Mean строго равен 0 (согласно статье для MSCN)
    for (let i = 0; i < len; i++) {
      const val = arr[i]
      variance += val * val
      meanAbsolute += Math.abs(val)
    }
    variance /= len
    meanAbsolute /= len

    const rhat = (meanAbsolute * meanAbsolute) / (variance + 1e-8)
    // Так как таблица построена по формуле AGGD, а для GGD нужна перевернутая,
    // мы можем просто передать rhat напрямую в поиск (ведь в GGD rho_matlab = 1 / rhat)
    const alpha = this.findClosestAlpha(rhat)

    return [alpha, variance]
  }

  /**
   * Подгоняет параметры AGGD по входному массиву. Возвращает alpha, левую и правую дисперсии
   * и теоретическое математическое ожидание асимметрии (eta).
   * @param arr Входной массив значений (попарные произведения).
   * @returns {[number, number, number, number]} [alpha, leftVariance, rightVariance, eta].
   */
  public fitAggd(arr: Float32Array): [number, number, number, number] {
    const len = arr.length
    if (len === 0) return [2.0, 1.0, 1.0, 0.0]

    let leftCount = 0
    let rightCount = 0
    let leftSumSq = 0
    let rightSumSq = 0
    let absSum = 0
    let totalSumSq = 0

    for (let i = 0; i < len; i++) {
      const val = arr[i]
      const abs = Math.abs(val)
      totalSumSq += val * val // Нам нужна общая дисперсия для rhat
      absSum += abs
      if (val < 0) {
        leftCount++
        leftSumSq += val * val
      } else {
        rightCount++
        rightSumSq += val * val
      }
    }

    const meanAbsolute = absSum / len
    const meanSq = totalSumSq / len
    const leftVariance = leftCount > 0 ? leftSumSq / leftCount : 0
    const rightVariance = rightCount > 0 ? rightSumSq / rightCount : 0

    const sigL = Math.sqrt(leftVariance)
    const sigR = Math.sqrt(rightVariance)

    if (sigL + sigR === 0) return [2.0, 0.0, 0.0, 0.0]

    // Эмпирический rho по всему массиву (как в MATLAB)
    const rhat = (meanAbsolute * meanAbsolute) / (meanSq + 1e-8)

    // Точная алгебраическая копия множителя асимметрии из оригинального кода Миттала:
    // MATLAB: (gammahat^3 + 1)*(gammahat + 1) / ((gammahat^2 + 1)^2)
    const R_matlab =
      ((Math.pow(sigL, 3) + Math.pow(sigR, 3)) * (sigL + sigR)) /
      (Math.pow(sigL * sigL + sigR * sigR, 2) + 1e-8)

    const rho = rhat * R_matlab
    const alpha = this.findClosestAlpha(rho)

    // Расчет теоретического математического ожидания (сдвига асимметрии eta) по формулам (13)-(15)
    const g1 = FeaturesExtractor.calculateGamma(1 / alpha)
    const g2 = FeaturesExtractor.calculateGamma(2 / alpha)
    const g3 = FeaturesExtractor.calculateGamma(3 / alpha)

    const betaL = sigL * Math.sqrt(g1 / g3)
    const betaR = sigR * Math.sqrt(g1 / g3)
    const eta = (betaR - betaL) * (g2 / g1) // Формула (15) из статьи

    return [alpha, leftVariance, rightVariance, eta]
  }
}
