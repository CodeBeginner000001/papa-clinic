import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { money, fmtDate, fmtTime, todayIso, inDateRange, DATE_RANGES, type DateRange } from '../lib/format'
import { Avatar, Badge, Loading, paymentTone, StatCard, useToast } from '../components/ui'
import { RowMenu, menuCoordsFromEvent } from '../components/RowMenu'
import { ICalendar, IClock, IEdit, IEye, IMoney, IMore, IPlus, IRx, ISearch, ITrash } from '../components/icons'
import type { VisitListItem } from '@shared/types'

type Filter = 'all' | 'today' | 'rx' | 'norx' | 'due'
type OpenMenu = { id: number; top: number; left: number }

export default function VisitsPage() {
  const [visits, setVisits] = useState<VisitListItem[] | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [range, setRange] = useState<DateRange>('all')
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null)
  const navigate = useNavigate()
  const toast = useToast()

  const load = () => api.listVisits(query).then(setVisits).catch(() => {})

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const today = todayIso()
  const inRange = useMemo(() => (visits ?? []).filter((v) => inDateRange(v.visit_date, range)), [visits, range])

  const counts = useMemo(() => {
    return {
      all: inRange.length,
      today: inRange.filter((v) => v.visit_date.slice(0, 10) === today).length,
      rx: inRange.filter((v) => v.prescription_id).length,
      norx: inRange.filter((v) => !v.prescription_id).length,
      due: inRange.filter((v) => v.bill_payment_status && v.bill_payment_status !== 'Paid' && v.bill_payment_status !== 'Cancelled').length,
    }
  }, [inRange, today])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'today':
        return inRange.filter((v) => v.visit_date.slice(0, 10) === today)
      case 'rx':
        return inRange.filter((v) => v.prescription_id)
      case 'norx':
        return inRange.filter((v) => !v.prescription_id)
      case 'due':
        return inRange.filter((v) => v.bill_payment_status && v.bill_payment_status !== 'Paid' && v.bill_payment_status !== 'Cancelled')
      default:
        return inRange
    }
  }, [inRange, filter, today])

  const menuVisit = openMenu ? filtered.find((v) => v.id === openMenu.id) ?? null : null

  const remove = async (v: VisitListItem) => {
    if (!window.confirm(`Delete visit ${v.visit_code} for ${v.patient_name}?`)) return
    try {
      await api.deleteVisit(v.id)
      toast('Visit deleted')
      setOpenMenu(null)
      load()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete visit', 'error')
    }
  }

  const toggleMenu = (id: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenu?.id === id) {
      setOpenMenu(null)
      return
    }
    setOpenMenu({ id, ...menuCoordsFromEvent(e) })
  }

  return (
    <div>
      <div className="page-head">
        <div className="titles">
          <h1 className="page-title">Visits</h1>
          <p className="page-sub">Manage and view all visit records saved locally.</p>
        </div>
        <div className="page-actions">
          <Link to="/visits/new" className="btn btn-primary">
            <IPlus size={16} /> New Visit
          </Link>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard icon={<ICalendar size={20} />} label="Total Visits" value={counts.all} />
        <StatCard icon={<IClock size={20} />} label="Today's Visits" value={counts.today} tone="blue" />
        <StatCard
          icon={<IRx size={20} />}
          label="With Prescription"
          value={counts.rx}
          delta={counts.all > 0 ? `${Math.round((counts.rx / counts.all) * 100)}% of total` : '—'}
        />
        <StatCard
          icon={<IMoney size={20} />}
          label="Outstanding Bills"
          value={counts.due}
          delta={counts.due > 0 ? 'Payment pending' : 'All settled'}
          tone="red"
          deltaTone={counts.due > 0 ? 'bad' : 'ok'}
        />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="filter-bar">
          <div className="grow">
            <span className="icon">
              <ISearch size={15} />
            </span>
            <input
              className="input"
              placeholder="Search by patient, visit ID, complaint or diagnosis…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="chips">
            {(
              [
                ['all', 'All Visits', counts.all],
                ['today', 'Today', counts.today],
                ['rx', 'Prescribed', counts.rx],
                ['norx', 'No Prescription', counts.norx],
                ['due', 'Outstanding Bills', counts.due],
              ] as Array<[Filter, string, number]>
            ).map(([key, label, count]) => (
              <button key={key} className={`chip${filter === key ? ' on' : ''}`} onClick={() => setFilter(key)}>
                {label} <span className="cnt">{count}</span>
              </button>
            ))}
          </div>
          <select className="select" style={{ width: 140 }} value={range} onChange={(e) => setRange(e.target.value as DateRange)}>
            {DATE_RANGES.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        {!visits ? (
          <Loading />
        ) : (
          <>
          <div className="table-wrap">
            <table className="tbl tbl-nowrap">
              <thead>
                <tr>
                  <th style={{ width: 72 }}>S.No</th>
                  <th>Date & Time</th>
                  <th>Patient</th>
                  <th>Complaint</th>
                  <th>Diagnosis</th>
                  <th>Prescription</th>
                  <th className="num">Billed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty">No visits found.</div>
                    </td>
                  </tr>
                )}
                {filtered.map((v, i) => {
                  const menuOpen = openMenu?.id === v.id
                  return (
                    <tr key={v.id} className="click" onClick={() => navigate(`/visits/${v.id}`)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="sno-cell">
                          <button
                            type="button"
                            className={`act more-btn${menuOpen ? ' on' : ''}`}
                            title="Actions"
                            aria-label={`Actions for visit ${v.visit_code}`}
                            aria-expanded={menuOpen}
                            onClick={(e) => toggleMenu(v.id, e)}
                          >
                            <IMore size={15} />
                          </button>
                          <span className="sno-num">{i + 1}</span>
                        </div>
                      </td>
                      <td className="date-cell">
                        <span style={{ fontWeight: 600 }}>{fmtDate(v.visit_date)}</span>
                        {fmtTime(v.visit_time) ? (
                          <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{fmtTime(v.visit_time)}</span>
                        ) : null}
                      </td>
                      <td>
                        <div className="name-cell">
                          <Avatar name={v.patient_name} size={28} />
                          <span style={{ fontWeight: 600 }}>{v.patient_name}</span>
                        </div>
                      </td>
                      <td>{v.chief_complaints || '—'}</td>
                      <td>{v.final_diagnosis || v.provisional_diagnosis || '—'}</td>
                      <td>
                        {v.prescription_id ? (
                          <Badge tone={v.prescription_status === 'finalized' ? 'green' : 'amber'}>
                            {v.prescription_status === 'finalized' ? 'Dispensed' : 'Draft'}
                          </Badge>
                        ) : (
                          <Badge tone="gray">Not Prescribed</Badge>
                        )}
                      </td>
                      <td className="num">
                        {v.bill_id ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 700 }}>{money(v.billed_amount)}</span>
                            <Badge tone={paymentTone(v.bill_payment_status)}>{v.bill_payment_status}</Badge>
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="tbl-foot">
            Showing {filtered.length} of {inRange.length} visits
          </div>
          </>
        )}
      </div>

      {openMenu && menuVisit && (
        <RowMenu open top={openMenu.top} left={openMenu.left} onClose={() => setOpenMenu(null)}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenMenu(null)
              navigate(`/visits/${menuVisit.id}`)
            }}
          >
            <IEye size={14} /> View
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenMenu(null)
              navigate(`/visits/${menuVisit.id}/edit`)
            }}
          >
            <IEdit size={14} /> Edit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenMenu(null)
              navigate(`/visits/${menuVisit.id}/prescription`)
            }}
          >
            <IRx size={14} /> Prescription
          </button>
          <button type="button" role="menuitem" className="danger" onClick={() => remove(menuVisit)}>
            <ITrash size={14} /> Delete
          </button>
        </RowMenu>
      )}
    </div>
  )
}
