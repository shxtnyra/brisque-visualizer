/**
 * PDF GGD/AGGD только для отрисовки кривых на гистограммах (без core/brisque).
 */

function calculateGamma(x: number): number {
  const p = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ]
  if (x < 0.5) {
    return Math.PI / (Math.sin(Math.PI * x) * calculateGamma(1 - x))
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

function ggdBeta(alpha: number, variance: number): number {
  const g1 = calculateGamma(1 / alpha)
  const g3 = calculateGamma(3 / alpha)
  return Math.sqrt((variance * g1) / g3)
}

function aggdBetas(
  alpha: number,
  leftVariance: number,
  rightVariance: number
): { betaL: number; betaR: number } {
  const g1 = calculateGamma(1 / alpha)
  const g3 = calculateGamma(3 / alpha)
  return {
    betaL: Math.sqrt((leftVariance * g1) / g3),
    betaR: Math.sqrt((rightVariance * g1) / g3)
  }
}

export function ggdPdf(x: number, alpha: number, variance: number): number {
  const beta = ggdBeta(alpha, variance)
  if (beta <= 0) return 0
  const g1 = calculateGamma(1 / alpha)
  const coef = alpha / (2 * beta * g1)
  return coef * Math.exp(-Math.pow(Math.abs(x) / beta, alpha))
}

export function aggdPdf(
  x: number,
  alpha: number,
  leftVariance: number,
  rightVariance: number,
  eta: number
): number {
  const g1 = calculateGamma(1 / alpha)
  const { betaL, betaR } = aggdBetas(alpha, leftVariance, rightVariance)
  if (betaL <= 0 || betaR <= 0) return 0

  if (x < eta) {
    const coefL = alpha / (2 * betaL * g1)
    return coefL * Math.exp(-Math.pow((eta - x) / betaL, alpha))
  }
  const coefR = alpha / (2 * betaR * g1)
  return coefR * Math.exp(-Math.pow((x - eta) / betaR, alpha))
}
