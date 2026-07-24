import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { money, fmtDate, ageGender } from '../lib/format'
import { Avatar, Badge, Loading, useToast } from '../components/ui'
import { RowMenu, menuCoordsFromEvent } from '../components/RowMenu'
import { IEdit, IEye, IMore, IPlus, ISearch, ITrash } from '../components/icons'
import type { PatientListItem } from '@shared/types'

type Filter = 'all' | 'balance' | 'recent' | 'inactive'
type OpenMenu = { id: number; top: number; left: number }

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientListItem[] | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null)
  const navigate = useNavigate()
  const toast = useToast()

  const load = () => api.listPatients(query).then(setPatients).catch(() => {})

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const counts = useMemo(() => {
    const all = patients ?? []
    const now = Date.now()
    const sixMonths = 1000 * 60 * 60 * 24 * 182
    return {
      all: all.length,
      balance: all.filter((p) => p.outstanding_amount > 0).length,
      recent: all.filter((p) => p.last_visit_date && now - new Date(p.last_visit_date).getTime() < 1000 * 60 * 60 * 24 * 30).length,
      inactive: all.filter((p) => !p.last_visit_date || now - new Date(p.last_visit_date).getTime() > sixMonths).length,
    }
  }, [patients])

  const filtered = useMemo(() => {
    const all = patients ?? []
    const now = Date.now()
    const sixMonths = 1000 * 60 * 60 * 24 * 182
    switch (filter) {
      case 'balance':
        return all.filter((p) => p.outstanding_amount > 0)
      case 'recent':
        return all.filter((p) => p.last_visit_date && now - new Date(p.last_visit_date).getTime() < 1000 * 60 * 60 * 24 * 30)
      case 'inactive':
        return all.filter((p) => !p.last_visit_date || now - new Date(p.last_visit_date).getTime() > sixMonths)
      default:
        return all
    }
  }, [patients, filter])

  const menuPatient = openMenu ? filtered.find((p) => p.id === openMenu.id) ?? null : null

  const archive = async (p: PatientListItem) => {
    if (!window.confirm(`Archive patient ${p.full_name}? They will no longer appear in lists.`)) return
    await api.archivePatient(p.id)
    toast('Patient archived')
    setOpenMenu(null)
    load()
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
          <h1 className="page-title">Patients</h1>
          <p className="page-sub">Manage and search patient records saved locally.</p>
        </div>
        <div className="page-actions">
          <Link to="/patients/new" className="btn btn-primary">
            <IPlus size={16} /> Add Patient
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="filter-bar">
          <div className="grow">
            <span className="icon">
              <ISearch size={15} />
            </span>
            <input
              className="input"
              placeholder="Search by name, mobile number or Patient ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="chips">
            {(
              [
                ['all', 'All Patients', counts.all],
                ['recent', 'Active (30 days)', counts.recent],
                ['balance', 'With Balance', counts.balance],
                ['inactive', 'No Visit (6+ Months)', counts.inactive],
              ] as Array<[Filter, string, number]>
            ).map(([key, label, count]) => (
              <button key={key} className={`chip${filter === key ? ' on' : ''}`} onClick={() => setFilter(key)}>
                {label} <span className="cnt">{count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        {!patients ? (
          <Loading />
        ) : (
          <>
          <div className="table-wrap">
            <table className="tbl tbl-nowrap">
              <thead>
                <tr>
                  <th style={{ width: 72 }}>S.No</th>
                  <th>Name</th>
                  <th>Age / Gender</th>
                  <th>Mobile</th>
                  <th>Last Visit</th>
                  <th className="num">Total Visits</th>
                  <th className="num">Outstanding</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty">No patients found. Try a different search or add a new patient.</div>
                    </td>
                  </tr>
                )}
                {filtered.map((p, i) => {
                  const active =
                    p.last_visit_date && Date.now() - new Date(p.last_visit_date).getTime() < 1000 * 60 * 60 * 24 * 182
                  const menuOpen = openMenu?.id === p.id
                  return (
                    <tr key={p.id} className="click" onClick={() => navigate(`/patients/${p.id}`)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="sno-cell">
                          <button
                            type="button"
                            className={`act more-btn${menuOpen ? ' on' : ''}`}
                            title="Actions"
                            aria-label={`Actions for ${p.full_name}`}
                            aria-expanded={menuOpen}
                            onClick={(e) => toggleMenu(p.id, e)}
                          >
                            <IMore size={15} />
                          </button>
                          <span className="sno-num">{i + 1}</span>
                        </div>
                      </td>
                      <td>
                        <div className="name-cell">
                          <Avatar name={p.full_name} size={28} />
                          <span style={{ fontWeight: 600 }}>{p.full_name}</span>
                        </div>
                      </td>
                      <td>{ageGender(p.age, p.gender)}</td>
                      <td>{p.mobile || '—'}</td>
                      <td className="date-cell">{fmtDate(p.last_visit_date)}</td>
                      <td className="num">{p.total_visits}</td>
                      <td className="num" style={{ color: p.outstanding_amount > 0 ? 'var(--red)' : 'var(--green-600)', fontWeight: 700 }}>
                        {money(p.outstanding_amount)}
                      </td>
                      <td>{active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Inactive</Badge>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="tbl-foot">
            Showing {filtered.length} of {patients.length} patients
          </div>
          </>
        )}
      </div>

      {openMenu && menuPatient && (
        <RowMenu open top={openMenu.top} left={openMenu.left} onClose={() => setOpenMenu(null)}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenMenu(null)
              navigate(`/patients/${menuPatient.id}`)
            }}
          >
            <IEye size={14} /> View
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenMenu(null)
              navigate(`/patients/${menuPatient.id}/edit`)
            }}
          >
            <IEdit size={14} /> Edit
          </button>
          <button type="button" role="menuitem" className="danger" onClick={() => archive(menuPatient)}>
            <ITrash size={14} /> Delete
          </button>
        </RowMenu>
      )}
    </div>
  )
}
