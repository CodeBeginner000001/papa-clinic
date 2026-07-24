import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { money, fmtDate, fmtTime, ageGender } from '../lib/format'
import { Avatar, Badge, Field, Loading, Modal, useSettings, useToast } from '../components/ui'
import { TestWorkflowActions, fmtScheduledAt, testStatusTone } from '../components/TestWorkflow'
import { IEdit, IFlask, IPlus, IRx, IBill, ITrash, IVitals } from '../components/icons'
import type {
  Bill,
  Patient,
  Prescription,
  PrescriptionMedicine,
  ProcedureItem,
  TestItem,
  Visit,
  VisitProcedure,
  VisitTest,
  VisitVitals,
} from '@shared/types'

interface TestRow {
  id?: number
  testId: number | null
  testName: string
  source: 'clinic' | 'outside'
  charge: number
  notes: string
  status: string
  locked: boolean
  paid: boolean
}

function emptyTestRow(): TestRow {
  return {
    testId: null,
    testName: '',
    source: 'clinic',
    charge: 0,
    notes: '',
    status: 'Advised',
    locked: false,
    paid: false,
  }
}

interface ServiceRow {
  id?: number
  procedureId: number | null
  procedureName: string
  quantity: number
  unitPrice: number
  notes: string
  paid: boolean
}

function emptyServiceRow(): ServiceRow {
  return {
    procedureId: null,
    procedureName: '',
    quantity: 1,
    unitPrice: 0,
    notes: '',
    paid: false,
  }
}

