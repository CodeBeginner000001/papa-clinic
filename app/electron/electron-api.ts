import type {
  BrowserWindow as BrowserWindowType,
  App,
  IpcMain,
  Shell,
  Dialog,
} from 'electron'

// Electron CJS interop — named ESM imports break after Vite bundling.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const electron = require('electron') as typeof import('electron')

export const app: App = electron.app
export const BrowserWindow = electron.BrowserWindow
export const ipcMain: IpcMain = electron.ipcMain
export const shell: Shell = electron.shell
export const dialog: Dialog = electron.dialog
export const contextBridge = electron.contextBridge
export const ipcRenderer = electron.ipcRenderer

export type { BrowserWindowType }
