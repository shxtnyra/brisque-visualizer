export class FeaturesRenderer {
  private container: HTMLElement

  constructor(containerId: string) {
    const el = document.getElementById(containerId)
    if (!el) throw new Error(`Container #${containerId} not found`)
    this.container = el
  }

  public render(features: Float32Array): void {
    if (features.length !== 36) return

    // Очищаем плейсхолдер и вставляем две таблицы
    this.container.innerHTML = `
      <div class="features-wrapper">
        ${this.buildScaleTable('Масштаб 1 (100%)', features, 0)}
        ${this.buildScaleTable('Масштаб 2 (50%)', features, 18)}
      </div>
    `
  }

  private buildScaleTable(title: string, f: Float32Array, offset: number): string {
    // Форматируем числа до 4 знаков после запятой для красоты
    const fmt = (val: number) => val.toFixed(4)

    return `
      <div class="scale-section">
        <h4 class="scale-title">${title}</h4>
        <table class="features-table">
          <thead>
            <tr>
              <th>Направление</th>
              <th title="Форма холма">&alpha; (Alpha)</th>
              <th title="Левая дисперсия / Общая">&sigma;&sup2;_L / &sigma;&sup2;</th>
              <th title="Правая дисперсия">&sigma;&sup2;_R</th>
              <th title="Сдвиг асимметрии">&eta; (Eta)</th>
            </tr>
          </thead>
          <tbody>
            <tr class="highlight-row">
              <td>MSCN</td>
              <td class="val">${fmt(f[offset + 0])}</td>
              <td class="val">${fmt(f[offset + 1])}</td>
              <td class="val empty">-</td>
              <td class="val empty">-</td>
            </tr>
            <tr>
              <td>Горизонталь</td>
              <td class="val">${fmt(f[offset + 2])}</td>
              <td class="val">${fmt(f[offset + 3])}</td>
              <td class="val">${fmt(f[offset + 4])}</td>
              <td class="val">${fmt(f[offset + 5])}</td>
            </tr>
            <tr>
              <td>Вертикаль</td>
              <td class="val">${fmt(f[offset + 6])}</td>
              <td class="val">${fmt(f[offset + 7])}</td>
              <td class="val">${fmt(f[offset + 8])}</td>
              <td class="val">${fmt(f[offset + 9])}</td>
            </tr>
            <tr>
              <td>Диагональ 1</td>
              <td class="val">${fmt(f[offset + 10])}</td>
              <td class="val">${fmt(f[offset + 11])}</td>
              <td class="val">${fmt(f[offset + 12])}</td>
              <td class="val">${fmt(f[offset + 13])}</td>
            </tr>
            <tr>
              <td>Диагональ 2</td>
              <td class="val">${fmt(f[offset + 14])}</td>
              <td class="val">${fmt(f[offset + 15])}</td>
              <td class="val">${fmt(f[offset + 16])}</td>
              <td class="val">${fmt(f[offset + 17])}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `
  }
}
