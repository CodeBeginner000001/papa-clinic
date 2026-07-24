import fs from 'node:fs'
import path from 'node:path'
import { BrowserWindow, dialog } from './electron-api'
import { getAppPaths } from './paths'
import { getExportRows, type ExportKind } from './db/repos'

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(headers: string[], rows: Array<Array<string | number | null>>): string {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ]
  // UTF-8 BOM so Excel opens Indian characters correctly
  return `\uFEFF${lines.join('\n')}`
}

const LABELS: Record<ExportKind, string> = {
  patients: 'Patients',
  visits: 'Visits',
  prescriptions: 'Prescriptions',
  bills: 'Bills',
  payments: 'Payments',
  tests: 'Tests',
}

export async function exportReportExcel(
  kind: ExportKind,
  from: string,
  to: string,
): Promise<string | null> {
  const { headers, rows } = getExportRows(kind, from, to)
  const csv = toCsv(headers, rows)
  const win = BrowserWindow.getFocusedWindow() ?? undefined
  const suggested = `${LABELS[kind]}_${from}_to_${to}.csv`
  const result = await dialog.showSaveDialog(win!, {
    title: `Export ${LABELS[kind]} to Excel`,
    defaultPath: path.join(getAppPaths().exports, suggested),
    filters: [
      { name: 'Excel CSV', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  if (result.canceled || !result.filePath) return null
  fs.writeFileSync(result.filePath, csv, 'utf-8')
  return result.filePath
}
