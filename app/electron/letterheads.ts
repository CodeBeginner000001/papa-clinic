import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { dialog } from './electron-api'
import { getAppPaths } from './paths'

export type StationeryKind = 'pdf' | 'image' | 'word'
export type StationeryPurpose = 'letterhead' | 'bill'

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
const PDF_EXT = new Set(['.pdf'])
const WORD_EXT = new Set(['.doc', '.docx'])

export function classifyStationery(filePath: string): StationeryKind | null {
  const ext = path.extname(filePath).toLowerCase()
  if (PDF_EXT.has(ext)) return 'pdf'
  if (IMAGE_EXT.has(ext)) return 'image'
  if (WORD_EXT.has(ext)) return 'word'
  return null
}

function mimeFor(filePath: string, kind: StationeryKind): string | null {
  if (kind === 'pdf') return 'application/pdf'
  if (kind === 'word') return null
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  return 'image/png'
}

function purposeDir(purpose: StationeryPurpose): string {
  const paths = getAppPaths()
  return purpose === 'bill' ? paths.billTemplates : paths.letterheads
}

function prefixFor(purpose: StationeryPurpose): string {
  return purpose === 'bill' ? 'bill' : 'lh'
}

export function stationeryAbsPath(fileName: string, purpose: StationeryPurpose = 'letterhead'): string {
  return path.join(purposeDir(purpose), fileName)
}

/** @deprecated use stationeryAbsPath */
export function letterheadAbsPath(fileName: string): string {
  return stationeryAbsPath(fileName, 'letterhead')
}

export function removeStationeryFile(
  fileName: string | null | undefined,
  purpose: StationeryPurpose = 'letterhead',
): void {
  if (!fileName) return
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) return
  try {
    const full = stationeryAbsPath(fileName, purpose)
    if (fs.existsSync(full)) fs.unlinkSync(full)
  } catch {
    // ignore
  }
}

/** @deprecated use removeStationeryFile */
export function removeLetterheadFile(fileName: string | null | undefined): void {
  removeStationeryFile(fileName, 'letterhead')
}

export function buildStationeryPreview(
  fileName: string,
  fileKind: StationeryKind | null,
  purpose: StationeryPurpose = 'letterhead',
): { kind: StationeryKind; dataUrl: string } | null {
  if (!fileName || !fileKind || fileKind === 'word') return null
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) return null
  const full = stationeryAbsPath(fileName, purpose)
  if (!fs.existsSync(full)) return null
  const mime = mimeFor(full, fileKind)
  if (!mime) return null
  const buf = fs.readFileSync(full)
  return { kind: fileKind, dataUrl: `data:${mime};base64,${buf.toString('base64')}` }
}

/** @deprecated use buildStationeryPreview */
export function buildLetterheadPreview(
  fileName: string,
  fileKind: StationeryKind | null,
): { kind: StationeryKind; dataUrl: string } | null {
  return buildStationeryPreview(fileName, fileKind, 'letterhead')
}

export async function pickAndStoreStationery(purpose: StationeryPurpose = 'letterhead'): Promise<{
  fileName: string
  fileKind: StationeryKind
  originalName: string
  preview: { kind: StationeryKind; dataUrl: string } | null
} | null> {
  const isBill = purpose === 'bill'
  const result = await dialog.showOpenDialog({
    title: isBill ? 'Upload bill template' : 'Upload printed letterhead',
    properties: ['openFile'],
    filters: [
      {
        name: isBill ? 'Bill template (PDF, image, Word)' : 'Letterhead (PDF, image, Word)',
        extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'doc', 'docx'],
      },
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
  const fileName = `${prefixFor(purpose)}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`
  const dest = stationeryAbsPath(fileName, purpose)
  fs.mkdirSync(purposeDir(purpose), { recursive: true })
  fs.copyFileSync(source, dest)

  return {
    fileName,
    fileKind: kind,
    originalName: path.basename(source),
    preview: buildStationeryPreview(fileName, kind, purpose),
  }
}

/** @deprecated use pickAndStoreStationery('letterhead') */
export async function pickAndStoreLetterhead() {
  return pickAndStoreStationery('letterhead')
}

export type LetterheadKind = StationeryKind
