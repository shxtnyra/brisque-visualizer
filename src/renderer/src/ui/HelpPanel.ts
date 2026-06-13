import { renderLatex } from './MathUtils'
import { HelpContextKey } from '../shell/types'

export interface HelpTopic {
  title: string
  description: string
  formula?: string
  interpretation?: string
}

/**
 * Оболочка блока теории: рендер по ключу, тексты регистрируют методы.
 */
export class HelpPanel {
  private topics: Record<string, HelpTopic> = {}
  private container: HTMLDivElement

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLDivElement
  }

  registerTopics(topics: Record<string, HelpTopic>): void {
    this.topics = { ...this.topics, ...topics }
  }

  updateContext(tabId: HelpContextKey): void {
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
