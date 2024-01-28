import { app, BrowserWindow, shell, ipcMain, Menu, globalShortcut, Tray } from 'electron'
import { el } from 'element-plus/es/locale'
import { release } from 'node:os'
import { join } from 'node:path'

Menu.setApplicationMenu(null)

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null
// Here, you can also use other preload
const preload = join(__dirname, '../preload/index.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')
let isDevToolsOpen = false
let tray = null

async function createWindow() {
  win = new BrowserWindow({
    title: '',
    minWidth: 220,
    minHeight: 100,
    icon: join(process.env.PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // Access-Control-Allow-Origin
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) { // electron-vite-vue#298
    win.loadURL(url)
    // Open devTool if the app is not packaged
    // win.webContents.openDevTools({ mode: 'bottom' })
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344

  win.on('close', (e) => {
    // 阻止默认关闭行为，点击托盘栏就能恢复
    e.preventDefault()
    win.hide()
    win.setSkipTaskbar(true)
  })
}

app.whenReady()
  .then(async () => {
    await createWindow()
    initTray()
    globalShortcut.register('ctrl+f12', ctrlF12Shortcut)
  })

app.on('will-quit', function () {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

ipcMain.on("set-proxy", function (event, { proxy, enable }) {
  if (enable) {
    win.webContents.session.setProxy({ proxyRules: proxy })
  } else {
    win.webContents.session.setProxy({ proxyRules: null })
  }
})

ipcMain.on("set-always-top", function (event, alwaysOnTop: boolean) {
  win?.setAlwaysOnTop(alwaysOnTop)
})

ipcMain.on("toggle-devtools", function (event, open: boolean) {
  if (open) {
    win?.webContents.openDevTools({ mode: 'bottom' })
  } else {
    win?.webContents.closeDevTools()
  }
  isDevToolsOpen = open
})

function ctrlF12Shortcut() {
  win.restore()
  win.focus()
  if (isDevToolsOpen) {
    win?.webContents.closeDevTools()
  } else {
    win?.webContents.openDevTools({ mode: 'bottom' })
  }
  isDevToolsOpen = !isDevToolsOpen
}

function initTray() {
  tray = new Tray(join(process.env.PUBLIC, 'favicon.ico'))
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '退出', click: function () {
        win.destroy()
        win = null
        app.quit()
      }
    }
  ])
  tray.setToolTip('Coin Panel')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    win.show()
    win.setSkipTaskbar(false)
  })
}