function TestsModal({
  visitId,
  initial,
  onClose,
  onSaved,
}: {
  visitId: number
  initial: VisitTest[]
  onClose: () => void
  onSaved: () => void
}) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<TestRow[]>(
    initial.length
      ? initial.map((t) => ({
          id: t.id,
          testId: t.test_id,
          testName: t.test_name_snapshot,
          source: t.source === 'outside' ? 'outside' : 'clinic',
          charge: t.charge,
          notes: t.notes ?? '',
          status: t.status,
          locked: t.status !== 'Advised',
          paid: false,
        }))
      : [emptyTestRow()],
  )
  const [catalog, setCatalog] = useState<TestItem[]>([])
  const [paidReady, setPaidReady] = useState(false)
  const toast = useToast()

  useEffect(() => {
    api.listTests().then(setCatalog)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const flags = await Promise.all(
        initial.map(async (t) => (t.source === 'clinic' ? api.isVisitTestPaid(t.id) : false)),
      )
      if (cancelled) return
      setRows((prev) =>
        prev.map((r) => {
          const idx = initial.findIndex((t) => t.id === r.id)
          return idx >= 0 ? { ...r, paid: Boolean(flags[idx]) } : r
        }),
      )
      setPaidReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [initial])

  const update = (i: number, patch: Partial<TestRow>) => {
    if (rows[i]?.locked || rows[i]?.paid) return
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  const refund = async (row: TestRow) => {
    if (!row.id) return
    if (!window.confirm(`Refund payment for “${row.testName}”? This reverts the payment and removes the test.`)) {
      return
    }
    try {
      await api.refundVisitTest(row.id)
      toast('Test refunded — payment reverted')
      onSaved()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Refund failed', 'error')
    }
  }

  const save = async () => {
    try {
      const result = await api.setVisitTests(
        visitId,
        rows
          .filter((r) => r.testName.trim())
          .map((r) => ({
            id: r.id,
            testId: r.testId,
            testName: r.testName,
            source: r.source,
            charge: r.source === 'clinic' ? r.charge : 0,
            notes: r.notes || undefined,
          })),
      )
      onSaved()
      onClose()
      const sync = result?.sync as { updatedBillIds?: number[]; cancelledBillIds?: number[] } | undefined
      const billing = result?.billing as
        | { bill: Bill; clinicTestCount: number; collectPayment: boolean; message?: string }
        | null
        | undefined
      if (billing?.collectPayment) {
        toast(
          billing.message ||
            `Bill ready for ${billing.clinicTestCount} clinic test${billing.clinicTestCount === 1 ? '' : 's'} — collect payment`,
        )
        navigate(`/bills/${billing.bill.id}?pay=1`)
      } else if (sync?.updatedBillIds?.length || sync?.cancelledBillIds?.length) {
        toast('Tests saved — bill and payments updated for removed tests')
      } else if (billing?.message) {
        toast(billing.message)
      } else if (billing?.bill) {
        toast(`Bill updated for ${billing.clinicTestCount} clinic test${billing.clinicTestCount === 1 ? '' : 's'}`)
      } else {
        toast('Test orders saved')
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save tests', 'error')
    }
  }

  return (
    <Modal
      title="Tests for this visit"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!paidReady}>
            Save Tests
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((row, i) => (
          <div
            key={row.id ?? `new-${i}`}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 12,
              opacity: row.locked || row.paid ? 0.85 : 1,
              background: row.paid ? 'var(--bg-soft, #f8faf9)' : undefined,
            }}
          >
            <div
              className="form-grid tests-modal-row"
              style={{
                gridTemplateColumns: '2fr 1.1fr 0.9fr auto',
                alignItems: 'end',
              }}
            >
              <Field label={i === 0 ? 'Test Name' : ''}>
                <input
                  className="input"
                  list={row.locked || row.paid ? undefined : 'test-catalog'}
                  value={row.testName}
                  placeholder="Select or type test"
                  disabled={row.locked || row.paid}
                  title={
                    row.paid
                      ? 'Paid — use Refund to revert'
                      : row.locked
                        ? `Locked — status is ${row.status}`
                        : undefined
                  }
                  onChange={(e) => {
                    const found = catalog.find((c) => c.name === e.target.value)
                    update(i, {
                      testName: e.target.value,
                      testId: found?.id ?? null,
                      charge:
                        row.source === 'clinic' && found && !row.charge ? found.default_price : row.charge,
                      notes: row.notes || found?.description || '',
                    })
                  }}
                />
              </Field>
              <Field label={i === 0 ? 'Source' : ''}>
                <select
                  className="select"
                  value={row.source}
                  disabled={row.locked || row.paid}
                  onChange={(e) => {
                    const source = e.target.value === 'outside' ? 'outside' : 'clinic'
                    const found = catalog.find((c) => c.id === row.testId || c.name === row.testName)
                    update(i, {
                      source,
                      charge: source === 'outside' ? 0 : row.charge || found?.default_price || 0,
                    })
                  }}
                >
                  <option value="clinic">Clinic</option>
                  <option value="outside">Outside</option>
                </select>
              </Field>
              <Field label={i === 0 ? 'Charge' : ''}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={row.charge}
                  disabled={row.locked || row.paid || row.source === 'outside'}
                  title={
                    row.paid
                      ? 'Paid — use Refund to revert'
                      : row.locked
                        ? `Locked — status is ${row.status}`
                        : row.source === 'outside'
                          ? 'Outside tests are not billed'
                          : undefined
                  }
                  onChange={(e) => update(i, { charge: Number(e.target.value) })}
                />
              </Field>
              {row.paid ? (
                <button className="btn btn-outline btn-sm" onClick={() => refund(row)} title="Refund payment">
                  Refund
                </button>
              ) : row.locked ? (
                <Badge tone={testStatusTone(row.status as VisitTest['status'])}>{row.status}</Badge>
              ) : (
                <button
                  className="btn btn-danger btn-icon"
                  onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                  title="Remove"
                >
                  <ITrash size={15} />
                </button>
              )}
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label="Description / Details">
                <textarea
                  className="textarea"
                  rows={2}
                  value={row.notes}
                  disabled={row.locked || row.paid}
                  placeholder="Doctor notes or details for this test…"
                  onChange={(e) => update(i, { notes: e.target.value })}
                />
              </Field>
            </div>
          </div>
        ))}
        <datalist id="test-catalog">
          {catalog.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
          New tests start as <strong>Advised</strong>. Paid clinic tests cannot be deleted — use{' '}
          <strong>Refund</strong> to revert the payment.
        </p>
        <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setRows([...rows, emptyTestRow()])}>
          + Add Test Row
        </button>
      </div>
    </Modal>
  )
}

