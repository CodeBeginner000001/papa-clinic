import path from 'node:path'
import fs from 'node:fs'
import type { BrowserWindow as BrowserWindowType } from 'electron'
import { app, BrowserWindow, dialog, ipcMain } from './electron-api'
import { initDatabase, closeDatabase } from './db/database'
import { registerIpc } from './ipc'
import { appendLog, getAppPaths, setDataRoot } from './paths'
import { defaultDataDir, loadConfig, saveConfig } from './config'

process.env.DIST = path.join(__dirname, '../dist')

let mainWin: BrowserWindowType | null = null
let splashWin: BrowserWindowType | null = null
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const APP_VERSION = app.getVersion()

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function resolveAppIcon(): string | undefined {
  // Prefer PNG at runtime — Electron nativeImage/dock.setIcon often fails on .icns
  const candidates = [
    path.join(__dirname, '../build/icon.png'),
    path.join(__dirname, '../public/icon.png'),
    path.join(process.resourcesPath ?? '', 'build/icon.png'),
    path.join(process.resourcesPath ?? '', 'icon.png'),
  ]
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate
  }
  return undefined
}

function dataUrl(html: string): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}

/* ------------------------------------------------------------------ */
/* First-run setup: ask where to store data                            */
/* ------------------------------------------------------------------ */

