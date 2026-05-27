export class BufferPool {
  private buffers = new Map<string, Float32Array>()

  /**
   * Возвращает существующий или выделяет новый одномерный буфер Float32Array.
   * Если запрошенный размер меньше или равен текущему аллоцированному, память не перевыделяется.
   */
  public getBuffer(id: string, size: number): Float32Array {
    let buf = this.buffers.get(id)
    if (!buf || buf.length < size) {
      buf = new Float32Array(size)
      this.buffers.set(id, buf)
    }
    return buf
  }

  /**
   * Освобождает все ссылки на выделенные массивы для очистки оперативной памяти.
   */
  public clear(): void {
    this.buffers.clear()
  }
}
