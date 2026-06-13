import { renderLatex } from './MathUtils'

export interface TooltipHint {
  text: string
  math?: string
}

/**
 * Глобальные подсказки по data-hint; тексты регистрируют методы.
 */
export class TooltipManager {
  private tooltipEl: HTMLDivElement
  private hints: Record<string, TooltipHint> = {}

  constructor() {
    this.tooltipEl = document.createElement('div')
    this.tooltipEl.className = 'custom-tooltip'
    document.body.appendChild(this.tooltipEl)
    this.initListeners()
  }

  registerHints(hints: Record<string, TooltipHint>): void {
    this.hints = { ...this.hints, ...hints }
  }

  private initListeners(): void {
    document.addEventListener('mouseover', e => {
      const target = e.target as HTMLElement
      const hintKey = target.closest('[data-hint]')?.getAttribute('data-hint')

      if (hintKey && this.hints[hintKey]) {
        const hint = this.hints[hintKey]
        let htmlContent = `<div>${hint.text}</div>`
        if (hint.math) {
          htmlContent += renderLatex(hint.math)
        }
        this.tooltipEl.innerHTML = htmlContent
        this.tooltipEl.style.opacity = '1'
        this.tooltipEl.style.visibility = 'visible'
      }
    })

    document.addEventListener('mousemove', e => {
      if (this.tooltipEl.style.opacity === '1') {
        let x = e.pageX + 15
        let y = e.pageY + 15
        const tooltipRect = this.tooltipEl.getBoundingClientRect()

        if (x + tooltipRect.width > window.innerWidth) {
          x = e.pageX - tooltipRect.width - 15
        }
        if (y + tooltipRect.height > window.innerHeight) {
          y = e.pageY - tooltipRect.height - 15
        }

        this.tooltipEl.style.left = `${x}px`
        this.tooltipEl.style.top = `${y}px`
      }
    })

    document.addEventListener('mouseout', e => {
      const target = e.target as HTMLElement
      if (target.closest('[data-hint]')) {
        this.tooltipEl.style.opacity = '0'
        this.tooltipEl.style.visibility = 'hidden'
      }
    })
  }
}
