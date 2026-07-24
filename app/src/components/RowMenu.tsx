import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Dropdown anchored near a trigger; portaled + fixed so table overflow can't clip it. */
export function RowMenu({
  open,
  top,
  left,
  onClose,
  children,
}: {
  open: boolean
  top: number
  left: number
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState({ top, left })

  useLayoutEffect(() => {
    if (!open || !ref.current) {
      setPos({ top, left })
      return
    }
    const el = ref.current
    const h = el.offsetHeight
    const w = el.offsetWidth
    let nextTop = top
    let nextLeft = left
    if (top + h > window.innerHeight - 8) nextTop = Math.max(8, top - h - 32)
    if (left + w > window.innerWidth - 8) nextLeft = Math.max(8, window.innerWidth - w - 8)
    setPos({ top: nextTop, left: nextLeft })
  }, [open, top, left, children])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      if (ref.current?.contains(t)) return
      // Let the ⋮ button handle its own toggle
      if (t.closest('.more-btn')) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onScroll = () => onClose()
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div ref={ref} className="row-menu" role="menu" style={{ top: pos.top, left: pos.left }}>
      {children}
    </div>,
    document.body,
  )
}

export function menuCoordsFromEvent(e: React.MouseEvent<HTMLElement>): { top: number; left: number } {
  const rect = e.currentTarget.getBoundingClientRect()
  return { top: rect.bottom + 4, left: rect.left }
}
