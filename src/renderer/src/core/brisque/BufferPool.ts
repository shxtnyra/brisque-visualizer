/**
 * Простой пул буферов для повторного использования Float32Array и уменьшения
 * количества аллокаций при обработке изображений.
 */
export class BufferPool {
  private buffers = new Map<string, Float32Array>()

  /**
   * Возвращает существующий буфер по `id` или выделяет новый требуемого размера.
   * Если текущий буфер меньше требуемого размера, он перевыделяется.
   * @param id Идентификатор буфера.
   * @param size Требуемый минимальный размер.
   * @returns {Float32Array} Буфер запрошенного размера.
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
   * Очищает пул, удаляя все ссылки на выделенные буферы.
   */
  public clear(): void {
    this.buffers.clear()
  }
}
