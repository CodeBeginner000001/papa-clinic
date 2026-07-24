import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { initials } from '../lib/format'
import { api } from '../lib/api'
import type { ClinicSettings } from '@shared/types'

/* ---------- Toasts ---------- */

interface Toast {
  id: number
  message: string
  kind: 'ok' | 'error'
}

const ToastContext = createContext<(message: string, kind?: 'ok' | 'error') => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((message: string, kind: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.kind === 'error' ? ' error' : ''}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/* ---------- Settings context (clinic + doctor identity) ---------- */

const defaultSettings: ClinicSettings = {
  clinic_name: 'AK Heart & Diabetics Care Center',
  clinic_address: '',
  clinic_phone: '',
  clinic_email: '',
  doctor_name: 'Dr. Alok Kumar',
  doctor_degrees: '',
  doctor_registration: '',
  doctor_specialization: 'Consultant Physician',
  default_consultation_fee: 500,
  default_followup_fee: 300,
  currency: 'INR',
  tax_enabled: '0',
  tax_percent: 0,
  bill_prefix: 'BILL',
  invoice_prefix: 'INV',
  print_letterhead_mode: 'digital',
  print_header_mm: 0,
  print_footer_mm: 0,
  print_paper_size: 'A4',
  bill_print_layout: 'classic',
  bill_print_show_item_type: '1',
  bill_print_show_patient_details: '1',
  bill_print_show_notes: '1',
  bill_print_show_signature: '1',
  bill_print_show_payment_summary: '1',
  bill_print_footer_note: 'Thank you for choosing our clinic. Get well soon.',
  bill_print_title: 'Invoice',
  bill_print_base_style: 'classic',
  bill_print_bill_to_label: 'Bill to',
  bill_print_details_label: 'Invoice details',
  bill_print_show_qty: '1',
  bill_print_show_rate: '1',
  bill_print_file_name: '',
  bill_print_file_kind: '',
  bill_print_original_name: '',
}

const SettingsContext = createContext<{ settings: ClinicSettings; reload: () => void }>({
  settings: defaultSettings,
  reload: () => {},
})

export function useSettings() {
  return useContext(SettingsContext)
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ClinicSettings>(defaultSettings)
  const reload = useCallback(() => {
    api.getSettings().then(setSettings).catch(() => {})
  }, [])
  useEffect(() => {
    reload()
  }, [reload])
  return <SettingsContext.Provider value={{ settings, reload }}>{children}</SettingsContext.Provider>
}

/* ---------- Small building blocks ---------- */

export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials(name || '?')}
    </span>
  )
}

type BadgeTone = 'green' | 'amber' | 'red' | 'blue' | 'gray'

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>
}

export function paymentTone(status: string | null | undefined): BadgeTone {
  if (status === 'Paid') return 'green'
  if (status === 'Partially paid') return 'amber'
  if (status === 'Cancelled' || status === 'Refunded') return 'gray'
  return 'red'
}

export function StatCard({
  icon,
  label,
  value,
  delta,
  tone,
  deltaTone,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  delta?: string
  tone?: 'green' | 'amber' | 'red' | 'blue'
  deltaTone?: 'ok' | 'warn' | 'bad'
}) {
  return (
    <div className="card stat-card">
      <div className={`stat-icon ${tone && tone !== 'green' ? tone : ''}`}>{icon}</div>
      <div className="stat-body">
        <div className="lbl">{label}</div>
        <div className="val">{value}</div>
        {delta && <div className={`delta${deltaTone === 'warn' ? ' warn' : deltaTone === 'bad' ? ' bad' : ''}`}>{delta}</div>}
      </div>
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string
  required?: boolean
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="field">
      <label>
        {label}
        {required && <span className="req">*</span>}
        {optional && <span className="opt">(optional)</span>}
      </label>
      {children}
    </div>
  )
}

export function Empty({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <div className="empty">
      {icon}
      <div>{text}</div>
    </div>
  )
}

export function Loading() {
  return (
    <div className="loading">
      <span className="spinner" /> Loading…
    </div>
  )
}
