import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { money, fmtDate, todayIso } from '../lib/format'
import { Badge, Loading, StatCard, paymentTone, useToast } from '../components/ui'
import { BarChart, Donut, LineChart } from '../components/charts'
import { IBill, ICalendar, IDownload, IMoney, IPatients, IRx } from '../components/icons'
import type { ReportSummary } from '@shared/types'

type Preset =
  | '7d'
  | '30d'
  | '90d'
  | 'this_year'
  | 'last_year'
  | '2y'
  | 'all'
  | 'custom'

const PRESETS: Array<[Preset, string]> = [
  ['7d', 'Last 7 Days'],
  ['30d', 'Last 30 Days'],
  ['90d', 'Last 90 Days'],
  ['this_year', 'This Year'],
  ['last_year', 'Last Year'],
  ['2y', 'Last 2 Years'],
  ['all', 'All Time'],
  ['custom', 'Custom Range'],
]

const METHOD_COLORS = ['#16a34a', '#0ea5e9', '#f0b429', '#8b5cf6', '#ef4444', '#64748b']

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function rangeForPreset(preset: Preset): { from: string; to: string } {
  const to = todayIso()
  const y = Number(to.slice(0, 4))
  switch (preset) {
    case '7d':
      return { from: addDays(to, -6), to }
    case '30d':
      return { from: addDays(to, -29), to }
    case '90d':
      return { from: addDays(to, -89), to }
    case 'this_year':
      return { from: `${y}-01-01`, to }
    case 'last_year':
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` }
    case '2y':
      return { from: `${y - 2}-01-01`, to }
    case 'all':
      return { from: '2000-01-01', to }
    default:
      return { from: addDays(to, -29), to }
  }
}

function chartLabel(date: string, monthly: boolean): string {
  if (monthly) {
    return new Date(`${date.slice(0, 7)}-01T00:00:00`).toLocaleDateString('en-IN', {
      month: 'short',
      year: '2-digit',
    })
  }
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

const EXPORTS: Array<{ kind: 'patients' | 'visits' | 'prescriptions' | 'bills' | 'payments' | 'tests'; label: string; hint: string }> = [
  { kind: 'patients', label: 'Patients', hint: 'Registered in range' },
  { kind: 'visits', label: 'Visits', hint: 'Visit records' },
  { kind: 'prescriptions', label: 'Prescriptions', hint: 'Rx written' },
  { kind: 'bills', label: 'Bills', hint: 'Billing records' },
  { kind: 'payments', label: 'Payments', hint: 'Collections by mode' },
  { kind: 'tests', label: 'Tests', hint: 'Lab / test orders' },
]

export default function ReportsPage() {
  const [preset, setPreset] = useState<Preset>('30d')
  const [from, setFrom] = useState(() => rangeForPreset('30d').from)
  const [to, setTo] = useState(() => rangeForPreset('30d').to)
  const [data, setData] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const toast = useToast()

  const applyPreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') {
      const r = rangeForPreset(p)
      setFrom(r.from)
      setTo(r.to)
    }
  }

  useEffect(() => {
    setLoading(true)
    api
      .getReports({ from, to })
      .then(setData)
      .catch(() => toast('Failed to load reports', 'error'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to])

  const monthly = useMemo(() => {
    if (!data) return false
    const days =
      (new Date(`${data.to}T12:00:00`).getTime() - new Date(`${data.from}T12:00:00`).getTime()) / 86400000
    return days > 90
  }, [data])

  const revenueTrend = useMemo(
    () =>
      (data?.collections ?? []).map((c) => ({
        label: chartLabel(c.date, monthly),
        value: c.amount,
      })),
    [data, monthly],
  )

  const visitsTrend = useMemo(
    () =>
      (data?.visitsByDay ?? []).map((d) => ({
        label: chartLabel(d.date, monthly),
        value: d.count,
      })),
    [data, monthly],
  )

  const growthTrend = useMemo(
    () =>
      (data?.patientGrowth ?? []).map((g) => ({
        label: new Date(`${g.month}-01T00:00:00`).toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit',
        }),
        value: g.count,
      })),
    [data],
  )

  const exportExcel = async (kind: (typeof EXPORTS)[number]['kind']) => {
    try {
      const file = await api.exportReport(kind, from, to)
      if (file) toast(`Excel file saved: ${file}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Export failed', 'error')
    }
  }

  const rangeLabel = `${fmtDate(from)} – ${fmtDate(to)}`

  return (
    <div>
      <div className="page-head">
        <div className="titles">
          <h1 className="page-title">Reports Dashboard</h1>
          <p className="page-sub">Offline analytics for the selected period · {rangeLabel}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="filter-bar" style={{ alignItems: 'flex-end' }}>
          <div style={{ minWidth: 180 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 5, color: 'var(--muted)' }}>Time Period</div>
            <select className="select" value={preset} onChange={(e) => applyPreset(e.target.value as Preset)}>
              {PRESETS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 5, color: 'var(--muted)' }}>From</div>
            <input
              className="input"
              type="date"
              value={from}
              onChange={(e) => {
                setPreset('custom')
                setFrom(e.target.value)
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 5, color: 'var(--muted)' }}>To</div>
            <input
              className="input"
              type="date"
              value={to}
              onChange={(e) => {
                setPreset('custom')
                setTo(e.target.value)
              }}
            />
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              applyPreset('30d')
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {loading || !data ? (
        <Loading />
      ) : (
        <>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <StatCard
              icon={<IPatients size={20} />}
              label="Total Patients"
              value={data.totals.totalPatients.toLocaleString('en-IN')}
              delta={`+${data.totals.newPatients} new in period`}
            />
            <StatCard icon={<ICalendar size={20} />} label="Visits in Period" value={data.totals.totalVisits.toLocaleString('en-IN')} />
            <StatCard icon={<IMoney size={20} />} label="Revenue in Period" value={money(data.totals.totalRevenue)} />
            <StatCard
              icon={<IBill size={20} />}
              label="Pending Payments"
              value={
                <span style={{ color: data.totals.pendingPayments > 0 ? 'var(--red)' : undefined }}>
                  {money(data.totals.pendingPayments)}
                </span>
              }
              tone={data.totals.pendingPayments > 0 ? 'red' : 'green'}
            />
            <StatCard
              icon={<IRx size={20} />}
              label="Prescriptions"
              value={data.totals.totalPrescriptions.toLocaleString('en-IN')}
            />
          </div>

          <div className="grid cols-2" style={{ marginBottom: 16 }}>
            <div className="card">
              <div className="card-head">
                <h3>📈 Revenue Trend</h3>
                <span className="spacer" />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{monthly ? 'By month' : 'By day'}</span>
              </div>
              <div className="card-pad">
                {revenueTrend.every((d) => d.value === 0) ? (
                  <div className="empty">No payments recorded in this period.</div>
                ) : (
                  <LineChart data={revenueTrend} height={180} formatValue={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v)}`)} />
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>📊 Visits by {monthly ? 'Month' : 'Day'}</h3>
                <span className="spacer" />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{rangeLabel}</span>
              </div>
              <div className="card-pad">
                {visitsTrend.every((d) => d.value === 0) ? (
                  <div className="empty">No visits in this period.</div>
                ) : (
                  <BarChart data={visitsTrend} height={180} />
                )}
              </div>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 16 }}>
            <div className="card">
              <div className="card-head">
                <h3>🩺 Top Diagnoses</h3>
              </div>
              <div className="card-pad">
                {data.topDiagnoses.length === 0 ? (
                  <div className="empty">No diagnoses recorded in this period.</div>
                ) : (
                  data.topDiagnoses.map((d, i) => {
                    const total = data.topDiagnoses.reduce((s, x) => s + x.count, 0)
                    return (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>
                            {i + 1}. {d.name}
                          </span>
                          <span style={{ color: 'var(--muted)' }}>
                            {d.count} ({Math.round((d.count / total) * 100)}%)
                          </span>
                        </div>
                        <div style={{ height: 6, borderRadius: 99, background: 'var(--green-50)' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${(d.count / (data.topDiagnoses[0]?.count || 1)) * 100}%`,
                              borderRadius: 99,
                              background: 'var(--green-600)',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>💊 Top Medicines</h3>
              </div>
              <div className="card-pad">
                {data.medicineUsage.length === 0 ? (
                  <div className="empty">No prescriptions in this period.</div>
                ) : (
                  data.medicineUsage.slice(0, 8).map((m, i) => (
                    <div key={i} className="kv">
                      <span className="k">
                        {i + 1}. {m.name}
                      </span>
                      <span className="v">{m.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>💰 Payment Status</h3>
              </div>
              <div className="card-pad">
                {data.paymentStatus.paid + data.paymentStatus.pending === 0 ? (
                  <div className="empty">No finalized bills in this period.</div>
                ) : (
                  <Donut
                    parts={[
                      { label: `Paid ${money(data.paymentStatus.paid)}`, value: data.paymentStatus.paid, color: '#16a34a' },
                      { label: `Pending ${money(data.paymentStatus.pending)}`, value: data.paymentStatus.pending, color: '#f0b429' },
                    ]}
                    centerValue={money(data.paymentStatus.paid + data.paymentStatus.pending)}
                    centerLabel="Total Billed"
                    size={140}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="grid cols-2" style={{ marginBottom: 16 }}>
            <div className="card">
              <div className="card-head">
                <h3>💳 Payment Methods</h3>
                <span className="spacer" />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Collections by mode</span>
              </div>
              <div className="card-pad">
                {data.paymentMethods.length === 0 ? (
                  <div className="empty">No payments recorded in this period.</div>
                ) : (
                  <Donut
                    parts={data.paymentMethods.map((m, i) => ({
                      label: `${m.mode} ${money(m.amount)} (${m.count})`,
                      value: m.amount,
                      color: METHOD_COLORS[i % METHOD_COLORS.length]!,
                    }))}
                    centerValue={money(data.paymentMethods.reduce((s, m) => s + m.amount, 0))}
                    centerLabel="Collected"
                    size={150}
                  />
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>📉 Patient Growth</h3>
                <span className="spacer" />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>New patients per month</span>
              </div>
              <div className="card-pad">
                {growthTrend.every((d) => d.value === 0) ? (
                  <div className="empty">No new patients in this period.</div>
                ) : (
                  <BarChart data={growthTrend} height={170} />
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <h3>🧾 Outstanding Bills</h3>
            </div>
            {data.outstandingBills.length === 0 ? (
              <div className="empty">No outstanding bills in this period. 🎉</div>
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Bill</th>
                      <th>Patient</th>
                      <th>Date</th>
                      <th className="num">Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.outstandingBills.slice(0, 10).map((b) => (
                      <tr key={b.id} className="click" onClick={() => navigate(`/bills/${b.id}`)}>
                        <td style={{ fontWeight: 700, color: 'var(--green-800)' }}>{b.bill_number}</td>
                        <td>{b.patient_name}</td>
                        <td>{fmtDate(b.bill_date)}</td>
                        <td className="num" style={{ color: 'var(--red)', fontWeight: 700 }}>
                          {money(b.outstanding_amount)}
                        </td>
                        <td>
                          <Badge tone={paymentTone(b.payment_status)}>{b.payment_status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3>
                <IDownload size={16} /> Download Excel Reports
              </h3>
              <span className="spacer" />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Exports use the selected date range · opens in Excel</span>
            </div>
            <div className="card-pad">
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {EXPORTS.map((ex) => (
                  <button
                    key={ex.kind}
                    className="btn btn-outline"
                    style={{ justifyContent: 'flex-start', gap: 12, padding: '12px 14px', height: 'auto' }}
                    onClick={() => exportExcel(ex.kind)}
                  >
                    <IDownload size={16} />
                    <span style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700 }}>{ex.label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 400 }}>{ex.hint}</div>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
