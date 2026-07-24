import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { money, fmtDate, ageGender } from '../lib/format'
import { Avatar, Badge, Loading, StatCard, paymentTone } from '../components/ui'
import { IBill, ICalendar, IEdit, IMoney, IPlus, IRx } from '../components/icons'
import type { PatientDashboard } from '@shared/types'

export default function PatientDetailPage() {
  const { id } = useParams()
  const [data, setData] = useState<PatientDashboard | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.patientDashboard(Number(id)).then(setData).catch(() => {})
  }, [id])

  if (!data) return <Loading />
  const { patient } = data

  const timeline = [
    ...data.visits.map((v) => ({
      date: v.visit_date,
      title: 'Visit',
      sub: v.chief_complaints || v.visit_type,
      link: `/visits/${v.id}`,
    })),
    ...data.payments.map((p) => ({
      date: p.payment_date,
      title: `Payment · ${money(p.amount)}`,
      sub: p.payment_mode,
      link: `/bills/${p.bill_id}`,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 10)

  return (
    <div>
      <div className="page-head">
        <div className="titles">
          <div className="crumbs">
            <Link to="/patients">Patients</Link>
            <span className="sep">/</span>
            <span>Patient Details</span>
          </div>
          <h1 className="page-title">Patient Dashboard</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/patients/${patient.id}/visits/new`)}>
            <IPlus size={16} /> New Visit
          </button>
          <button className="btn btn-outline" onClick={() => navigate(`/patients/${patient.id}/edit`)}>
            <IEdit size={16} /> Edit
          </button>
        </div>
      </div>

      <div className="card person-card" style={{ marginBottom: 16 }}>
        <Avatar name={patient.full_name} size={62} />
        <div className="who">
          <div className="nm">{patient.full_name} ✅</div>
          <div className="pid">Patient ID: {patient.patient_code}</div>
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
            <div className="l">Blood Group</div>
            <div className="v">{patient.blood_group || '—'}</div>
          </div>
          <div className="m">
            <div className="l">Last Visit</div>
            <div className="v">{fmtDate(data.latestVisit?.visit_date ?? null)}</div>
          </div>
          <div className="m">
            <div className="l">Outstanding Amount</div>
            <div className={`v${data.outstanding > 0 ? ' red' : ''}`}>{money(data.outstanding)}</div>
          </div>
        </div>
      </div>

      {(patient.allergies || patient.medical_conditions || patient.current_medications) && (
        <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {patient.allergies && (
            <div style={{ fontSize: 13 }}>
              <span style={{ color: 'var(--red)', fontWeight: 700 }}>⚠ Allergies: </span>
              {patient.allergies}
            </div>
          )}
          {patient.medical_conditions && (
            <div style={{ fontSize: 13 }}>
              <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Chronic conditions: </span>
              {patient.medical_conditions}
            </div>
          )}
          {patient.current_medications && (
            <div style={{ fontSize: 13 }}>
              <span style={{ color: 'var(--green-800)', fontWeight: 700 }}>Current medications: </span>
              {patient.current_medications}
            </div>
          )}
        </div>
      )}

      <div className="stat-grid">
        <StatCard icon={<ICalendar size={20} />} label="Total Visits" value={data.totalVisits} />
        <StatCard icon={<IMoney size={20} />} label="Total Paid" value={money(data.totalPaid)} />
        <StatCard
          icon={<IBill size={20} />}
          label="Outstanding Balance"
          value={<span style={{ color: data.outstanding > 0 ? 'var(--red)' : undefined }}>{money(data.outstanding)}</span>}
          delta={data.outstanding > 0 ? 'Due from patient' : 'All settled'}
          deltaTone={data.outstanding > 0 ? 'bad' : 'ok'}
          tone={data.outstanding > 0 ? 'red' : 'green'}
        />
        <StatCard icon={<IRx size={20} />} label="Total Prescriptions" value={data.prescriptions.length} />
      </div>

      <div className="grid cols-3-1">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <h3>
                <ICalendar size={16} /> Visit History
              </h3>
              <span className="spacer" />
              <Link to={`/patients/${patient.id}/visits/new`}>+ Add Visit</Link>
            </div>
            {data.visits.length === 0 ? (
              <div className="empty">No visits recorded yet.</div>
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Complaint</th>
                      <th>Diagnosis</th>
                      <th>Type</th>
                      <th>Follow-up</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.visits.map((v) => (
                      <tr key={v.id} className="click" onClick={() => navigate(`/visits/${v.id}`)}>
                        <td>{fmtDate(v.visit_date)}</td>
                        <td>{v.chief_complaints || '—'}</td>
                        <td>{v.final_diagnosis || v.provisional_diagnosis || '—'}</td>
                        <td>
                          <Badge tone="gray">{v.visit_type}</Badge>
                        </td>
                        <td>{fmtDate(v.follow_up_date)}</td>
                        <td style={{ color: 'var(--green-800)', fontWeight: 600, fontSize: 12.5 }}>View →</td>
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
                <IBill size={16} /> Bills & Payments
              </h3>
            </div>
            {data.bills.length === 0 ? (
              <div className="empty">No bills created yet.</div>
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Bill No.</th>
                      <th>Date</th>
                      <th className="num">Total</th>
                      <th className="num">Paid</th>
                      <th className="num">Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bills.map((b) => (
                      <tr key={b.id} className="click" onClick={() => navigate(`/bills/${b.id}`)}>
                        <td>{b.bill_number}</td>
                        <td>{fmtDate(b.bill_date)}</td>
                        <td className="num">{money(b.total_amount)}</td>
                        <td className="num">{money(b.amount_paid)}</td>
                        <td className="num" style={{ color: b.outstanding_amount > 0 ? 'var(--red)' : undefined, fontWeight: 700 }}>
                          {money(b.outstanding_amount)}
                        </td>
                        <td>
                          <Badge tone={b.status === 'draft' ? 'gray' : paymentTone(b.payment_status)}>
                            {b.status === 'draft' ? 'Draft' : b.payment_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad">
            <h3 style={{ fontSize: 14.5, marginBottom: 6 }}>💰 Billing Summary</h3>
            <div className="kv">
              <span className="k">Total Billed</span>
              <span className="v">{money(data.totalBilled)}</span>
            </div>
            <div className="kv">
              <span className="k">Total Paid</span>
              <span className="v green">{money(data.totalPaid)}</span>
            </div>
            {data.outstanding > 0 ? (
              <div className="due-banner">
                <span>Due Amount</span>
                <span>{money(data.outstanding)}</span>
              </div>
            ) : (
              <div className="kv total">
                <span className="k">Due Amount</span>
                <span className="v green">{money(0)}</span>
              </div>
            )}
            {data.nextFollowUp && (
              <div className="kv">
                <span className="k">Next Follow-up</span>
                <span className="v">{fmtDate(data.nextFollowUp)}</span>
              </div>
            )}
          </div>

          <div className="card card-pad">
            <h3 style={{ fontSize: 14.5, marginBottom: 14 }}>🕐 Visit Timeline</h3>
            {timeline.length === 0 ? (
              <div className="empty">Timeline will appear as records are added.</div>
            ) : (
              <div className="timeline">
                {timeline.map((t, i) => (
                  <div key={i} className="tl-item">
                    <div className="d">{fmtDate(t.date)}</div>
                    <Link to={t.link}>
                      <div className="t">{t.title}</div>
                    </Link>
                    <div className="s">{t.sub}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
