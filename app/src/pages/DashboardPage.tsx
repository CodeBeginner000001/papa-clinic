import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { money, fmtDate, fmtTime, ageGender } from '../lib/format'
import { Avatar, Badge, Loading, StatCard, useSettings, Empty } from '../components/ui'
import { LineChart } from '../components/charts'
import {
  IBill,
  ICalendar,
  IMoney,
  IPatients,
  IPill,
  IReports,
  IRx,
  ISearch,
  IUserPlus,
} from '../components/icons'
import type { DashboardData } from '@shared/types'

type TrendPeriod = 'this_week' | 'last_week'

function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' })
  const month = d.toLocaleDateString('en-IN', { month: 'short' })
  return `${weekday} ${month} ${d.getDate()}`
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('this_week')
  const { settings } = useSettings()
  const navigate = useNavigate()

  useEffect(() => {
    api.getDashboard().then(setData).catch(() => {})
  }, [])

  if (!data) return <Loading />

  const trendDays = trendPeriod === 'this_week' ? data.weeklyTrend : data.lastWeekTrend
  const trendTotal = trendDays.reduce((s, d) => s + d.count, 0)
  const compareTotal = trendPeriod === 'this_week' ? data.visitsLastWeek : data.visitsThisWeek
  const compareLabel = trendPeriod === 'this_week' ? 'vs last week' : 'vs this week'
  const trendDeltaPct =
    compareTotal === 0
      ? trendTotal > 0
        ? 100
        : 0
      : Math.round(((trendTotal - compareTotal) / compareTotal) * 100)
  const trendUp = trendDeltaPct >= 0

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const firstName = settings.doctor_name.replace(/^Dr\.?\s*/i, '').split(' ')[0]

  return (
    <div>
      <div className="page-head">
        <div className="titles">
          <h1 className="page-title">Clinic Dashboard</h1>
          <p className="page-sub">
            Welcome back, Dr. {firstName}! Here's what's happening today. · {today}
          </p>
        </div>
        <div className="page-actions">
          <Link to="/patients/new" className="btn btn-primary">
            <IUserPlus size={16} /> Add Patient
          </Link>
          <Link to="/visits/new" className="btn btn-outline">
            <ICalendar size={16} /> Create Visit
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          icon={<IPatients size={21} />}
          label="Total Patients"
          value={data.totalPatients.toLocaleString('en-IN')}
          delta={`${data.patientsThisMonth} this month`}
        />
        <StatCard
          icon={<ICalendar size={21} />}
          label="Today's Visits"
          value={data.visitsToday}
          delta={`${data.visitsThisWeek} this week`}
        />
        <StatCard
          icon={<IRx size={21} />}
          label="Pending Prescriptions"
          value={data.pendingPrescriptions}
          delta={data.pendingPrescriptions > 0 ? 'Needs review' : 'All finalized'}
          deltaTone={data.pendingPrescriptions > 0 ? 'warn' : 'ok'}
        />
        <StatCard
          icon={<IMoney size={21} />}
          label="Revenue Today"
          value={money(data.collectionsToday)}
          delta={`${money(data.pendingPayments)} pending`}
          deltaTone={data.pendingPayments > 0 ? 'warn' : 'ok'}
        />
      </div>

      <div className="grid cols-3-1" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <h3>
              <ICalendar size={16} /> Today's Visits
            </h3>
            <span className="spacer" />
            <Link to="/visits">View All</Link>
          </div>
          {data.todaysVisits.length === 0 ? (
            <Empty icon={<ICalendar size={30} />} text="No visits recorded today yet." />
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Age / Gender</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.todaysVisits.map((v) => (
                    <tr key={v.id} className="click" onClick={() => navigate(`/visits/${v.id}`)}>
                      <td>{fmtTime(v.visit_time) || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <Avatar name={v.patient_name} size={28} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{v.patient_name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{v.patient_code}</div>
                          </div>
                        </div>
                      </td>
                      <td>{ageGender(v.patient_age, v.patient_gender)}</td>
                      <td>{v.chief_complaints || v.visit_type}</td>
                      <td>
                        {v.prescription_id ? (
                          <Badge tone="green">Prescribed</Badge>
                        ) : (
                          <Badge tone="blue">In Consultation</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card card-pad">
          <h3 style={{ fontSize: 14.5, marginBottom: 14 }}>⚡ Quick Actions</h3>
          <div className="quick-actions">
            <button className="qa" onClick={() => navigate('/patients/new')}>
              <IUserPlus size={19} /> Add Patient
            </button>
            <button className="qa" onClick={() => navigate('/visits/new')}>
              <ICalendar size={19} /> Create Visit
            </button>
            <button className="qa" onClick={() => navigate('/prescriptions')}>
              <IRx size={19} /> Prescriptions
            </button>
            <button className="qa" onClick={() => navigate('/billing')}>
              <IBill size={19} /> Billing
            </button>
            <button className="qa" onClick={() => navigate('/patients')}>
              <ISearch size={19} /> Patient Search
            </button>
            <button className="qa" onClick={() => navigate('/catalog')}>
              <IPill size={19} /> Catalog
            </button>
          </div>
        </div>
      </div>

      <div className="grid cols-dash-bottom">
        <div className="card">
          <div className="card-head">
            <h3>
              <IPatients size={16} /> Recent Patients
            </h3>
            <span className="spacer" />
            <Link to="/patients">View All</Link>
          </div>
          {data.recentPatients.length === 0 ? (
            <Empty icon={<IPatients size={30} />} text="No patients yet. Add your first patient to get started." />
          ) : (
            <div className="table-wrap">
              <table className="tbl tbl-nowrap">
                <tbody>
                  {data.recentPatients.map((p) => (
                    <tr key={p.id} className="click" onClick={() => navigate(`/patients/${p.id}`)}>
                      <td>
                        <div className="name-cell">
                          <Avatar name={p.full_name} size={28} />
                          <span style={{ fontWeight: 600 }}>{p.full_name}</span>
                        </div>
                      </td>
                      <td className="muted-cell">{ageGender(p.age, p.gender)}</td>
                      <td className="muted-cell date-cell">{fmtDate(p.created_at)}</td>
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
              <IReports size={16} /> Weekly Visits Trend
            </h3>
            <span className="spacer" />
            <select
              className="select trend-period"
              value={trendPeriod}
              onChange={(e) => setTrendPeriod(e.target.value as TrendPeriod)}
            >
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
            </select>
          </div>
          <div className="card-pad trend-body">
            <div className="trend-chart">
              <LineChart
                data={trendDays.map((d) => ({
                  label: dayLabel(d.date),
                  value: d.count,
                }))}
                height={200}
                showGrid
                showYAxis
              />
            </div>
            <div className="trend-summary">
              <div className="trend-summary-lbl">Total Visits</div>
              <div className="trend-summary-val">{trendTotal}</div>
              <div className={`trend-summary-delta ${trendUp ? 'up' : 'down'}`}>
                <span aria-hidden>{trendUp ? '↑' : '↓'}</span>
                {Math.abs(trendDeltaPct)}%
              </div>
              <div className="trend-summary-cmp">{compareLabel}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
