/**
 * Отображение итоговой метрики в шапке сайдбара.
 */
export class ScorePresenter {
  constructor(
    private container: HTMLElement,
    private valueEl: HTMLElement,
    private labelEl: HTMLElement | null = null
  ) {}

  hide(): void {
    this.container.style.display = 'none'
    this.valueEl.textContent = ''
    this.valueEl.classList.remove('score-good', 'score-medium', 'score-bad')
  }

  show(score: { label: string; value: number }): void {
    this.container.style.display = 'block'
    if (this.labelEl) {
      this.labelEl.textContent = `${score.label}: `
    }
    this.valueEl.textContent = score.value.toFixed(2)
    this.valueEl.classList.remove('score-good', 'score-medium', 'score-bad')
    if (score.value < 30) {
      this.valueEl.classList.add('score-good')
    } else if (score.value < 60) {
      this.valueEl.classList.add('score-medium')
    } else {
      this.valueEl.classList.add('score-bad')
    }
  }
}
