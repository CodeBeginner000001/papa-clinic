import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtDate, todayIso, inDateRange, DATE_RANGES, type DateRange } from '../lib/format'
import { Avatar, Badge, Loading, StatCard, useToast } from '../components/ui'
import { RowMenu, menuCoordsFromEvent } from '../components/RowMenu'
import { ICalendar, ICheck, IDownload, IEdit, IMore, IPrint, IRx, ISearch } from '../components/icons'
import type { PrescriptionListItem } from '@shared/types'

type Filter = 'all' | 'draft' | 'final' | 'followup'
type OpenMenu = { id: number; top: number; left: number }

export default function PrescriptionsPage() {
  const [rows, setRows] = useState<PrescriptionListItem[] | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [range, setRange] = useState<DateRange>('all')
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    const t = setTimeout(() => api.listPrescriptions(query).then(setRows).catch(() => {}), 200)
    return () => clearTimeout(t)
  }, [query])

  const today = todayIso()
  const inRange = useMemo(() => (rows ?? []).filter((r) => inDateRange(r.prescription_date, range)), [rows, range])

  const counts = useMemo(() => {
    return {
      all: inRange.length,
      draft: inRange.filter((r) => r.status === 'draft').length,
      final: inRange.filter((r) => r.status === 'finalized').length,
      followup: inRange.filter((r) => r.follow_up_date && r.follow_up_date >= today).length,
    }
  }, [inRange, today])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'draft':
        return inRange.filter((r) => r.status === 'draft')
      case 'final':
        return inRange.filter((r) => r.status === 'finalized')
      case 'followup':
        return inRange.filter((r) => r.follow_up_date && r.follow_up_date >= today)
      default:
        return inRange
    }
  }, [inRange, filter, today])

  const menuRx = openMenu ? filtered.find((r) => r.id === openMenu.id) ?? null : null

  const print = async (r: PrescriptionListItem) => {
    try {
      setOpenMenu(null)
      await api.printPrescription(r.visit_id)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Print failed', 'error')
    }
  }

  const pdf = async (r: PrescriptionListItem) => {
    try {
      setOpenMenu(null)
      const file = await api.pdfPrescription(r.visit_id)
      toast(`PDF saved: ${file}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'PDF export failed', 'error')
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
          <h1 className="page-title">Prescriptions</h1>
          <p className="page-sub">View and manage all prescriptions stored locally.</p>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard icon={<IRx size={20} />} label="Total Prescriptions" value={counts.all} />
        <StatCard
          icon={<ICheck size={20} />}
          label="Finalized"
          value={counts.final}
          delta={counts.all > 0 ? `${Math.round((counts.final / counts.all) * 100)}% of total` : '—'}
        />
        <StatCard
          icon={<IEdit size={20} />}
          label="Drafts"
          value={counts.draft}
          delta={counts.draft > 0 ? 'Pending finalization' : 'None pending'}
          tone="amber"
          deltaTone={counts.draft > 0 ? 'warn' : 'ok'}
        />
        <StatCard icon={<ICalendar size={20} />} label="Follow-up Due" value={counts.followup} tone="blue" />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="filter-bar">
          <div className="grow">
            <span className="icon">
              <ISearch size={15} />
            </span>
            <input
              className="input"
              placeholder="Search by patient, Rx ID or diagnosis…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="chips">
            {(
              [
                ['all', 'All Prescriptions', counts.all],
                ['final', 'Finalized', counts.final],
                ['draft', 'Draft', counts.draft],
                ['followup', 'Follow-up Due', counts.followup],
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
        {!rows ? (
          <Loading />
        ) : (
          <>
            <div className="table-wrap">
              <table className="tbl tbl-nowrap">
                <thead>
                  <tr>
                    <th style={{ width: 72 }}>S.No</th>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Diagnosis</th>
                    <th className="num">Total Medicines</th>
                    <th className="num">Edits</th>
                    <th>Follow-up Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty">No prescriptions found. Create one from a visit.</div>
                      </td>
                    </tr>
                  )}
                  {filtered.map((r, i) => {
                    const menuOpen = openMenu?.id === r.id
                    return (
                      <tr key={r.id} className="click" onClick={() => navigate(`/visits/${r.visit_id}/prescription`)}>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="sno-cell">
                            <button
                              type="button"
                              className={`act more-btn${menuOpen ? ' on' : ''}`}
                              title="Actions"
                              aria-label={`Actions for ${r.prescription_code}`}
                              aria-expanded={menuOpen}
                              onClick={(e) => toggleMenu(r.id, e)}
                            >
                              <IMore size={15} />
                            </button>
                            <span className="sno-num">{i + 1}</span>
                          </div>
                        </td>
                        <td className="date-cell">{fmtDate(r.prescription_date)}</td>
                        <td>
                          <div className="name-cell">
                            <Avatar name={r.patient_name} size={28} />
                            <span style={{ fontWeight: 600 }}>{r.patient_name}</span>
                          </div>
                        </td>
                        <td>{r.diagnosis || '—'}</td>
                        <td className="num">{r.medicine_count}</td>
                        <td className="num">{r.edit_count ?? 0}</td>
                        <td className="date-cell">{fmtDate(r.follow_up_date)}</td>
                        <td>
                          {r.status === 'finalized' ? <Badge tone="green">Finalized</Badge> : <Badge tone="amber">Draft</Badge>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="tbl-foot">
              Showing {filtered.length} of {inRange.length} prescriptions
            </div>
          </>
        )}
      </div>

      {openMenu && menuRx && (
        <RowMenu open top={openMenu.top} left={openMenu.left} onClose={() => setOpenMenu(null)}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenMenu(null)
              navigate(`/visits/${menuRx.visit_id}/prescription`)
            }}
          >
            <IEdit size={14} /> Edit
          </button>
          <button type="button" role="menuitem" onClick={() => print(menuRx)}>
            <IPrint size={14} /> Print
          </button>
          <button type="button" role="menuitem" onClick={() => pdf(menuRx)}>
            <IDownload size={14} /> Download PDF
          </button>
        </RowMenu>
      )}
    </div>
  )
}
