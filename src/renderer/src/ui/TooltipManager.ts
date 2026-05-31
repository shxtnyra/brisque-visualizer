import { renderLatex } from './MathUtils'

interface HintData {
  text: string
  math?: string // Опциональная формула
}

/**
 * Простая система подсказок: отображает текст и LaTeX-формулы в плавающем тултипе.
 */
export class TooltipManager {
  private tooltipEl: HTMLDivElement

  private hints: Record<string, HintData> = {
    // Подсказки для карт
    'hint-mu': {
      text: 'Карта локального среднего. Описывает базовую освещенность изображения, полученную путем гауссова размытия (окно 7x7).',
      math: '\\mu(x,y) = \\sum_{i=-K}^{K} \\sum_{j=-L}^{L} w_{i,j} I(x+i, y+j)'
    },
    'hint-sigma': {
      text: 'Карта локальной дисперсии. Выделяет высокочастотные детали: резкие переходы, контуры объектов и шум.',
      math: '\\sigma(x,y) = \\sqrt{\\sum_{i,j} w_{i,j} (I(x+i, y+j) - \\mu(x,y))^2}'
    },
    'hint-mscn': {
      text: 'Нормализованные коэффициенты MSCN. Устраняют локальные зависимости пикселей. На качественном фото распределены в виде колокола.',
      math: '\\hat{I}(x,y) = \\frac{I(x,y) - \\mu(x,y)}{\\sigma(x,y) + 1}'
    },

    // Подсказки для признаков (можно добавлять нужные атрибуты data-hint в HTML таблицы)
    'hint-feat-shape': {
      text: 'Параметр формы (α) распределения. Показывает "остроту" графика. Чем сильнее размытие, тем острее пик (α уменьшается).'
    },
    'hint-feat-variance': {
      text: 'Дисперсия (σ²). Характеризует ширину распределения (разброс значений). Белый шум сильно увеличивает этот параметр.'
    },
    'hint-feat-h': {
      text: 'Попарные произведения по горизонтали. Позволяют моделировать корреляцию соседних пикселей вдоль оси X.',
      math: 'H(x,y) = \\hat{I}(x,y) \\cdot \\hat{I}(x+1, y)'
    },
    'hint-pairwise-h': {
      text: 'Карта горизонтальных попарных произведений MSCN. Светлые/тёмные участки показывают локальную корреляцию соседей по оси X.',
      math: 'H(x,y) = \\hat{I}(x,y) \\cdot \\hat{I}(x+1, y)'
    },
    'hint-pairwise-v': {
      text: 'Карта вертикальных попарных произведений MSCN. Отражает корреляцию соседних пикселей по оси Y.',
      math: 'V(x,y) = \\hat{I}(x,y) \\cdot \\hat{I}(x, y+1)'
    },
    'hint-pairwise-d1': {
      text: 'Карта попарных произведений по главной диагонали (↘).',
      math: 'D_1(x,y) = \\hat{I}(x,y) \\cdot \\hat{I}(x+1, y+1)'
    },
    'hint-pairwise-d2': {
      text: 'Карта попарных произведений по побочной диагонали (↙).',
      math: 'D_2(x,y) = \\hat{I}(x,y) \\cdot \\hat{I}(x+1, y-1)'
    }
  }

  constructor() {
    this.tooltipEl = document.createElement('div')
    this.tooltipEl.className = 'custom-tooltip'
    document.body.appendChild(this.tooltipEl)
    this.initListeners()
  }

  /** Инициализирует глобальные слушатели для показа/перемещения/скрытия тултипов. */
  private initListeners(): void {
    document.addEventListener('mouseover', e => {
      const target = e.target as HTMLElement
      const hintKey = target.closest('[data-hint]')?.getAttribute('data-hint')

      if (hintKey && this.hints[hintKey]) {
        const hint = this.hints[hintKey]

        // Формируем HTML: текст + (если есть) формула
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
