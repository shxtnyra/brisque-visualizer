import { RegisteredMethod } from './QualityMethod'



/**
 * Реестр методов оценки качества (воркер + фабрика UI).
 *
 * Заполняется в createMethodRegistry (methods/registerMethods.ts): BRISQUE, placeholder и т.д.
 * AppController хранит один экземпляр; MethodSelector строит список из list(),
 * MethodSwitcher читает getActive / setActive при mount и смене метода.
 *
 * activeId — какой RegisteredMethod сейчас «выбран»; первый register задаёт activeId,
 * если он ещё null; явный setActive('brisque') — в createMethodRegistry.
 */
export class MethodRegistry {
  private readonly entries = new Map<string, RegisteredMethod>()
  /** id текущего метода */
  private activeId: string | null = null

  /**
   * Добавляет метод в реестр. Первый зарегистрированный становится activeId,
   * если активный ещё не задан.
   *
   * @param entry method + createUi из registerMethods.
  */
  register(entry: RegisteredMethod): void {
    this.entries.set(entry.method.id, entry)
    if (!this.activeId) {
      this.activeId = entry.method.id
    }
  }

  /**
   * Переключает активный метод по id (перед созданием нового UI/воркера в MethodSwitcher).
   *
   * @param id QualityMethod.id (например 'brisque', 'placeholder').
   * @throws Если id не был зарегистрирован через register.
  */
  setActive(id: string): void {
    if (!this.entries.has(id)) {
      throw new Error(`MethodRegistry: неизвестный метод "${id}"`)
    }
    this.activeId = id
  }

  /**
   * @returns id активного метода для MethodSelector и синхронизации select.
   * @throws Если реестр пуст или activeId не задан.
  */
  getActiveId(): string {
    if (!this.activeId) {
      throw new Error('MethodRegistry: нет активного метода')
    }
    return this.activeId
  }

  /**
   * @returns Запись активного метода (воркер + createUi) для MethodSwitcher.
   * @throws Если нет зарегистрированных методов или запись по activeId отсутствует.
  */
  getActive(): RegisteredMethod {
    if (!this.activeId) {
      throw new Error('MethodRegistry: нет зарегистрированных методов')
    }

    const entry = this.entries.get(this.activeId)

    if (!entry) {
      throw new Error(`MethodRegistry: метод "${this.activeId}" не найден`)
    }

    return entry
  }

  /**
   * Все зарегистрированные методы (порядок = порядок register в createMethodRegistry).
   * Используется MethodSelector для пунктов выпадающего списка.
   */
  list(): RegisteredMethod[] {
    return Array.from(this.entries.values())
  }
}