function setupHtml(defaultDir: string): string {
  const name = 'AK Heart & Diabetics Care Center'
  const nameHtml = name.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; }
  body { background: #f4f7f5; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .card { width: 520px; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 40px rgba(22,101,52,.12); }
  .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .logo-badge { width: 44px; height: 44px; border-radius: 12px; background: #e8f5ec; display: flex; align-items: center; justify-content: center; }
  h1 { font-size: 17px; color: #14532d; line-height: 1.3; }
  .sub { font-size: 12px; color: #6b7f72; }
  h2 { font-size: 15px; color: #1c2b22; margin-bottom: 6px; }
  p.desc { font-size: 13px; color: #5f7268; margin-bottom: 20px; line-height: 1.5; }
  .path-box { display: flex; gap: 8px; margin-bottom: 16px; }
  .path { flex: 1; border: 1.5px solid #d7e5db; border-radius: 10px; padding: 10px 12px; font-size: 12.5px; color: #1c2b22; background: #f8fbf9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button { cursor: pointer; border-radius: 10px; font-size: 13px; font-weight: 600; padding: 10px 16px; border: 1.5px solid #d7e5db; background: #fff; color: #166534; }
  button:hover { background: #f0f7f2; }
  .primary { width: 100%; background: #166534; border-color: #166534; color: #fff; padding: 12px; font-size: 14px; }
  .primary:hover { background: #14532d; }
  .note { font-size: 11.5px; color: #8aa092; margin-top: 14px; text-align: center; }
  </style></head><body>
  <div class="card">
    <div class="logo">
      <div class="logo-badge">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 3c-2 3-6 3.5-6 8a6 6 0 0 0 12 0c0-4.5-4-5-6-8z" fill="#16a34a" opacity=".25"/><path d="M11 7h2v3h3v2h-3v3h-2v-3H8v-2h3V7z" fill="#166534"/></svg>
      </div>
      <div>
        <h1>${nameHtml}</h1>
        <div class="sub">Offline Clinic Management System</div>
      </div>
    </div>
    <h2>Choose where to store clinic data</h2>
    <p class="desc">All patient records, prescriptions, bills and backups will be saved in this folder on this computer. You can back it up or move it later from Settings.</p>
    <div class="path-box">
      <div class="path" id="path" title="${defaultDir}">${defaultDir}</div>
      <button id="browse">Browse&hellip;</button>
    </div>
    <button class="primary" id="confirm">Continue &amp; Start App</button>
    <div class="note">Data stays on this computer. Nothing is sent online.</div>
  </div>
  <script>
    let chosen = ${JSON.stringify(defaultDir)};
    document.getElementById('browse').addEventListener('click', async () => {
      const dir = await window.clinic.invoke('setup:browse');
      if (dir) { chosen = dir; const el = document.getElementById('path'); el.textContent = dir; el.title = dir; }
    });
    document.getElementById('confirm').addEventListener('click', () => {
      window.clinic.invoke('setup:confirm', chosen);
    });
  </script>
  </body></html>`
}

async function runFirstRunSetup(): Promise<string> {
  const suggested = defaultDataDir()
  return new Promise<string>((resolve) => {
    const win = new BrowserWindow({
      width: 620,
      height: 420,
      resizable: false,
      frame: false,
      title: 'Setup — AK Heart & Diabetics Care Center',
      backgroundColor: '#f4f7f5',
      icon: resolveAppIcon(),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    })

    ipcMain.handle('setup:browse', async () => {
      const result = await dialog.showOpenDialog(win, {
        title: 'Choose data folder',
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: suggested,
      })
      return result.canceled || !result.filePaths[0] ? null : result.filePaths[0]
    })

    ipcMain.handle('setup:confirm', (_event, dir: string) => {
      const dataDir = dir || suggested
      fs.mkdirSync(dataDir, { recursive: true })
      saveConfig({ dataDir })
      setDataRoot(dataDir)
      ipcMain.removeHandler('setup:browse')
      ipcMain.removeHandler('setup:confirm')
      win.close()
      resolve(dataDir)
      return true
    })

    win.loadURL(dataUrl(setupHtml(suggested)))
  })
}

/* ------------------------------------------------------------------ */
/* Splash screen with progress bar + percentage                        */
/* ------------------------------------------------------------------ */

function splashHtml(): string {
  const name = 'AK Heart & Diabetics Care Center'
  const nameHtml = name.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  // Split long names across two lines when possible
  const parts = nameHtml.split(/\s+/)
  let heading = nameHtml
  if (parts.length >= 4) {
    const mid = Math.ceil(parts.length / 2)
    heading = `${parts.slice(0, mid).join(' ')}<br>${parts.slice(mid).join(' ')}`
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; }
  body { height: 100vh; overflow: hidden; background: #f6f9f7; display: flex; align-items: center; justify-content: center; position: relative; }
  .wave { position: absolute; border-radius: 50%; background: #16803c; opacity: .92; }
  .wave.tl { width: 420px; height: 420px; top: -260px; left: -220px; }
  .wave.tl2 { width: 420px; height: 420px; top: -290px; left: -180px; background: #1f9d4d; opacity: .5; }
  .wave.br { width: 520px; height: 520px; bottom: -330px; right: -260px; }
  .wave.br2 { width: 520px; height: 520px; bottom: -360px; right: -220px; background: #1f9d4d; opacity: .5; }
  .deco { position: absolute; color: #dcebe0; }
  .center { text-align: center; z-index: 2; width: 420px; }
  h1 { color: #166534; font-size: 26px; line-height: 1.25; margin: 18px 0 8px; }
  .sub { color: #557a63; font-size: 13.5px; margin-bottom: 34px; }
  .bar-wrap { height: 8px; border-radius: 99px; background: #dcebe0; overflow: hidden; margin-bottom: 12px; }
  .bar { height: 100%; width: 0%; border-radius: 99px; background: linear-gradient(90deg, #16a34a, #166534); transition: width .35s ease; }
  .row { display: flex; justify-content: space-between; font-size: 12.5px; color: #557a63; margin-bottom: 26px; }
  .pct { font-weight: 700; color: #166534; }
  .status { color: #557a63; }
  .version { font-size: 11px; color: #93a99b; }
  .cursor { display: inline-block; width: 1px; height: 12px; background: #557a63; margin-right: 6px; vertical-align: middle; animation: blink 1s step-end infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  </style></head><body>
  <div class="wave tl2"></div><div class="wave tl"></div>
  <div class="wave br2"></div><div class="wave br"></div>
  <svg class="deco" style="top:60px;right:120px" width="70" height="70" viewBox="0 0 24 24" fill="currentColor"><path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7V3z"/></svg>
  <svg class="deco" style="bottom:80px;left:110px" width="56" height="56" viewBox="0 0 24 24" fill="currentColor"><path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7V3z"/></svg>
  <div class="center">
    <svg width="96" height="86" viewBox="0 0 96 86">
      <path d="M48 12 C40 26 20 28 20 48 a22 22 0 0 0 22 20 h12 a22 22 0 0 0 22 -20 c0-20-20-22-28-36z" fill="#16a34a"/>
      <path d="M30 20 C18 16 10 22 8 34 c10 4 20-2 22-14z" fill="#15803d"/>
      <path d="M66 20 C78 16 86 22 88 34 c-10 4-20-2-22-14z" fill="#15803d"/>
      <path d="M44 30h8v10h10v8H52v10h-8V48H34v-8h10V30z" fill="#fff"/>
    </svg>
    <h1>${heading}</h1>
    <div class="sub">Offline Clinic Management System</div>
    <div class="bar-wrap"><div class="bar" id="bar"></div></div>
    <div class="row"><span class="status"><span class="cursor"></span><span id="status">Starting&hellip;</span></span><span class="pct" id="pct">0%</span></div>
    <div class="version">Version ${APP_VERSION}</div>
  </div>
  <script>
    window.clinic.on('splash:progress', (data) => {
      document.getElementById('bar').style.width = data.percent + '%';
      document.getElementById('pct').textContent = Math.round(data.percent) + '%';
      document.getElementById('status').textContent = data.label;
    });
  </script>
  </body></html>`
}

function createSplash(): BrowserWindowType {
  const win = new BrowserWindow({
    width: 760,
    height: 500,
    resizable: false,
    frame: false,
    show: false,
    backgroundColor: '#f6f9f7',
    title: 'AK Heart & Diabetics Care Center',
    icon: resolveAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  win.loadURL(dataUrl(splashHtml()))
  win.once('ready-to-show', () => win.show())
  return win
}

function sendProgress(percent: number, label: string): void {
  if (splashWin && !splashWin.isDestroyed()) {
    splashWin.webContents.send('splash:progress', { percent, label })
  }
}

/* ------------------------------------------------------------------ */
/* Main window                                                          */
/* ------------------------------------------------------------------ */

function createMainWindow(): void {
  process.env.VITE_PUBLIC = app.isPackaged
    ? process.env.DIST
    : path.join(process.env.DIST!, '../public')

  mainWin = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1080,
    minHeight: 700,
    show: false,
    title: 'AK Heart & Diabetics Care Center',
    backgroundColor: '#f6f9f7',
    icon: resolveAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    mainWin.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWin.loadFile(path.join(process.env.DIST!, 'index.html'))
  }

  mainWin.once('ready-to-show', () => {
    sendProgress(100, 'Ready')
    setTimeout(() => {
      mainWin?.show()
      mainWin?.focus()
      if (splashWin && !splashWin.isDestroyed()) splashWin.close()
      splashWin = null
    }, 350)
  })
}

/* ------------------------------------------------------------------ */
/* Startup sequence                                                     */
/* ------------------------------------------------------------------ */

async function startApp(): Promise<void> {
  // 1. First run: ask where to store data
  if (!loadConfig()) {
    await runFirstRunSetup()
  }

  // 2. Splash with progress while background init runs
  splashWin = createSplash()
  await sleep(400)

  sendProgress(8, 'Checking data folder…')
  const paths = getAppPaths()
  await sleep(250)

  sendProgress(24, 'Preparing storage folders…')
  await sleep(250)

  sendProgress(42, 'Initializing local database…')
  initDatabase()
  await sleep(300)

  sendProgress(64, 'Loading clinic settings…')
  registerIpc()
  await sleep(250)

  sendProgress(82, 'Starting services…')
  appendLog(`Application started (data at ${paths.root})`)
  await sleep(200)

  sendProgress(92, 'Opening workspace…')
  createMainWindow()
}

app.whenReady().then(() => {
  const iconPath = resolveAppIcon()
  if (iconPath && process.platform === 'darwin' && app.dock) {
    try {
      app.dock.setIcon(iconPath)
    } catch {
      // Ignore invalid/unsupported icon formats in development
    }
  }

  void startApp()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase()
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
