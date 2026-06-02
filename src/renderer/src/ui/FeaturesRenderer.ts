interface FeatureRow {
  label: string
  values: Array<number | null>
  highlight?: boolean
}

const ROWS: FeatureRow[] = [
  { label: 'MSCN', values: [0, 1, null, null], highlight: true },
  { label: 'Горизонталь', values: [2, 3, 4, 5] },
  { label: 'Вертикаль', values: [6, 7, 8, 9] },
  { label: 'Диагональ 1', values: [10, 11, 12, 13] },
  { label: 'Диагональ 2', values: [14, 15, 16, 17] }
]

/**
 * Отвечает за визуализацию табличного представления 36 признаков BRISQUE.
 * Формирует HTML-таблицы с разделением по масштабам и направлениям попарных произведений.
 */
export class FeaturesRenderer {
  private container: HTMLElement

  constructor(container: string | HTMLElement) {
    const element =
      typeof container === 'string' ? document.getElementById(container) : container
    if (!element) {
      const hint = typeof container === 'string' ? `#${container}` : '<element>'
      throw new Error(`Container ${hint} not found`)
    }
    this.container = element
  }

  /**
   * Рендерит HTML таблицы признаков для двух масштабов (0 и 18 смещений).
   * @param features 36-мерный вектор признаков.
   */
  public render(features: Float32Array): void {
    if (features.length !== 36) return

    this.container.innerHTML = `
      <div class="features-wrapper">
        ${this.buildScaleTable('Масштаб 1 (100%)', features, 0)}
        ${this.buildScaleTable('Масштаб 2 (50%)', features, 18)}
      </div>
    `
  }

  private buildScaleTable(title: string, features: Float32Array, offset: number): string {
    return `
      <div class="scale-section">
        <h4 class="scale-title">${title}</h4>
        <table class="features-table">
          <thead>
            <tr>
              <th>Направление</th>
              <th title="Форма холма">&alpha;</th>
              <th title="Левая дисперсия / Общая">&sigma;&sup2;_L / &sigma;&sup2;</th>
              <th title="Правая дисперсия">&sigma;&sup2;_R</th>
              <th title="Сдвиг асимметрии">&eta; (Eta)</th>
            </tr>
          </thead>
          <tbody>
            ${ROWS.map(row => this.buildTableRow(row, features, offset)).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  private buildTableRow(row: FeatureRow, features: Float32Array, offset: number): string {
    const formatValue = (value: number | null): string =>
      value === null ? '-' : features[offset + value].toFixed(4)

    return `
      <tr class="${row.highlight ? 'highlight-row' : ''}">
        <td>${row.label}</td>
        <td class="val">${formatValue(row.values[0])}</td>
        <td class="val">${formatValue(row.values[1])}</td>
        <td class="val ${row.values[2] === null ? 'empty' : ''}">${formatValue(row.values[2])}</td>
        <td class="val ${row.values[3] === null ? 'empty' : ''}">${formatValue(row.values[3])}</td>
      </tr>
    `
  }
}
