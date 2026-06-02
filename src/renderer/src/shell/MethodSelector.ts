import { MethodRegistry } from './MethodRegistry'

/**
 * Выпадающий список методов в toolbar (скрыт, если метод один).
 */
export class MethodSelector {
  private select: HTMLSelectElement
  private onChangeHandler: (methodId: string) => void

  constructor(
    container: HTMLElement,
    registry: MethodRegistry,
    onChange: (methodId: string) => void
  ) {
    this.onChangeHandler = onChange
    const methods = registry.list()

    const label = document.createElement('label')
    label.className = 'method-select-label'

    this.select = document.createElement('select')
    this.select.id = 'method-select'
    this.select.className = 'method-select'

    methods.forEach(({ method }) => {
      const opt = document.createElement('option')
      opt.value = method.id
      opt.textContent = method.displayName
      this.select.appendChild(opt)
    })

    this.select.value = registry.getActiveId()
    this.select.addEventListener('change', () => {
      this.onChangeHandler(this.select.value)
    })

    label.append('Метод: ')
    label.appendChild(this.select)
    container.appendChild(label)

    container.style.display = methods.length > 1 ? 'flex' : 'none'
  }

  syncValue(methodId: string): void {
    this.select.value = methodId
  }
}
