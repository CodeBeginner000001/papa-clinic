import fs from 'node:fs'
import path from 'node:path'
import { app } from './electron-api'
import { loadConfig } from './config'

export interface AppPaths {
  root: string
  db: string
  backups: string
  prescriptions: string
  bills: string
  prints: string
  exports: string
  logs: string
  letterheads: string
  billTemplates: string
  testReports: string
}

let cachedRoot: string | null = null

export function setDataRoot(root: string): void {
  cachedRoot = root
}

export function getDataRoot(): string {
  if (cachedRoot) return cachedRoot
  const config = loadConfig()
  cachedRoot = config?.dataDir ?? app.getPath('userData')
  return cachedRoot
}

export function getAppPaths(): AppPaths {
  const root = getDataRoot()
  const paths: AppPaths = {
    root,
    db: path.join(root, 'clinic.db'),
    backups: path.join(root, 'backups'),
    prescriptions: path.join(root, 'prescriptions'),
    bills: path.join(root, 'bills'),
    prints: path.join(root, 'prints'),
    exports: path.join(root, 'exports'),
    logs: path.join(root, 'logs'),
    letterheads: path.join(root, 'letterheads'),
    billTemplates: path.join(root, 'bill-templates'),
    testReports: path.join(root, 'test-reports'),
  }
  for (const dir of [
    paths.root,
    paths.backups,
    paths.prescriptions,
    paths.bills,
    paths.prints,
    paths.exports,
    paths.logs,
    paths.letterheads,
    paths.billTemplates,
    paths.testReports,
  ]) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return paths
}

export function appendLog(message: string): void {
  try {
    const { logs } = getAppPaths()
    const line = `[${new Date().toISOString()}] ${message}\n`
    fs.appendFileSync(path.join(logs, 'app.log'), line)
  } catch {
    // ignore logging failures
  }
}
