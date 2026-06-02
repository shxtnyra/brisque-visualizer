import { RegisteredMethod } from './QualityMethod'

/**
 * Реестр методов оценки качества. Сейчас один BRISQUE; позже — переключение activeId.
 */
export class MethodRegistry {
  private readonly entries = new Map<string, RegisteredMethod>()
  private activeId: string | null = null

  register(entry: RegisteredMethod): void {
    this.entries.set(entry.method.id, entry)
    if (!this.activeId) {
      this.activeId = entry.method.id
    }
  }

  setActive(id: string): void {
    if (!this.entries.has(id)) {
      throw new Error(`MethodRegistry: неизвестный метод "${id}"`)
    }
    this.activeId = id
  }

  getActiveId(): string {
    if (!this.activeId) {
      throw new Error('MethodRegistry: нет активного метода')
    }
    return this.activeId
  }

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

  list(): RegisteredMethod[] {
    return Array.from(this.entries.values())
  }
}
