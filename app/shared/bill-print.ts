export type BillPrintLayout = 'classic' | 'modern' | 'compact' | 'custom'
export type BillPrintBaseStyle = 'classic' | 'modern' | 'compact'

export const BILL_PRINT_LAYOUTS: Array<{
  id: BillPrintLayout
  label: string
  hint: string
}> = [
  {
    id: 'classic',
    label: 'Classic invoice',
    hint: 'Full clinic invoice with clear totals and payment status — best for A4 letterhead.',
  },
  {
    id: 'modern',
    label: 'Modern invoice',
    hint: 'Accent header band, card-style patient block, and bold total — good for blank paper.',
  },
  {
    id: 'compact',
    label: 'Compact / receipt',
    hint: 'Dense layout for A5 or quick receipts with less whitespace.',
  },
  {
    id: 'custom',
    label: 'Custom template',
    hint: 'Set your own invoice title, labels, columns, and visual style.',
  },
]

export function normalizeBillPrintLayout(value: string | null | undefined): BillPrintLayout {
  if (value === 'modern' || value === 'compact' || value === 'classic' || value === 'custom') return value
  return 'classic'
}

export function normalizeBillPrintBaseStyle(value: string | null | undefined): BillPrintBaseStyle {
  if (value === 'modern' || value === 'compact' || value === 'classic') return value
  return 'classic'
}

/** Visual chrome used when rendering — custom layout picks a base style. */
export function resolveBillVisualStyle(layout: BillPrintLayout, baseStyle?: string | null): BillPrintBaseStyle {
  if (layout === 'custom') return normalizeBillPrintBaseStyle(baseStyle)
  if (layout === 'modern' || layout === 'compact') return layout
  return 'classic'
}
