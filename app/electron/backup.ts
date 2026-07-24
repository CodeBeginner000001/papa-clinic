import fs from 'node:fs'
import path from 'node:path'
import { createWriteStream, createReadStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { createGzip, createGunzip } from 'node:zlib'
import { dialog } from './electron-api'
import { closeDatabase, getDb, initDatabase } from './db/database'
import { appendLog, getAppPaths } from './paths'

function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

async function copyFile(src: string, dest: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(dest), { recursive: true })
  await fs.promises.copyFile(src, dest)
}

export async function createBackup(targetPath?: string): Promise<string> {
  const paths = getAppPaths()
  getDb().pragma('wal_checkpoint(FULL)')
  const fileName = `clinic-backup-${stamp()}.db`
  const dest = targetPath || path.join(paths.backups, fileName)
  await copyFile(paths.db, dest)

  // Also copy key folders into a sidecar directory next to the backup when using default location
  const sidecar = dest.replace(/\.db$/, '-files')
  for (const folder of ['prescriptions', 'bills', 'exports'] as const) {
    const srcDir = paths[folder]
    const outDir = path.join(sidecar, folder)
    await fs.promises.mkdir(outDir, { recursive: true })
    const entries = await fs.promises.readdir(srcDir).catch(() => [])
    for (const entry of entries) {
      await copyFile(path.join(srcDir, entry), path.join(outDir, entry)).catch(() => undefined)
    }
  }

  appendLog(`Backup created at ${dest}`)
  return dest
}

export async function chooseBackupPath(): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    title: 'Save clinic backup',
    defaultPath: `clinic-backup-${stamp()}.db`,
    filters: [{ name: 'SQLite Backup', extensions: ['db'] }],
  })
  return result.canceled || !result.filePath ? null : result.filePath
}

export async function chooseRestoreFile(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Restore clinic backup',
    properties: ['openFile'],
    filters: [{ name: 'SQLite Backup', extensions: ['db'] }],
  })
  return result.canceled || !result.filePaths[0] ? null : result.filePaths[0]
}

export async function restoreBackup(backupPath: string): Promise<void> {
  if (!fs.existsSync(backupPath)) throw new Error('Backup file not found')
  const paths = getAppPaths()
  await createBackup(path.join(paths.backups, `pre-restore-${stamp()}.db`))
  closeDatabase()
  await copyFile(backupPath, paths.db)
  initDatabase()
  appendLog(`Restored database from ${backupPath}`)
}

export async function gzipFile(src: string, dest: string): Promise<void> {
  await pipeline(createReadStream(src), createGzip(), createWriteStream(dest))
}

export async function gunzipFile(src: string, dest: string): Promise<void> {
  await pipeline(createReadStream(src), createGunzip(), createWriteStream(dest))
}
