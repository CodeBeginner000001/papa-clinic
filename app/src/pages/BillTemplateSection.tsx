import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Field, useSettings, useToast } from '../components/ui'
import { IBill } from '../components/icons'
import type { ClinicSettings } from '@shared/types'
import {
  BILL_PRINT_LAYOUTS,
  resolveBillVisualStyle,
  type BillPrintBaseStyle,
  type BillPrintLayout,
} from '@shared/bill-print'

type FilePreview = { kind: 'pdf' | 'image'; dataUrl: string } | null

function BillLayoutPreview({
  layout,
  settings,
  filePreview,
}: {
  layout: BillPrintLayout
  settings: ClinicSettings
  filePreview: FilePreview
}) {
  const style = resolveBillVisualStyle(layout, settings.bill_print_base_style)
  const modern = style === 'modern'
  const compact = style === 'compact'
  const isCustom = layout === 'custom'
  const showType = settings.bill_print_show_item_type !== '0'
  const showQty = !isCustom || settings.bill_print_show_qty !== '0'
  const showRate = !isCustom || settings.bill_print_show_rate !== '0'
  const showPay = settings.bill_print_show_payment_summary !== '0'
  const hasFile = isCustom && !!(settings.bill_print_file_name || '').trim()
  const docTitle = isCustom
    ? (settings.bill_print_title || 'Invoice').trim() || 'Invoice'
    : modern
      ? 'Tax Invoice'
      : 'Invoice'
  const billToLabel = isCustom
    ? (settings.bill_print_bill_to_label || 'Bill to').trim() || 'Bill to'
    : 'Bill to'
  const detailsLabel = isCustom
    ? (settings.bill_print_details_label || 'Invoice details').trim() || 'Invoice details'
    : 'Invoice details'
  const showDigitalHeading = settings.print_letterhead_mode !== 'paper' && !hasFile

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: '#fff',
        boxShadow: '0 8px 24px rgba(20,60,35,0.08)',
        maxWidth: 340,
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 420,
      }}
      aria-hidden
    >
      {filePreview?.kind === 'image' ? (
        <img
          src={filePreview.dataUrl}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
        />
      ) : filePreview?.kind === 'pdf' ? (
        <iframe
          title="Bill template PDF"
          src={filePreview.dataUrl}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}
        />
      ) : settings.bill_print_file_kind === 'word' && hasFile ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--muted)',
            background: '#f8faf9',
          }}
        >
          Word file saved. Export as PDF or PNG to preview over your printed bill form.
        </div>
      ) : null}

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: compact ? 12 : 16,
          fontSize: compact ? 10.5 : 11.5,
          color: 'var(--text)',
          background: filePreview ? 'rgba(255,255,255,0.82)' : undefined,
          minHeight: 420,
        }}
      >
        {showDigitalHeading && (
          <div style={{ borderBottom: '2px solid #0F3D3E', paddingBottom: 8, marginBottom: 10 }}>
            <div style={{ fontWeight: 800, color: '#0F3D3E', fontSize: 13 }}>{settings.clinic_name}</div>
            <div style={{ color: 'var(--muted)', fontSize: 10 }}>{settings.doctor_name}</div>
          </div>
        )}

        {modern ? (
          <div
            style={{
              background: '#0F3D3E',
              color: '#fff',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 10,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 14 }}>{docTitle.toUpperCase()}</div>
            <div style={{ opacity: 0.85, fontSize: 10, marginTop: 2 }}>INV-2026-000001 · Today</div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  border: '1.5px solid #0F3D3E',
                  color: '#0F3D3E',
                  padding: '2px 6px',
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.9)',
                }}
              >
                {docTitle}
              </span>
              <div style={{ fontWeight: 800, color: '#0F3D3E', marginTop: 4, fontSize: 13 }}>INV-2026-000001</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--muted)' }}>
              Paid
              <div
                style={{
                  display: 'inline-block',
                  marginTop: 4,
                  background: '#dcfce7',
                  color: '#14532d',
                  borderRadius: 99,
                  padding: '1px 7px',
                  fontWeight: 700,
                  fontSize: 9,
                }}
              >
                Paid
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div
            style={
              modern
                ? { background: 'rgba(244,248,245,0.95)', borderRadius: 8, padding: 8 }
                : { background: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: 4 }
            }
          >
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
              {billToLabel}
            </div>
            <div style={{ fontWeight: 700 }}>Sample Patient</div>
            <div style={{ color: 'var(--muted)', fontSize: 10 }}>PT-2026-000001</div>
          </div>
          <div
            style={
              modern
                ? { background: 'rgba(244,248,245,0.95)', borderRadius: 8, padding: 8 }
                : { background: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: 4 }
            }
          >
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
              {detailsLabel}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Date · Today</div>
          </div>
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: compact ? 9.5 : 10.5,
            background: 'rgba(255,255,255,0.88)',
          }}
        >
          <thead>
            <tr style={modern ? { background: '#0F3D3E', color: '#fff' } : { color: 'var(--muted)' }}>
              <th style={{ textAlign: 'left', padding: '5px 4px', fontWeight: 700 }}>Item</th>
              {showType && <th style={{ textAlign: 'left', padding: '5px 4px' }}>Type</th>}
              {showQty && <th style={{ textAlign: 'center', padding: '5px 4px' }}>Qty</th>}
              {showRate && <th style={{ textAlign: 'right', padding: '5px 4px' }}>Rate</th>}
              <th style={{ textAlign: 'right', padding: '5px 4px' }}>Amt</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '5px 4px' }}>Consultation</td>
              {showType && <td style={{ padding: '5px 4px', color: 'var(--muted)' }}>Consult</td>}
              {showQty && <td style={{ padding: '5px 4px', textAlign: 'center' }}>1</td>}
              {showRate && <td style={{ padding: '5px 4px', textAlign: 'right' }}>₹500</td>}
              <td style={{ padding: '5px 4px', textAlign: 'right' }}>₹500</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '5px 4px' }}>ECG</td>
              {showType && <td style={{ padding: '5px 4px', color: 'var(--muted)' }}>Test</td>}
              {showQty && <td style={{ padding: '5px 4px', textAlign: 'center' }}>1</td>}
              {showRate && <td style={{ padding: '5px 4px', textAlign: 'right' }}>₹350</td>}
              <td style={{ padding: '5px 4px', textAlign: 'right' }}>₹350</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <div
            style={{
              width: 140,
              background: modern ? 'rgba(244,248,245,0.95)' : 'rgba(255,255,255,0.9)',
              borderRadius: 8,
              padding: 8,
              fontSize: 10.5,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>Subtotal</span>
              <span>₹850</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0 2px',
                borderTop: '2px solid #0F3D3E',
                fontWeight: 800,
                color: '#0F3D3E',
                marginTop: 4,
              }}
            >
              <span>Total</span>
              <span>₹850</span>
            </div>
            {showPay && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#14532d' }}>
                <span>Paid</span>
                <span>₹850</span>
              </div>
            )}
          </div>
        </div>

        {settings.bill_print_footer_note?.trim() ? (
          <div
            style={{
              marginTop: 12,
              borderTop: '1px dashed var(--border)',
              paddingTop: 8,
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: 9.5,
            }}
          >
            {settings.bill_print_footer_note}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function BillTemplateSection() {
  const { settings: current, reload } = useSettings()
  const toast = useToast()
  const [form, setForm] = useState<ClinicSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [picking, setPicking] = useState(false)
  const [filePreview, setFilePreview] = useState<FilePreview>(null)

  useEffect(() => {
    setForm({ ...current })
  }, [current])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!form?.bill_print_file_name || !form.bill_print_file_kind || form.bill_print_file_kind === 'word') {
        if (!cancelled) setFilePreview(null)
        return
      }
      try {
        const p = await api.billTemplatePreview(form.bill_print_file_name, form.bill_print_file_kind)
        if (!cancelled) setFilePreview(p)
      } catch {
        if (!cancelled) setFilePreview(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [form?.bill_print_file_name, form?.bill_print_file_kind])

  if (!form) return null

  const layout = (form.bill_print_layout || 'classic') as BillPrintLayout
  const isCustom = layout === 'custom'

  const toggle = (key: keyof ClinicSettings) => {
    setForm({ ...form, [key]: form[key] === '0' ? '1' : '0' })
  }

  const pickFile = async () => {
    setPicking(true)
    try {
      const picked = await api.pickBillTemplateFile()
      if (!picked) return
      const prev = form.bill_print_file_name
      setForm({
        ...form,
        bill_print_layout: 'custom',
        bill_print_file_name: picked.fileName,
        bill_print_file_kind: picked.fileKind,
        bill_print_original_name: picked.originalName,
      })
      setFilePreview(picked.preview?.kind === 'word' ? null : picked.preview)
      if (prev && prev !== picked.fileName) {
        api.clearBillTemplateFile(prev).catch(() => {})
      }
      toast('Bill template file attached')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not upload file', 'error')
    } finally {
      setPicking(false)
    }
  }

  const removeFile = async () => {
    const prev = form.bill_print_file_name
    setForm({
      ...form,
      bill_print_file_name: '',
      bill_print_file_kind: '',
      bill_print_original_name: '',
    })
    setFilePreview(null)
    if (prev) api.clearBillTemplateFile(prev).catch(() => {})
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.saveSettings({
        ...current,
        ...form,
        bill_print_layout: layout,
        bill_print_title: (form.bill_print_title || 'Invoice').trim() || 'Invoice',
        bill_print_bill_to_label: (form.bill_print_bill_to_label || 'Bill to').trim() || 'Bill to',
        bill_print_details_label:
          (form.bill_print_details_label || 'Invoice details').trim() || 'Invoice details',
      })
      reload()
      toast('Bill template saved')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save bill template', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-head" style={{ marginTop: 4 }}>
        <div className="titles">
          <h2 className="page-title" style={{ fontSize: 18 }}>
            Bill invoice template
          </h2>
          <p className="page-sub">
            Choose a preset or build a custom invoice. Upload a PDF, Word, or image of your bill form for custom
            templates. Paper size and margins still come from the active letterhead.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : '✓ Save bill template'}
          </button>
        </div>
      </div>

      <div className="grid cols-2" style={{ alignItems: 'start', gap: 20 }}>
        <div className="card card-pad">
          <div className="form-section-title" style={{ marginTop: 0 }}>
            <IBill size={17} /> Layout style
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {BILL_PRINT_LAYOUTS.map((opt) => (
              <label
                key={opt.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: `1.5px solid ${layout === opt.id ? 'var(--green-600)' : 'var(--border)'}`,
                  background: layout === opt.id ? 'var(--green-50)' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="bill-layout"
                  checked={layout === opt.id}
                  onChange={() => setForm({ ...form, bill_print_layout: opt.id })}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{opt.hint}</div>
                </span>
              </label>
            ))}
          </div>

          {isCustom && (
            <>
              <div className="form-section-title">Uploaded bill form</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.45 }}>
                Upload a scan of your printed bill / invoice stationery (PDF, Word, or image). Images are used as the
                print background; PDF/Word help you align content in the preview.
              </div>
              {form.bill_print_file_name ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                    padding: '10px 12px',
                    background: 'var(--green-50)',
                    borderRadius: 8,
                    marginBottom: 14,
                    fontSize: 13,
                  }}
                >
                  <span style={{ flex: 1, minWidth: 120 }}>
                    {form.bill_print_original_name || form.bill_print_file_name}
                    {form.bill_print_file_kind ? (
                      <span className="badge gray" style={{ marginLeft: 8 }}>
                        {form.bill_print_file_kind}
                      </span>
                    ) : null}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={pickFile} disabled={picking}>
                    Replace
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={removeFile}>
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-outline"
                  onClick={pickFile}
                  disabled={picking}
                  style={{ marginBottom: 14, justifySelf: 'start' }}
                >
                  {picking ? 'Opening…' : 'Upload PDF / Word / image'}
                </button>
              )}

              <div className="form-section-title">Custom fields</div>
              <div className="form-grid" style={{ gap: 12, marginBottom: 14 }}>
                <Field label="Document title">
                  <input
                    className="input"
                    list="bill-title-suggestions"
                    value={form.bill_print_title}
                    placeholder="Invoice / Tax Invoice / Receipt"
                    onChange={(e) => setForm({ ...form, bill_print_title: e.target.value })}
                  />
                  <datalist id="bill-title-suggestions">
                    <option value="Invoice" />
                    <option value="Tax Invoice" />
                    <option value="Receipt" />
                    <option value="Payment Receipt" />
                    <option value="Bill" />
                  </datalist>
                </Field>
                <Field label="Visual style">
                  <select
                    className="select"
                    value={form.bill_print_base_style}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        bill_print_base_style: e.target.value as BillPrintBaseStyle,
                      })
                    }
                  >
                    <option value="classic">Classic</option>
                    <option value="modern">Modern</option>
                    <option value="compact">Compact</option>
                  </select>
                </Field>
                <div className="form-grid g2" style={{ gap: 12 }}>
                  <Field label="Left label">
                    <input
                      className="input"
                      value={form.bill_print_bill_to_label}
                      placeholder="Bill to"
                      onChange={(e) => setForm({ ...form, bill_print_bill_to_label: e.target.value })}
                    />
                  </Field>
                  <Field label="Right label">
                    <input
                      className="input"
                      value={form.bill_print_details_label}
                      placeholder="Invoice details"
                      onChange={(e) => setForm({ ...form, bill_print_details_label: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            </>
          )}

          <div className="form-section-title">What to include</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {(
              [
                ['bill_print_show_item_type', 'Item type column (Consultation, Test, …)'],
                ...(isCustom
                  ? ([
                      ['bill_print_show_qty', 'Quantity column'],
                      ['bill_print_show_rate', 'Rate column'],
                    ] as const)
                  : []),
                ['bill_print_show_patient_details', 'Patient age, gender & mobile'],
                ['bill_print_show_notes', 'Bill notes'],
                ['bill_print_show_payment_summary', 'Paid / outstanding summary'],
                ['bill_print_show_signature', 'Doctor signature line'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
                <input type="checkbox" checked={form[key] !== '0'} onChange={() => toggle(key)} />
                {label}
              </label>
            ))}
          </div>

          <Field label="Footer note (optional)">
            <input
              className="input"
              value={form.bill_print_footer_note}
              placeholder="Thank you for choosing our clinic…"
              onChange={(e) => setForm({ ...form, bill_print_footer_note: e.target.value })}
            />
          </Field>
        </div>

        <div className="card card-pad">
          <div className="form-section-title" style={{ marginTop: 0 }}>
            Preview
          </div>
          <BillLayoutPreview layout={layout} settings={form} filePreview={isCustom ? filePreview : null} />
        </div>
      </div>
    </div>
  )
}
