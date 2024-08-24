import { app, BrowserWindow, shell, ipcMain, Menu, globalShortcut, Tray } from 'electron'
import { release } from 'node:os'
import { join } from 'node:path'

Menu.setApplicationMenu(null)

process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

if (release().startsWith('6.1')) app.disableHardwareAcceleration()

if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let tray = null
let isDevToolsOpen = false
let win: BrowserWindow | null = null
const url = process.env.VITE_DEV_SERVER_URL
const preload = join(__dirname, '../preload/index.js')
const indexHtml = join(process.env.DIST, 'index.html')
const webPreferences = { preload, webSecurity: false, nodeIntegration: true, contextIsolation: false, }

async function createWindow() {
  win = new BrowserWindow({
    title: '',
    minWidth: 220,
    minHeight: 100,
    icon: join(process.env.PUBLIC, 'favicon.ico'),
    webPreferences,
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(url)
  } else {
    win.loadFile(indexHtml)
  }

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  win.on('close', (e) => {
    // win.destroy()
    // win = null
    // app.quit()

    e.preventDefault()
    win.hide()
    win.setSkipTaskbar(true)
  })
}

app.whenReady()
  .then(async () => {
    await createWindow()
    initTray()
    globalShortcut.register('ctrl+f12', openDevtools)
  })

app.on('will-quit', function () {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.focus()
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences,
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

function openDevtools() {
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