function ServicesModal({
  visitId,
  initial,
  onClose,
  onSaved,
}: {
  visitId: number
  initial: VisitProcedure[]
  onClose: () => void
  onSaved: () => void
}) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<ServiceRow[]>(
    initial.length
      ? initial.map((p) => ({
          id: p.id,
          procedureId: p.procedure_id,
          procedureName: p.procedure_name_snapshot,
          quantity: p.quantity,
          unitPrice: p.unit_price,
          notes: p.notes ?? '',
          paid: false,
        }))
      : [emptyServiceRow()],
  )
  const [catalog, setCatalog] = useState<ProcedureItem[]>([])
  const [paidReady, setPaidReady] = useState(false)
  const toast = useToast()

  useEffect(() => {
    api.listProcedures().then(setCatalog)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const flags = await Promise.all(initial.map((p) => api.isVisitProcedurePaid(p.id)))
      if (cancelled) return
      setRows((prev) =>
        prev.map((r) => {
          const idx = initial.findIndex((p) => p.id === r.id)
          return idx >= 0 ? { ...r, paid: Boolean(flags[idx]) } : r
        }),
      )
      setPaidReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [initial])

  const update = (i: number, patch: Partial<ServiceRow>) => {
    if (rows[i]?.paid) return
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  const refund = async (row: ServiceRow) => {
    if (!row.id) return
    if (!window.confirm(`Refund payment for “${row.procedureName}”? This reverts the payment and removes the service.`)) {
      return
    }
    try {
      await api.refundVisitProcedure(row.id)
      toast('Service refunded — payment reverted')
      onSaved()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Refund failed', 'error')
    }
  }

  const save = async () => {
    try {
      const result = await api.setVisitProcedures(
        visitId,
        rows
          .filter((r) => r.procedureName.trim())
          .map((r) => ({
            id: r.id,
            procedureId: r.procedureId,
            procedureName: r.procedureName,
            quantity: r.quantity,
            unitPrice: r.unitPrice,
            notes: r.notes || undefined,
          })),
      )
      onSaved()
      onClose()
      const billing = result?.billing as
        | { bill: Bill; procedureCount: number; collectPayment: boolean; message?: string }
        | null
        | undefined
      if (billing?.collectPayment) {
        toast(
          billing.message ||
            `Bill ready for ${billing.procedureCount} service${billing.procedureCount === 1 ? '' : 's'} — collect payment`,
        )
        navigate(`/bills/${billing.bill.id}?pay=1`)
      } else if (billing?.message) {
        toast(billing.message)
      } else if (billing?.bill) {
        toast(`Bill updated for ${billing.procedureCount} service${billing.procedureCount === 1 ? '' : 's'}`)
      } else {
        toast('Services saved')
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save services', 'error')
    }
  }

  return (
    <Modal
      title="Services for this visit"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!paidReady}>
            Save Services
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((row, i) => (
          <div
            key={row.id ?? `new-${i}`}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 12,
              opacity: row.paid ? 0.85 : 1,
              background: row.paid ? 'var(--bg-soft, #f8faf9)' : undefined,
            }}
          >
            <div
              className="form-grid"
              style={{ gridTemplateColumns: '2fr 0.7fr 0.9fr auto', alignItems: 'end' }}
            >
              <Field label={i === 0 ? 'Service Name' : ''}>
                <input
                  className="input"
                  list={row.paid ? undefined : 'service-catalog'}
                  value={row.procedureName}
                  placeholder="Select or type service"
                  disabled={row.paid}
                  onChange={(e) => {
                    const found = catalog.find((c) => c.name === e.target.value)
                    update(i, {
                      procedureName: e.target.value,
                      procedureId: found?.id ?? null,
                      unitPrice: found && !row.unitPrice ? found.default_price : row.unitPrice,
                      notes: row.notes || found?.description || '',
                    })
                  }}
                />
              </Field>
              <Field label={i === 0 ? 'Qty' : ''}>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={row.quantity}
                  disabled={row.paid}
                  onChange={(e) => update(i, { quantity: Number(e.target.value) || 1 })}
                />
              </Field>
              <Field label={i === 0 ? 'Charge' : ''}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={row.unitPrice}
                  disabled={row.paid}
                  onChange={(e) => update(i, { unitPrice: Number(e.target.value) })}
                />
              </Field>
              {row.paid ? (
                <button className="btn btn-outline btn-sm" onClick={() => refund(row)}>
                  Refund
                </button>
              ) : (
                <button
                  className="btn btn-danger btn-icon"
                  onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                  title="Remove"
                >
                  <ITrash size={15} />
                </button>
              )}
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label="Description / Details">
                <textarea
                  className="textarea"
                  rows={2}
                  value={row.notes}
                  disabled={row.paid}
                  placeholder="Details for this service…"
                  onChange={(e) => update(i, { notes: e.target.value })}
                />
              </Field>
            </div>
          </div>
        ))}
        <datalist id="service-catalog">
          {catalog.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
          Services are billed like clinic tests. Paid services cannot be deleted — use <strong>Refund</strong>.
        </p>
        <button
          className="btn btn-outline btn-sm"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setRows([...rows, emptyServiceRow()])}
        >
          + Add Service Row
        </button>
      </div>
    </Modal>
  )
}

