import { app, shell, BrowserWindow, ipcMain, protocol, net, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { pathToFileURL } from 'url'

/**
 * Основной процесс Electron: создаёт окно, регистрирует схему `media://`
 * и обрабатывает IPC-запросы от renderer (например, диалог открытия файла).
 */

// Регистрируем пользовательскую privileged-схему `media://` для безопасного доступа
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true }
  }
])

/**
 * Создаёт основное окно приложения и загружает URL для dev/prod.
 */
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 1000,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Подготавливаем окружение и регистрируем обработчики протокола и IPC
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  protocol.handle('media', async request => {
    let pathString = decodeURIComponent(new URL(request.url).pathname)

    if (process.platform === 'win32') {
      // /C:/Users/... → C:/Users/...
      if (/^\/[a-zA-Z]:\//.test(pathString)) {
        pathString = pathString.slice(1)
      } else if (/^[a-zA-Z]\//.test(pathString)) {
        pathString = pathString[0].toUpperCase() + ':' + pathString.slice(1)
      }
    } else {
      if (pathString.startsWith('//')) {
        pathString = pathString.slice(1)
      }
      if (!pathString.startsWith('/')) {
        pathString = `/${pathString}`
      }
    }

    try {
      const fileUrl = pathToFileURL(pathString).toString()
      const response = await net.fetch(fileUrl)

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'Access-Control-Allow-Origin': '*'
        }
      })
    } catch (error) {
      console.error('Ошибка протокола media:// для пути:', pathString, error)
      return new Response('File not found', { status: 404 })
    }
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Изображения', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Завершение приложения при закрытии всех окон
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
