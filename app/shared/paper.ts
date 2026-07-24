/** Standard paper sizes used for print templates / letterhead margins. */

export type PaperSizeId = 'A4' | 'A5' | 'Letter' | 'Legal'

export interface PaperSize {
  id: PaperSizeId
  label: string
  /** Width in millimetres */
  widthMm: number
  /** Height in millimetres */
  heightMm: number
  /** CSS @page size token */
  cssSize: string
  /** Electron printToPDF pageSize */
  electronSize: 'A4' | 'A5' | 'Letter' | 'Legal'
}

export const PAPER_SIZES: Record<PaperSizeId, PaperSize> = {
  A4: { id: 'A4', label: 'A4 (210 × 297 mm)', widthMm: 210, heightMm: 297, cssSize: 'A4', electronSize: 'A4' },
  A5: { id: 'A5', label: 'A5 (148 × 210 mm)', widthMm: 148, heightMm: 210, cssSize: 'A5', electronSize: 'A5' },
  Letter: {
    id: 'Letter',
    label: 'Letter (216 × 279 mm)',
    widthMm: 215.9,
    heightMm: 279.4,
    cssSize: 'letter',
    electronSize: 'Letter',
  },
  Legal: {
    id: 'Legal',
    label: 'Legal (216 × 356 mm)',
    widthMm: 215.9,
    heightMm: 355.6,
    cssSize: 'legal',
    electronSize: 'Legal',
  },
}

export const PAPER_SIZE_OPTIONS: PaperSize[] = [PAPER_SIZES.A4, PAPER_SIZES.A5, PAPER_SIZES.Letter, PAPER_SIZES.Legal]

export function resolvePaperSize(id: string | null | undefined): PaperSize {
  if (id && id in PAPER_SIZES) return PAPER_SIZES[id as PaperSizeId]
  return PAPER_SIZES.A4
}

export function normalizePaperSizeId(id: string | null | undefined): PaperSizeId {
  return resolvePaperSize(id).id
}
