import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { money, fmtDate, ageGender } from '../lib/format'
import { Avatar, Badge, Loading, paymentTone, useToast } from '../components/ui'
import { IBill, IMoney, IPrint } from '../components/icons'
import type { Bill, BillItem, Invoice, Patient, Visit } from '@shared/types'

type CombinedItem = BillItem & { bill_id: number; bill_number: string }

interface VisitBillingSummary {
  visit_id: number
  patient_id: number
  bills: Bill[]
  items: CombinedItem[]
  invoices: Invoice[]
  totals: { billed: number; paid: number; outstanding: number }
}

export default function VisitBillingPage() {
  const { visitId } = useParams()
  const [summary, setSummary] = useState<VisitBillingSummary | null>(null)
  const [visit, setVisit] = useState<Visit | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const navigate = useNavigate()
  const toast = useToast()

  const load = useCallback(() => {
    const id = Number(visitId)
    api
      .getVisitBillingSummary(id)
      .then((s: VisitBillingSummary) => {
        setSummary(s)
        return Promise.all([api.getVisit(id), api.getPatient(s.patient_id)])
      })
      .then(([v, p]) => {
        setVisit(v)
        setPatient(p)
      })
      .catch((err) => toast(err instanceof Error ? err.message : 'Failed to load billing', 'error'))
  }, [visitId, toast])

  useEffect(() => {
    load()
  }, [load])

  if (!summary || !visit || !patient) return <Loading />

  const unpaid = summary.bills.find((b) => b.payment_status !== 'Paid' && b.status !== 'cancelled') ?? null
  const overallStatus =
    summary.totals.outstanding <= 0.009 && summary.totals.paid > 0
      ? 'Paid'
      : summary.totals.paid > 0
        ? 'Partially paid'
        : 'Unpaid'

  return (
    <div>
      <div className="page-head">
        <div className="titles">
          <div className="crumbs">
            <Link to="/patients">Patients</Link>
            <span className="sep">/</span>
            <Link to={`/patients/${patient.id}`}>{patient.full_name}</Link>
            <span className="sep">/</span>
            <Link to={`/visits/${visit.id}`}>Visit</Link>
            <span className="sep">/</span>
            <span>Billing</span>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            Visit Billing
            <Badge tone={paymentTone(overallStatus)}>{overallStatus}</Badge>
          </h1>
          <p className="page-sub">
            Combined charges for visit {visit.visit_code} · {summary.bills.length} bill
            {summary.bills.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="page-actions">
          <Link to={`/visits/${visit.id}`} className="btn btn-outline">
            ← Back to Visit
          </Link>
          {summary.bills.length === 1 && (
            <button
              className="btn btn-outline"
              onClick={() =>
                api.printBill(summary.bills[0].id).catch((e) => toast(e instanceof Error ? e.message : 'Print failed', 'error'))
              }
            >
              <IPrint size={15} /> Print Bill
            </button>
          )}
          {unpaid && unpaid.outstanding_amount > 0 && (
            <button className="btn btn-primary" onClick={() => navigate(`/bills/${unpaid.id}?pay=1`)}>
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
            <div className="l">Visit Date</div>
            <div className="v">{fmtDate(visit.visit_date)}</div>
          </div>
          <div className="m">
            <div className="l">Total Billed</div>
            <div className="v">{money(summary.totals.billed)}</div>
          </div>
          <div className="m">
            <div className="l">Total Paid</div>
            <div className="v" style={{ color: 'var(--green-600)' }}>
              {money(summary.totals.paid)}
            </div>
          </div>
          <div className="m">
            <div className="l">Outstanding</div>
            <div className={`v${summary.totals.outstanding > 0 ? ' red' : ''}`}>
              {money(summary.totals.outstanding)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid cols-3-1" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <h3>All Bill Items</h3>
          </div>
          {summary.items.length === 0 ? (
            <div className="empty">No bill items for this visit.</div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Type</th>
                    <th>Bill No.</th>
                    <th className="num">Qty</th>
                    <th className="num">Rate</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.items.map((item, i) => (
                    <tr key={`${item.bill_id}-${item.id}`}>
                      <td style={{ color: 'var(--muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                      <td>
                        <Badge tone="gray">{item.item_type}</Badge>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/bills/${item.bill_id}`)}>
                          {item.bill_number}
                        </button>
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
              <div className="tbl-foot">Total items: {summary.items.length}</div>
            </div>
          )}
        </div>

        <div className="card card-pad" style={{ alignSelf: 'flex-start' }}>
          <h3 style={{ fontSize: 14.5, marginBottom: 8 }}>Summary</h3>
          <div className="kv">
            <span className="k">Bills</span>
            <span className="v">{summary.bills.length}</span>
          </div>
          <div className="kv total">
            <span className="k">Total Billed</span>
            <span className="v">{money(summary.totals.billed)}</span>
          </div>
          <div className="kv">
            <span className="k">Total Paid</span>
            <span className="v green">{money(summary.totals.paid)}</span>
          </div>
          {summary.totals.outstanding > 0 ? (
            <div className="due-banner">
              <span>Outstanding Due</span>
              <span>{money(summary.totals.outstanding)}</span>
            </div>
          ) : (
            summary.totals.paid > 0 && (
              <div className="kv">
                <span className="k">Status</span>
                <span className="v green">Fully Paid ✅</span>
              </div>
            )
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h3>
            <IBill size={16} /> Bills
          </h3>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Bill No.</th>
                <th>Date</th>
                <th>Status</th>
                <th className="num">Total</th>
                <th className="num">Paid</th>
                <th className="num">Due</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {summary.bills.map((b) => (
                <tr key={b.id} className="click" onClick={() => navigate(`/bills/${b.id}`)}>
                  <td style={{ fontWeight: 700, color: 'var(--green-800)' }}>{b.bill_number}</td>
                  <td>{fmtDate(b.bill_date)}</td>
                  <td>
                    <Badge tone={b.status === 'draft' ? 'gray' : paymentTone(b.payment_status)}>
                      {b.status === 'draft' ? 'Draft' : b.payment_status}
                    </Badge>
                  </td>
                  <td className="num">{money(b.total_amount)}</td>
                  <td className="num" style={{ color: 'var(--green-600)' }}>
                    {money(b.amount_paid)}
                  </td>
                  <td className={`num${b.outstanding_amount > 0 ? ' red' : ''}`}>{money(b.outstanding_amount)}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/bills/${b.id}`)
                      }}
                    >
                      Open
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        api.printBill(b.id).catch((err) => toast(err instanceof Error ? err.message : 'Print failed', 'error'))
                      }}
                    >
                      <IPrint size={14} /> Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        {summary.invoices.length === 0 ? (
          <div className="empty">No invoices yet for this visit.</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice No.</th>
                  <th>Mode</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{fmtDate(inv.invoice_date)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green-800)' }}>{inv.invoice_number}</td>
                    <td>
                      <Badge tone="green">{inv.payment_mode}</Badge>
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {money(inv.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
