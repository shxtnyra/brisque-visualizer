import { ElectronAPI } from '@electron-toolkit/preload'

/** Типы, которые добавляются в глобальный объект `window` через preload-скрипт. */
declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFile: () => Promise<string | null>
    }
  }
}
