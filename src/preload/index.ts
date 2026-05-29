import { contextBridge, ipcRenderer } from 'electron'
import { ElectronAPI, electronAPI } from '@electron-toolkit/preload'

/**
 * Предоставляет ограниченный набор API из основного процесса в контекст рендера.
 * Описание: если включена изоляция контекста, экспортируем безопасные объекты
 * через `contextBridge`, иначе добавляем в глобальный объект окна.
 */
// Custom APIs for renderer
const api = {
  /**
   * Открывает диалог выбора файла в основном процессе и возвращает путь.
   * @returns {Promise<string[] | undefined>} Массив путей или `undefined`.
   */
  openFile: () => ipcRenderer.invoke('dialog:openFile')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// attach to the DOM global with explicit cast to avoid ts-ignore.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  const globalWindow = window as unknown as {
    electron: ElectronAPI
    api: typeof api
  }
  globalWindow.electron = electronAPI
  globalWindow.api = api
}
