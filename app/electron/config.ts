import fs from 'node:fs'
import path from 'node:path'
import { app } from './electron-api'

export interface AppConfig {
  dataDir: string
}

function configFile(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

export function defaultDataDir(): string {
  return path.join(app.getPath('documents'), 'AK Clinic Data')
}

export function loadConfig(): AppConfig | null {
  try {
    const raw = fs.readFileSync(configFile(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppConfig>
    if (parsed.dataDir && typeof parsed.dataDir === 'string') {
      return { dataDir: parsed.dataDir }
    }
    return null
  } catch {
    return null
  }
}

export function saveConfig(config: AppConfig): void {
  fs.mkdirSync(path.dirname(configFile()), { recursive: true })
  fs.writeFileSync(configFile(), JSON.stringify(config, null, 2), 'utf-8')
}
