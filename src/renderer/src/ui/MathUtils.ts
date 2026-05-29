import katex from 'katex'

/**
 * Рендерит формулу LaTeX в HTML с помощью KaTeX.
 * @param expression LaTeX-выражение.
 * @returns HTML-строка с отрисованной формулой.
 */
export function renderLatex(expression: string): string {
  return katex.renderToString(expression, {
    displayMode: true,
    throwOnError: false
  })
}
