import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { money, fmtDate, todayIso, ageGender } from '../lib/format'
import { Avatar, Field, Loading, useSettings, useToast } from '../components/ui'
import { ITrash } from '../components/icons'
import type { Bill, BillItem, DiscountType, Patient, Visit } from '@shared/types'

const ITEM_TYPES = ['Consultation', 'Test', 'Procedure', 'Medicine', 'Service', 'Other'] as const

interface ItemRow {
  itemType: string
  itemName: string
  quantity: number
  unitPrice: number
  itemReferenceId?: number | null
}

export default function BillFormPage() {
  const { billId } = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const navState = (location.state as { from?: string } | null) ?? undefined
  const editing = Boolean(billId)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [visit, setVisit] = useState<Visit | null>(null)
  const [items, setItems] = useState<ItemRow[]>([])
  const [billDate, setBillDate] = useState(todayIso())
  const [discountType, setDiscountType] = useState<DiscountType>('none')
  const [discountValue, setDiscountValue] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const { settings } = useSettings()

  const taxPercent = settings.tax_enabled === '1' ? settings.tax_percent : 0

  // Load existing bill for edit
  useEffect(() => {
    if (!editing) return
    api.getBill(Number(billId)).then((b: (Bill & { items: BillItem[] }) | null) => {
      if (!b) return
      if (b.status === 'finalized') {
        navigate(`/bills/${b.id}`, { replace: true, state: navState })
        return
      }
      api.getPatient(b.patient_id).then(setPatient)
      if (b.visit_id) api.getVisit(b.visit_id).then(setVisit)
      setBillDate(b.bill_date)
      setDiscountType(b.discount_type)
      setDiscountValue(b.discount_value)
      setNotes(b.notes ?? '')
      setItems(
        b.items.map((i) => ({
          itemType: i.item_type,
          itemName: i.item_name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          itemReferenceId: i.item_reference_id,
        })),
      )
      setReady(true)
    })
  }, [editing, billId, navigate])

  // Prefill from query params for new bill (must be tied to a visit prescription)
  useEffect(() => {
    if (editing) return
    const pid = params.get('patient')
    const vid = params.get('visit')
    const boot = async () => {
      if (!vid) {
        toast('Bills can only be generated from a visit', 'error')
        navigate('/billing', { replace: true })
        return
      }
      const v = await api.getVisit(Number(vid))
      if (!v) {
        toast('Visit not found', 'error')
        navigate('/billing', { replace: true })
        return
      }
      const rx = await api.getPrescriptionByVisit(v.id)
      const visitTests = await api.getVisitTests(v.id)
      const hasTests = visitTests.some(
        (t: { status: string; source?: string }) => t.status !== 'Cancelled' && t.source !== 'outside',
      )
      if (!rx && !hasTests) {
        const procedures = await api.getVisitProcedures(v.id)
        if (!procedures.length) {
          toast('Create a prescription, add clinic tests, or add services for this visit before generating a bill', 'error')
          navigate(`/visits/${v.id}`, { replace: true })
          return
        }
      }
      const existingBills = await api.listBillsForVisit(v.id)
      const unpaid = existingBills.find(
        (b: { payment_status: string; status: string }) =>
          b.payment_status !== 'Paid' && b.status !== 'cancelled',
      )
      if (unpaid) {
        toast('An unpaid bill already exists for this visit', 'error')
        navigate(`/bills/${unpaid.id}`, { replace: true, state: navState })
        return
      }
      const leftovers = (await api.getVisitLeftoverBillItems(v.id)) as Array<{
        itemType: string
        itemReferenceId?: number | null
        itemName: string
        quantity: number
        unitPrice: number
      }>
      if (!leftovers.length) {
        toast('Nothing left to bill for this visit — all charges are already billed', 'error')
        navigate(`/visits/${v.id}`, { replace: true })
        return
      }
      setVisit(v)
      const p = pid ? await api.getPatient(Number(pid)) : await api.getPatient(v.patient_id)
      setPatient(p)
      setItems(
        leftovers.map((i) => ({
          itemType: i.itemType,
          itemName: i.itemName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          itemReferenceId: i.itemReferenceId ?? null,
        })),
      )
      setReady(true)
    }
    boot().catch((err) => {
      toast(err instanceof Error ? err.message : 'Failed to open bill form', 'error')
      navigate('/billing', { replace: true })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const subtotal = useMemo(() => items.reduce((s, i) => s + Math.max(0, i.quantity * i.unitPrice), 0), [items])
  const discountAmount = useMemo(() => {
    if (discountType === 'flat') return Math.min(subtotal, discountValue)
    if (discountType === 'percent') return (subtotal * discountValue) / 100
    return 0
  }, [subtotal, discountType, discountValue])
  const taxAmount = ((subtotal - discountAmount) * taxPercent) / 100
  const total = subtotal - discountAmount + taxAmount

  const update = (i: number, patch: Partial<ItemRow>) => setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const save = async (status: 'draft' | 'finalized') => {
    if (!patient || !visit) {
      toast('Bills must be linked to a visit prescription', 'error')
      return
    }
    const valid = items.filter((i) => i.itemName.trim())
    if (valid.length === 0) {
      toast('Add at least one bill item', 'error')
      return
    }
    setSaving(true)
    try {
      const bill = await api.saveBill({
        id: editing ? Number(billId) : undefined,
        patientId: patient.id,
        visitId: visit.id,
        billDate,
        discountType,
        discountValue,
        notes,
        status,
        items: valid.map((i) => ({
          itemType: i.itemType,
          itemName: i.itemName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          itemReferenceId: i.itemReferenceId ?? null,
        })),
      })
      toast(status === 'finalized' ? `Bill ${bill.bill_number} finalized` : 'Bill saved as draft')
      navigate(`/bills/${bill.id}`, { state: navState })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save bill', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!ready) return <Loading />

  return (
    <div>
      <div className="page-head">
        <div className="titles">
          <div className="crumbs">
            <Link to="/billing">Billing</Link>
            <span className="sep">/</span>
            <span>{editing ? 'Edit Bill' : 'Generate Bill'}</span>
          </div>
          <h1 className="page-title">{editing ? 'Edit Bill' : 'Generate Bill'}</h1>
          <p className="page-sub">Only unbilled leftover charges for this visit. Already paid items are not included.</p>
        </div>
        <div className="page-actions">
          {visit && (
            <Link to={`/visits/${visit.id}`} className="btn btn-outline">
              ← Back to Visit
            </Link>
          )}
        </div>
      </div>

      {/* Patient / visit header */}
      <div className="card person-card" style={{ marginBottom: 16 }}>
        {patient && (
          <>
            <Avatar name={patient.full_name} size={50} />
            <div className="who">
              <div className="nm">{patient.full_name}</div>
              <div className="pid">
                Patient ID: {patient.patient_code} · {ageGender(patient.age, patient.gender)}
                {patient.mobile ? ` · ${patient.mobile}` : ''}
              </div>
            </div>
            <div className="person-meta">
              {visit && (
                <div className="m">
                  <div className="l">Visit</div>
                  <div className="v">
                    {fmtDate(visit.visit_date)} · {visit.final_diagnosis || visit.provisional_diagnosis || visit.visit_type}
                  </div>
                </div>
              )}
              <div className="m">
                <div className="l">Doctor</div>
                <div className="v">{settings.doctor_name}</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid cols-3-1">
        <div className="card">
          <div className="card-head">
            <h3>Bill Items</h3>
            <span className="spacer" />
            <button className="btn btn-outline btn-sm" onClick={() => setItems([...items, { itemType: 'Other', itemName: '', quantity: 1, unitPrice: 0, itemReferenceId: null }])}>
              + Add Item
            </button>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Item Type</th>
                  <th style={{ minWidth: 200 }}>Item Name</th>
                  <th style={{ width: 100 }}>Qty</th>
                  <th style={{ width: 130 }}>Unit Price</th>
                  <th className="num">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td>
                      <select className="select" value={it.itemType} onChange={(e) => update(i, { itemType: e.target.value })}>
                        {ITEM_TYPES.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input className="input" value={it.itemName} onChange={(e) => update(i, { itemName: e.target.value })} placeholder="Item name" />
                    </td>
                    <td>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        style={{ minWidth: 80 }}
                        value={it.quantity}
                        onChange={(e) => update(i, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        step="0.5"
                        style={{ minWidth: 100 }}
                        value={it.unitPrice}
                        onChange={(e) => update(i, { unitPrice: Number(e.target.value) })}
                      />
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>{money(Math.max(0, it.quantity * it.unitPrice))}</td>
                    <td>
                      <button className="btn btn-danger btn-icon" title="Remove" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
                        <ITrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-pad" style={{ borderTop: '1px solid var(--border)' }}>
            <Field label="Notes">
              <textarea
                className="textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Thank you for visiting ${settings.clinic_name}. Get well soon!`}
              />
            </Field>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignSelf: 'flex-start' }}>
          <div className="card card-pad">
            <h3 style={{ fontSize: 14.5, marginBottom: 12 }}>🧾 Bill Summary</h3>
            <Field label="Bill Date">
              <input className="input" type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
            </Field>
            <div className="kv" style={{ marginTop: 12 }}>
              <span className="k">Subtotal</span>
              <span className="v">{money(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)', flex: 1 }}>Discount</span>
              <input
                className="input"
                style={{ width: 80 }}
                type="number"
                min={0}
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                disabled={discountType === 'none'}
              />
              <select className="select" style={{ width: 74 }} value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                <option value="none">—</option>
                <option value="percent">%</option>
                <option value="flat">₹</option>
              </select>
            </div>
            {discountAmount > 0 && (
              <div className="kv">
                <span className="k">Discount Applied</span>
                <span className="v green">− {money(discountAmount)}</span>
              </div>
            )}
            {taxPercent > 0 && (
              <div className="kv">
                <span className="k">Tax ({taxPercent}%)</span>
                <span className="v">{money(taxAmount)}</span>
              </div>
            )}
            <div className="kv total">
              <span className="k">Total Amount</span>
              <span className="v">{money(total)}</span>
            </div>
          </div>

          <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <button className="btn btn-primary" onClick={() => save('draft')} disabled={saving}>
              Save
            </button>
            <button className="btn btn-outline" onClick={() => save('finalized')} disabled={saving}>
              Finalize Bill
            </button>
            <button className="btn btn-ghost" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
