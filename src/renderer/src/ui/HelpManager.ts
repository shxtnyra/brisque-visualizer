import { renderLatex } from './MathUtils'
import { HelpTabKey } from '../types'

interface HelpTopic {
  title: string
  description: string
  formula?: string
  interpretation?: string
}

/**
 * Менеджер контекстной помощи и отображения теории/формул по вкладкам.
 */
export class HelpManager {
  private topics: Record<string, HelpTopic> = {
    'tab-maps': {
      title: 'Пространственная нормализация (MSCN)',
      description:
        'Искажения (размытие, шум) нарушают естественную статистику пикселей. Для её выделения применяется центрирование и нормирование изображения на основе локального среднего и локального стандартного отклонения.',
      formula: '\\hat{I}(x,y) = \\frac{I(x,y) - \\mu(x,y)}{\\sigma(x,y) + 1}',
      interpretation:
        'Карта $\\mu$ показывает структуру освещенности. Карта $\\sigma$ подсвечивает границы и контуры. Итоговая карта MSCN устраняет зависимости между соседними пикселями в качественных снимках.'
    },
    'tab-charts': {
      title: 'Статистический анализ коэффициентов',
      description:
        'Для неискаженных (естественных) изображений распределение коэффициентов MSCN подчиняется идеальному обобщенному распределению Гаусса (GGD). Любые искажения деформируют этот "колокол".',
      formula:
        'f(x; \\alpha, \\beta) = \\frac{\\alpha}{2\\beta\\Gamma(1/\\alpha)} \\exp\\left(-\\left(\\frac{|x|}{\\beta}\\right)^\\alpha\\right)',
      interpretation:
        'Размытие сужает график и делает его пиковым в нуле. Белый шум, наоборот, растягивает график по осям, делая его плоским.'
    },
    'tab-features': {
      title: 'Вектор признаков BRISQUE',
      description:
        'Алгоритм извлекает 36 числовых параметров. Первые 2 (shape, variance) берутся из самого распределения MSCN. Остальные 34 извлекаются из матриц попарных произведений смежных пикселей по 4 направлениям (H, V, D1, D2).',
      formula: 'H(x,y) = \\hat{I}(x,y)\\hat{I}(x+1,y)',
      interpretation:
        'Эти признаки описывают пространственную корреляцию пикселей. Полученный вектор из 36 чисел затем передается в модель SVR для получения финальной оценки качества снимка.'
    },
    empty: {
      title: 'Выделите область для анализа',
      description:
        'Чтобы начать BRISQUE-анализ, выберите область на изображении левой кнопкой мыши. Двойной клик выделяет всё изображение.',
      interpretation:
        'После выделения область будет обработана, и справа появятся карты, гистограммы и таблица признаков.'
    }
  }

  private container: HTMLDivElement

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLDivElement
  }

  /**
   * Динамически обновляет блок теории при переключении вкладок.
   * @param tabId Идентификатор вкладки помощи.
   */
  public updateContext(tabId: HelpTabKey): void {
    const topic = this.topics[tabId]
    if (!topic) {
      this.container.innerHTML = ''
      return
    }

    const mathHtml = topic.formula ? renderLatex(topic.formula) : ''
    const interpretationHtml = topic.interpretation
      ? `<p class="help-interpret"><strong>Что искать на экране:</strong> ${topic.interpretation}</p>`
      : ''

    this.container.innerHTML = `
      <div class="help-panel-content">
        <h4>${topic.title}</h4>
        <p class="help-desc">${topic.description}</p>
        ${topic.formula ? `<div class="help-math">${mathHtml}</div>` : ''}
        ${interpretationHtml}
      </div>
    `
  }
}
