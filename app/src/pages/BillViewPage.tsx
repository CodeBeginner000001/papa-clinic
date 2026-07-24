import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { money, fmtDate, todayIso, ageGender } from '../lib/format'
import { Avatar, Badge, Field, Loading, Modal, paymentTone, useToast } from '../components/ui'
import { IDownload, IEdit, IMoney, IPrint } from '../components/icons'
import type { Bill, BillItem, Invoice, Patient, PaymentMode } from '@shared/types'

const PAY_MODES: PaymentMode[] = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Cheque', 'Other']

function PaymentModal({
  bill,
  patient,
  onClose,
  onSaved,
}: {
  bill: Bill
  patient: Patient
  onClose: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = useState(bill.outstanding_amount)
  const [mode, setMode] = useState<PaymentMode>('Cash')
  const [date, setDate] = useState(todayIso())
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const save = async () => {
    setSaving(true)
    try {
      const result = await api.recordPayment({
        billId: bill.id,
        patientId: patient.id,
        paymentDate: date,
        amount,
        paymentMode: mode,
        referenceNumber: reference || undefined,
        notes: notes || undefined,
      })
      toast(`Payment of ${money(amount)} recorded · Invoice ${result.invoice.invoice_number}`)
      onSaved()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to record payment', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Collect Payment — ${bill.bill_number}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            Collect Payment
          </button>
        </>
      }
    >
      <div className="due-banner" style={{ marginTop: 0, marginBottom: 16 }}>
        <span>Due Amount</span>
        <span>{money(bill.outstanding_amount)}</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
        Recording a payment creates an invoice for that amount. One bill can have multiple invoices.
      </p>
      <div className="form-grid g2">
        <Field label="Payment Date" required>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Amount Received" required>
          <input
            className="input"
            type="number"
            min={0}
            max={bill.outstanding_amount}
            step="0.5"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </Field>
      </div>
      <div style={{ margin: '14px 0' }}>
        <Field label="Payment Mode" required>
          <div className="mode-tabs">
            {PAY_MODES.slice(0, 4).map((m) => (
              <button key={m} className={`mode-tab${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>
                {m}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <div className="form-grid g2">
        <Field label="Reference / Transaction ID" optional>
          <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. UPI1234567890" />
        </Field>
        <Field label="Notes" optional>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
        </Field>
      </div>
    </Modal>
  )
}

export default function BillViewPage() {
  const { billId } = useParams()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const [bill, setBill] = useState<(Bill & { items: BillItem[] }) | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [showPay, setShowPay] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const fromPath = (location.state as { from?: string } | null)?.from

  const load = useCallback(() => {
    api.getBill(Number(billId)).then((b: (Bill & { items: BillItem[] }) | null) => {
      setBill(b)
      if (b) {
        api.getPatient(b.patient_id).then(setPatient)
        api.listInvoicesForBill(b.id).then(setInvoices)
      }
    })
  }, [billId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (params.get('pay') === '1' && bill && bill.status === 'finalized' && bill.outstanding_amount > 0) {
      setShowPay(true)
      params.delete('pay')
      setParams(params, { replace: true })
    }
  }, [params, bill, setParams])

  if (!bill || !patient) return <Loading />

  const backLink =
    fromPath === '/billing'
      ? { to: '/billing', label: '← Back to Billing' }
      : bill.visit_id
        ? { to: `/visits/${bill.visit_id}`, label: '← Back to Visit' }
        : { to: '/billing', label: '← Back to Billing' }

  const finalize = async () => {
    try {
      await api.saveBill({
        id: bill.id,
        patientId: bill.patient_id,
        visitId: bill.visit_id,
        billDate: bill.bill_date,
        discountType: bill.discount_type,
        discountValue: bill.discount_value,
        notes: bill.notes ?? undefined,
        status: 'finalized',
        items: bill.items.map((i) => ({
          itemType: i.item_type,
          itemName: i.item_name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          discount: i.discount,
        })),
      })
      toast('Bill finalized')
      load()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to finalize', 'error')
    }
  }

  return (
    <div>
      <div className="page-head">
        <div className="titles">
          <div className="crumbs">
            <Link to="/billing">Billing</Link>
            <span className="sep">/</span>
            <Link to={`/patients/${patient.id}`}>{patient.full_name}</Link>
            <span className="sep">/</span>
            <span>Bill</span>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            Bill #{bill.bill_number}
            <Badge tone={bill.status === 'draft' ? 'gray' : paymentTone(bill.payment_status)}>
              {bill.status === 'draft' ? 'Draft' : bill.payment_status}
            </Badge>
          </h1>
        </div>
        <div className="page-actions">
          <Link to={backLink.to} className="btn btn-outline">
            {backLink.label}
          </Link>
          <button className="btn btn-outline" onClick={() => api.printBill(bill.id).catch((e) => toast(e.message, 'error'))}>
            <IPrint size={15} /> Print Bill
          </button>
          <button
            className="btn btn-outline"
            onClick={() => api.pdfBill(bill.id).then((f) => toast(`PDF saved: ${f}`)).catch((e) => toast(e.message, 'error'))}
          >
            <IDownload size={15} /> Download PDF
          </button>
          {bill.status === 'draft' && (
            <>
              <button className="btn btn-outline" onClick={() => navigate(`/bills/${bill.id}/edit`)}>
                <IEdit size={15} /> Edit Bill
              </button>
              <button className="btn btn-primary" onClick={finalize}>
                Finalize Bill
              </button>
            </>
          )}
          {bill.status === 'finalized' && bill.outstanding_amount > 0 && (
            <button className="btn btn-primary" onClick={() => setShowPay(true)}>
              <IMoney size={15} /> Collect Payment
            </button>
          )}
        </div>
      </div>

      <div className="card person-card" style={{ marginBottom: 16 }}>
        <Avatar name={patient.full_name} size={50} />
        <div className="who">
          <div className="nm">{patient.full_name}</div>
          <div className="pid">
            Patient ID: {patient.patient_code} · {ageGender(patient.age, patient.gender)}
            {patient.mobile ? ` · ${patient.mobile}` : ''}
          </div>
        </div>
        <div className="person-meta">
          <div className="m">
            <div className="l">Bill Date</div>
            <div className="v">{fmtDate(bill.bill_date)}</div>
          </div>
          <div className="m">
            <div className="l">Billed Amount</div>
            <div className="v">{money(bill.total_amount)}</div>
          </div>
          <div className="m">
            <div className="l">Paid Amount</div>
            <div className="v" style={{ color: 'var(--green-600)' }}>
              {money(bill.amount_paid)}
            </div>
          </div>
          <div className="m">
            <div className="l">Due</div>
            <div className={`v${bill.outstanding_amount > 0 ? ' red' : ''}`}>{money(bill.outstanding_amount)}</div>
          </div>
        </div>
      </div>

      <div className="grid cols-3-1" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <h3>Bill Items</h3>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th className="num">Qty</th>
                  <th className="num">Rate</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, i) => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                    <td>
                      <Badge tone="gray">{item.item_type}</Badge>
                    </td>
                    <td className="num">{item.quantity}</td>
                    <td className="num">{money(item.unit_price)}</td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {money(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="tbl-foot">Total items: {bill.items.length}</div>
          </div>
          {bill.notes && (
            <div className="card-pad" style={{ borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--muted)' }}>
              📋 {bill.notes}
            </div>
          )}
        </div>

        <div className="card card-pad" style={{ alignSelf: 'flex-start' }}>
          <h3 style={{ fontSize: 14.5, marginBottom: 8 }}>Summary</h3>
          <div className="kv">
            <span className="k">Subtotal</span>
            <span className="v">{money(bill.subtotal)}</span>
          </div>
          {bill.discount_type !== 'none' && bill.discount_value > 0 && (
            <div className="kv">
              <span className="k">
                Discount {bill.discount_type === 'percent' ? `(${bill.discount_value}%)` : ''}
              </span>
              <span className="v green">
                − {money(bill.discount_type === 'percent' ? (bill.subtotal * bill.discount_value) / 100 : bill.discount_value)}
              </span>
            </div>
          )}
          {bill.tax_amount > 0 && (
            <div className="kv">
              <span className="k">Tax</span>
              <span className="v">{money(bill.tax_amount)}</span>
            </div>
          )}
          <div className="kv total">
            <span className="k">Total Billed</span>
            <span className="v">{money(bill.total_amount)}</span>
          </div>
          <div className="kv">
            <span className="k">Total Paid</span>
            <span className="v green">{money(bill.amount_paid)}</span>
          </div>
          {bill.outstanding_amount > 0 ? (
            <div className="due-banner">
              <span>Outstanding Due</span>
              <span>{money(bill.outstanding_amount)}</span>
            </div>
          ) : (
            bill.status === 'finalized' && (
              <div className="kv">
                <span className="k">Status</span>
                <span className="v green">Fully Paid ✅</span>
              </div>
            )
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>
            <IMoney size={16} /> Invoices
          </h3>
          <span className="spacer" />
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Created when payments are recorded</span>
        </div>
        {invoices.length === 0 ? (
          <div className="empty">No invoices yet. Collect a payment to generate the first invoice.</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice No.</th>
                  <th>Mode</th>
                  <th>Reference</th>
                  <th className="num">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{fmtDate(inv.invoice_date)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green-800)' }}>{inv.invoice_number}</td>
                    <td>
                      <Badge tone="green">{inv.payment_mode}</Badge>
                    </td>
                    <td>{inv.reference_number || '—'}</td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {money(inv.amount)}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => api.printInvoice(inv.id).catch((e) => toast(e.message, 'error'))}
                      >
                        <IPrint size={14} /> Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPay && <PaymentModal bill={bill} patient={patient} onClose={() => setShowPay(false)} onSaved={load} />}
    </div>
  )
}