export default function VisitDetailPage() {
  const { visitId } = useParams()
  const [visit, setVisit] = useState<Visit | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [vitals, setVitals] = useState<VisitVitals | null>(null)
  const [rx, setRx] = useState<(Prescription & { medicines: PrescriptionMedicine[] }) | null>(null)
  const [tests, setTests] = useState<VisitTest[]>([])
  const [services, setServices] = useState<VisitProcedure[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [billingTotals, setBillingTotals] = useState({ billed: 0, paid: 0, outstanding: 0 })
  const [leftoverCount, setLeftoverCount] = useState(0)
  const [showTests, setShowTests] = useState(false)
  const [showServices, setShowServices] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const { settings } = useSettings()

  const load = useCallback(() => {
    const id = Number(visitId)
    api.getVisit(id).then((v: Visit | null) => {
      setVisit(v)
      if (v) api.getPatient(v.patient_id).then(setPatient)
    })
    api.getVitals(id).then(setVitals)
    api.getPrescriptionByVisit(id).then(setRx)
    api.getVisitTests(id).then(setTests)
    api.getVisitProcedures(id).then(setServices)
    api
      .getVisitBillingSummary(id)
      .then((s: { bills: Bill[]; totals: { billed: number; paid: number; outstanding: number } }) => {
        setBills(s.bills ?? [])
        setBillingTotals({
          billed: Number(s.totals?.billed ?? 0),
          paid: Number(s.totals?.paid ?? 0),
          outstanding: Number(s.totals?.outstanding ?? 0),
        })
      })
      .catch(() => {
        setBills([])
        setBillingTotals({ billed: 0, paid: 0, outstanding: 0 })
        api.listBillsForVisit(id).then((rows: Bill[]) => {
          setBills(rows)
          setBillingTotals({
            billed: rows.reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0),
            paid: rows.reduce((sum, b) => sum + Number(b.amount_paid ?? 0), 0),
            outstanding: rows.reduce((sum, b) => sum + Number(b.outstanding_amount ?? 0), 0),
          })
        })
      })
    api
      .getVisitLeftoverBillItems(id)
      .then((items: unknown[]) => setLeftoverCount(Array.isArray(items) ? items.length : 0))
      .catch(() => setLeftoverCount(0))
  }, [visitId])

  useEffect(() => {
    load()
  }, [load])

  if (!visit || !patient) return <Loading />

  const billedTotal = billingTotals.billed
  const outstandingTotal = billingTotals.outstanding
  const paidTotal = billingTotals.paid
  const unpaidBill = bills.find((b) => b.payment_status !== 'Paid' && b.status !== 'cancelled') ?? null
  const bill = unpaidBill ?? bills[0] ?? null
  const canGenerateBill = leftoverCount > 0
  const billAction: 'generate' | 'view' | null = canGenerateBill
    ? 'generate'
    : bills.length > 0
      ? 'view'
      : null

  const openBill = () => {
    if (billAction === 'view') {
      if (bills.length === 1) {
        navigate(`/bills/${bills[0].id}`, { state: { from: `/visits/${visit.id}` } })
        return
      }
      navigate(`/visits/${visit.id}/billing`)
      return
    }
    if (billAction === 'generate') {
      navigate(`/bills/new?patient=${patient.id}&visit=${visit.id}`)
      return
    }
    toast('Nothing to bill for this visit yet', 'error')
  }

  const del = async () => {
    if (!window.confirm('Delete this visit? This cannot be undone.')) return
    try {
      await api.deleteVisit(visit.id)
      toast('Visit deleted')
      navigate(`/patients/${patient.id}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Cannot delete visit', 'error')
    }
  }

  const vitalCells = [
    ['Temperature', vitals?.temperature, '°F'],
    ['Blood Pressure', vitals?.systolic_bp && vitals?.diastolic_bp ? `${vitals.systolic_bp}/${vitals.diastolic_bp}` : null, 'mmHg'],
    ['Pulse', vitals?.pulse, 'bpm'],
    ['Resp. Rate', vitals?.respiratory_rate, 'breaths/min'],
    ['SpO₂', vitals?.oxygen_saturation, '%'],
    ['Weight', vitals?.weight, 'kg'],
    ['Blood Sugar', vitals?.blood_sugar, 'mg/dL'],
  ].filter(([, v]) => v) as Array<[string, string, string]>

  return (
    <div>
      <div className="page-head">
        <div className="titles">
          <div className="crumbs">
            <Link to="/patients">Patients</Link>
            <span className="sep">/</span>
            <Link to={`/patients/${patient.id}`}>{patient.full_name}</Link>
            <span className="sep">/</span>
            <span>Visit Details</span>
          </div>
          <h1 className="page-title">Visit Details ✅</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={() => navigate(`/visits/${visit.id}/edit`)}>
            <IEdit size={15} /> Edit Visit
          </button>
          <button className="btn btn-outline" onClick={() => navigate(`/visits/${visit.id}/prescription`)}>
            <IRx size={15} /> {rx ? 'Edit Prescription' : 'Create Prescription'}
          </button>
          <button className="btn btn-outline" onClick={() => setShowTests(true)}>
            <IFlask size={15} /> {tests.length ? 'Edit Tests' : 'Add Test'}
          </button>
          <button className="btn btn-outline" onClick={() => setShowServices(true)}>
            <IPlus size={15} /> {services.length ? 'Edit Services' : 'Add Service'}
          </button>
          {billAction && (
            <button className="btn btn-outline" onClick={openBill}>
              <IBill size={15} /> {billAction === 'view' ? 'View Bill' : 'Generate Bill'}
            </button>
          )}
          <button className="btn btn-danger" onClick={del}>
            <ITrash size={15} />
          </button>
        </div>
      </div>

      <div className="card person-card" style={{ marginBottom: 16 }}>
        <Avatar name={patient.full_name} size={54} />
        <div className="who">
          <div className="nm">{patient.full_name}</div>
          <div className="pid">
            Patient ID: {patient.patient_code} · Visit {visit.visit_code}
          </div>
        </div>
        <div className="person-meta">
          <div className="m">
            <div className="l">Age / Gender</div>
            <div className="v">{ageGender(patient.age, patient.gender)}</div>
          </div>
          <div className="m">
            <div className="l">Phone</div>
            <div className="v phone">{patient.mobile || '—'}</div>
          </div>
          <div className="m">
            <div className="l">Visit Date</div>
            <div className="v">
              {fmtDate(visit.visit_date)}
              {visit.visit_time ? ` · ${fmtTime(visit.visit_time)}` : ''}
            </div>
          </div>
          <div className="m">
            <div className="l">Doctor</div>
            <div className="v">{settings.doctor_name}</div>
          </div>
        </div>
      </div>

      <div className="visit-summary-grid">
        <div className="card card-pad">
          <h3 style={{ fontSize: 14, marginBottom: 10 }}>💬 Chief Complaint</h3>
          <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>{visit.chief_complaints || '—'}</p>
          {visit.symptoms && (
            <>
              <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Symptoms</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{visit.symptoms}</p>
            </>
          )}
          {visit.symptom_duration && (
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>Duration: {visit.symptom_duration}</p>
          )}
          {visit.examination_findings && (
            <>
              <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Examination Findings</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{visit.examination_findings}</p>
            </>
          )}
        </div>

        <div className="card card-pad">
          <h3 style={{ fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
            <IVitals size={16} /> Vitals
          </h3>
          {vitalCells.length === 0 ? (
            <div className="empty">No vitals recorded.</div>
          ) : (
            <div className="vitals-tiles">
              {vitalCells.map(([label, value, unit]) => (
                <div key={label} className="vital-tile">
                  <div className="lbl">{label}</div>
                  <div className="val">{value}</div>
                  <div className="unit">{unit}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <h3 style={{ fontSize: 14, marginBottom: 10 }}>🩺 Diagnosis</h3>
          <p style={{ fontSize: 13.5, fontWeight: 600 }}>
            {visit.final_diagnosis || visit.provisional_diagnosis || '—'}
            {!visit.final_diagnosis && visit.provisional_diagnosis && (
              <span style={{ color: 'var(--muted)', fontWeight: 400 }}> (Provisional)</span>
            )}
          </p>
          {visit.doctor_notes && (
            <>
              <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>📝 Notes</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{visit.doctor_notes}</p>
            </>
          )}
          {visit.advice && (
            <>
              <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>✅ Advice / Plan</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{visit.advice}</p>
            </>
          )}
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', gap: 30, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Consultation Type</div>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 3 }}>{visit.visit_type}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Visit Status</div>
          <div style={{ marginTop: 4 }}>
            <Badge tone="green">Completed</Badge>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Follow-up</div>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 3 }}>{fmtDate(visit.follow_up_date)}</div>
        </div>
      </div>

      <div className="visit-actions-grid">
        <div className="card card-pad">
          <h3 style={{ fontSize: 13.5, marginBottom: 10 }}>℞ Prescription</h3>
          <div className="kv">
            <span className="k">Medicines</span>
            <span className="v">{rx?.medicines.length ?? 0}</span>
          </div>
          <div className="kv">
            <span className="k">Status</span>
            <span className="v">{rx ? 'Saved' : 'Not created'}</span>
          </div>
          <button className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: 10 }} onClick={() => navigate(`/visits/${visit.id}/prescription`)}>
            {rx ? 'Edit Prescription ↗' : 'Create Prescription'}
          </button>
        </div>
        <div className="card card-pad">
          <h3 style={{ fontSize: 13.5, marginBottom: 10 }}>🧪 Tests Ordered</h3>
          <div className="kv">
            <span className="k">Tests Ordered</span>
            <span className="v">{tests.length}</span>
          </div>
          <div className="kv">
            <span className="k">Pending Results</span>
            <span className="v">{tests.filter((t) => t.status !== 'Completed' && t.status !== 'Result received' && t.status !== 'Cancelled').length}</span>
          </div>
          <button className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: 10 }} onClick={() => setShowTests(true)}>
            {tests.length ? 'View Tests ↗' : 'Add Tests'}
          </button>
        </div>
        <div className="card card-pad">
          <h3 style={{ fontSize: 13.5, marginBottom: 10 }}>🧾 Bill</h3>
          <div className="kv">
            <span className="k">Total Billed</span>
            <span className="v">{money(billedTotal)}</span>
          </div>
          <div className="kv">
            <span className="k">Outstanding</span>
            <span className={`v${outstandingTotal > 0 ? ' red' : ''}`}>{money(outstandingTotal)}</span>
          </div>
          {billAction ? (
            <button className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: 10 }} onClick={openBill}>
              {billAction === 'view' ? 'View Bill ↗' : 'Generate Bill'}
            </button>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>No billable items yet</p>
          )}
        </div>
        <div className="card card-pad">
          <h3 style={{ fontSize: 13.5, marginBottom: 10 }}>💵 Payments</h3>
          <div className="kv">
            <span className="k">Total Paid</span>
            <span className="v green">{money(paidTotal)}</span>
          </div>
          <div className="kv">
            <span className="k">Due Amount</span>
            <span className={`v${outstandingTotal > 0 ? ' red' : ''}`}>{money(outstandingTotal)}</span>
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ width: '100%', marginTop: 10 }}
            disabled={!bill || bill.outstanding_amount <= 0}
            onClick={() => bill && navigate(`/bills/${bill.id}?pay=1`)}
          >
            Collect Payment ↗
          </button>
        </div>
      </div>

      {services.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h3>
              <IPlus size={16} /> Services
            </h3>
            <span className="spacer" />
            <button className="btn btn-outline btn-sm" onClick={() => setShowServices(true)}>
              <IEdit size={13} /> Edit
            </button>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Service</th>
                  <th className="num">Qty</th>
                  <th className="num">Charge</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.procedure_name_snapshot}</td>
                    <td className="num">{s.quantity}</td>
                    <td className="num">{money(s.total)}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{s.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tests.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h3>
              <IFlask size={16} /> Test Orders & Results
            </h3>
            <span className="spacer" />
            <button className="btn btn-outline btn-sm" onClick={() => setShowTests(true)}>
              <IEdit size={13} /> Edit
            </button>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Scheduled</th>
                  <th className="num">Charge</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.test_name_snapshot}</td>
                    <td>
                      <Badge tone={t.source === 'outside' ? 'gray' : 'green'}>
                        {t.source === 'outside' ? 'Outside' : 'Clinic'}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={testStatusTone(t.status)}>{t.status}</Badge>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {fmtScheduledAt(t.scheduled_at)}
                    </td>
                    <td className="num">{t.source === 'outside' ? '—' : money(t.charge)}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--muted)', maxWidth: 220 }}>{t.notes || '—'}</td>
                    <td>
                      <TestWorkflowActions test={t} onChanged={load} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showTests && <TestsModal visitId={visit.id} initial={tests} onClose={() => setShowTests(false)} onSaved={load} />}
      {showServices && (
        <ServicesModal visitId={visit.id} initial={services} onClose={() => setShowServices(false)} onSaved={load} />
      )}
    </div>
  )
}
