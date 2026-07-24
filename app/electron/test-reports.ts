import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { dialog, shell } from './electron-api'
import { getAppPaths } from './paths'
import { classifyStationery, type StationeryKind } from './letterheads'

export type ReportFileKind = StationeryKind

function reportsDir(): string {
  return getAppPaths().testReports
}

export function testReportAbsPath(fileName: string): string {
  return path.join(reportsDir(), fileName)
}

export function removeTestReportFile(fileName: string | null | undefined): void {
  if (!fileName) return
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) return
  try {
    const full = testReportAbsPath(fileName)
    if (fs.existsSync(full)) fs.unlinkSync(full)
  } catch {
    // ignore
  }
}

export async function pickAndStoreTestReport(): Promise<{
  fileName: string
  fileKind: ReportFileKind
  originalName: string
} | null> {
  const result = await dialog.showOpenDialog({
    title: 'Upload test report',
    properties: ['openFile'],
    filters: [
      { name: 'Reports (PDF, image, Word)', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'doc', 'docx'] },
      { name: 'PDF', extensions: ['pdf'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
      { name: 'Word', extensions: ['doc', 'docx'] },
    ],
  })
  if (result.canceled || !result.filePaths[0]) return null

  const source = result.filePaths[0]
  const kind = classifyStationery(source)
  if (!kind) throw new Error('Unsupported file type. Use PDF, PNG, JPG, or Word.')

  const ext = path.extname(source).toLowerCase() || '.bin'
  const fileName = `report-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`
  const dest = testReportAbsPath(fileName)
  fs.mkdirSync(reportsDir(), { recursive: true })
  fs.copyFileSync(source, dest)

  return {
    fileName,
    fileKind: kind,
    originalName: path.basename(source),
  }
}

export async function openTestReportFile(fileName: string): Promise<boolean> {
  if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    throw new Error('Invalid report file')
  }
  const full = testReportAbsPath(fileName)
  if (!fs.existsSync(full)) throw new Error('Report file not found')
  const err = await shell.openPath(full)
  if (err) throw new Error(err || 'Could not open report')
  return true
}
