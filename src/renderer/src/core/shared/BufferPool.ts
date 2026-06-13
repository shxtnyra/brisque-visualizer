/**
 * Пул буферов для повторного использования Float32Array.
 * Общий для любых пайплайнов обработки изображений (не привязан к BRISQUE).
 */
export class BufferPool {
  private buffers = new Map<string, Float32Array>()

  /**
   * Возвращает существующий буфер по `id` или выделяет новый требуемого размера.
   * Если текущий буфер меньше требуемого размера, он перевыделяется.
   */
  public getBuffer(id: string, size: number): Float32Array {
    let buf = this.buffers.get(id)
    if (!buf || buf.length < size) {
      buf = new Float32Array(size)
      this.buffers.set(id, buf)
    }
    return buf
  }

  public clear(): void {
    this.buffers.clear()
  }
}
