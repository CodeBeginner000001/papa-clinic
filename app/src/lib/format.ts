export function money(amount: number | null | undefined): string {
  const value = Number(amount ?? 0)
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value)
  } catch {
    return `₹${value.toFixed(2)}`
  }
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') || iso.includes(' ') ? iso.replace(' ', 'T') : `${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtTime(time: string | null | undefined): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h)) return time
  const am = h < 12
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${String(hr).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')} ${am ? 'AM' : 'PM'}`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export type DateRange = 'all' | 'today' | '7d' | '30d' | '90d'

export const DATE_RANGES: Array<[DateRange, string]> = [
  ['all', 'All Time'],
  ['today', 'Today'],
  ['7d', 'Last 7 Days'],
  ['30d', 'Last 30 Days'],
  ['90d', 'Last 90 Days'],
]

/** True when the ISO date (YYYY-MM-DD…) falls inside the selected range. */
export function inDateRange(iso: string | null | undefined, range: DateRange): boolean {
  if (range === 'all') return true
  if (!iso) return false
  const date = iso.slice(0, 10)
  const today = todayIso()
  if (range === 'today') return date === today
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const start = new Date()
  start.setDate(start.getDate() - days)
  const startIso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
  return date >= startIso && date <= today
}

export function ageGender(age: number | null | undefined, gender: string | null | undefined): string {
  const parts = []
  if (age != null) parts.push(String(age))
  if (gender) parts.push(gender)
  return parts.join(' / ') || '—'
}
