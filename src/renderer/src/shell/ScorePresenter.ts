import { AnalysisScore } from './types'



/**
 * Отображение итоговой оценки качества в шапке сайдбара.
 *
 * В index.html задан статический блок #brisque-score-container (id исторический;
 * подходит для любого метода). AppController передаёт три узла из renderer.ts.
 *
 * Не участвует во вкладках TabHost: один числовой результат над preview и табами.
 * Текст метки (BRISQUE, NIQE, …) приходит из AnalysisResult.score.label метода.
 */
export class ScorePresenter {

  /**
   * @param container Обёртка #brisque-score-container — show/hide через display.
   * @param valueEl #brisque-score-val — число и CSS-класс цвета (good/medium/bad).
   * @param labelEl #brisque-score-label — префикс «Метод: » или null, если не нужен.
   */
  constructor(
    private container: HTMLElement,
    private valueEl: HTMLElement,
    private labelEl: HTMLElement | null = null
  ) {}

  /**
   * Скрывает блок оценки и сбрасывает оформление.
   * Вызывается при: пустом crop, ошибке worker, смене метода, до нового анализа.
   */
  hide(): void {
    this.container.style.display = 'none'
    this.valueEl.textContent = ''
    this.valueEl.classList.remove('score-good', 'score-medium', 'score-bad')
  }

  /**
   * Показывает оценку после успешного parseWorkerMessage в AppController.
   *
   * @param score label — имя метрики; value — число для toFixed(2) и порогов цвета.
   */
  show(score: AnalysisScore): void {
    this.container.style.display = 'block'

    if (this.labelEl) {
      this.labelEl.textContent = `${score.label}: `
    }

    this.valueEl.textContent = score.value.toFixed(2)
    this.valueEl.classList.remove('score-good', 'score-medium', 'score-bad')

    // Пораги почти всегда одинковые для DMOS, поэтому нет необходимости в плагине
    if (score.value < 30) {
      this.valueEl.classList.add('score-good')
    } else if (score.value < 60) {
      this.valueEl.classList.add('score-medium')
    } else {
      this.valueEl.classList.add('score-bad')
    }
  }
}
