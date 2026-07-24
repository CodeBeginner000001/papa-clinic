import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtDate, inDateRange, DATE_RANGES, type DateRange } from '../lib/format'
import { Avatar, Badge, Field, Loading, Modal, StatCard, useToast } from '../components/ui'
import { TestWorkflowActions, fmtScheduledAt, testStatusTone } from '../components/TestWorkflow'
import { RowMenu, menuCoordsFromEvent } from '../components/RowMenu'
import { IAlert, ICheck, IClock, IEdit, IEye, IFlask, IMore, ISearch } from '../components/icons'
import type { TestListItem } from '@shared/types'

type Filter = 'all' | 'pending' | 'completed' | 'abnormal' | 'cancelled'
type OpenMenu = { id: number; top: number; left: number }

const isPending = (t: TestListItem) => t.status === 'Advised' || t.status === 'Scheduled'
const isCompleted = (t: TestListItem) => t.status === 'Completed' || t.status === 'Result received'

function ResultModal({ test, onClose, onSaved }: { test: TestListItem; onClose: () => void; onSaved: () => void }) {
  const [summary, setSummary] = useState(test.result_summary ?? '')
  const [resultDate, setResultDate] = useState(test.result_date ?? '')
  const [abnormal, setAbnormal] = useState(Boolean(test.is_abnormal))
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const saveNotes = async () => {
    setSaving(true)
    try {
      await api.updateTestResult(test.id, {
        resultSummary: summary.trim() || null,
        resultDate: resultDate || null,
        isAbnormal: abnormal,
      })
      toast('Result notes saved')
      onSaved()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update test', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={test.test_name}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          {(test.status === 'Completed' || test.status === 'Result received') && (
            <button className="btn btn-primary" onClick={saveNotes} disabled={saving}>
              Save Notes
            </button>
          )}
        </>
      }
    >
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
        {test.patient_name} ({test.patient_code}) · Visit on {fmtDate(test.visit_date)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <Badge tone={testStatusTone(test.status)}>{test.status}</Badge>
        {test.scheduled_at && (
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Scheduled {fmtScheduledAt(test.scheduled_at)}</span>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Workflow</div>
        <TestWorkflowActions test={test} onChanged={onSaved} />
      </div>

      {(test.status === 'Completed' || test.status === 'Result received') && (
        <>
          <div className="form-grid g2" style={{ marginBottom: 14 }}>
            <Field label="Result Date">
              <input className="input" type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Result Summary">
            <textarea
              className="textarea"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Optional notes, e.g. All parameters normal / LDL: 142 mg/dL (High)"
            />
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={abnormal} onChange={(e) => setAbnormal(e.target.checked)} />
            <span style={{ color: abnormal ? 'var(--red)' : 'inherit', fontWeight: abnormal ? 700 : 400 }}>
              Abnormal result — needs attention
            </span>
          </label>
        </>
      )}
    </Modal>
  )
}

export default function TestsPage() {
  const [rows, setRows] = useState<TestListItem[] | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [range, setRange] = useState<DateRange>('all')
  const [editing, setEditing] = useState<TestListItem | null>(null)
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null)
  const navigate = useNavigate()

  const load = useCallback(() => {
    api.listAllTests(query).then((list: TestListItem[]) => {
      setRows(list)
      setEditing((cur) => (cur ? list.find((t) => t.id === cur.id) ?? null : null))
    }).catch(() => {})
  }, [query])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  const inRange = useMemo(() => (rows ?? []).filter((t) => inDateRange(t.visit_date, range)), [rows, range])

  const stats = useMemo(
    () => ({
      total: inRange.length,
      completed: inRange.filter(isCompleted).length,
      pending: inRange.filter(isPending).length,
      abnormal: inRange.filter((t) => t.is_abnormal).length,
      cancelled: inRange.filter((t) => t.status === 'Cancelled').length,
    }),
    [inRange],
  )

  const filtered = useMemo(() => {
    switch (filter) {
      case 'pending':
        return inRange.filter(isPending)
      case 'completed':
        return inRange.filter(isCompleted)
      case 'abnormal':
        return inRange.filter((t) => t.is_abnormal)
      case 'cancelled':
        return inRange.filter((t) => t.status === 'Cancelled')
      default:
        return inRange
    }
  }, [inRange, filter])

  const menuTest = openMenu ? filtered.find((t) => t.id === openMenu.id) ?? null : null
  const pct = (n: number) => (stats.total > 0 ? `${Math.round((n / stats.total) * 100)}% of total` : '—')

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
          <h1 className="page-title">Tests & Reports</h1>
          <p className="page-sub">Advise → schedule → complete → upload report → result received.</p>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard icon={<IFlask size={20} />} label="Total Tests" value={stats.total} />
        <StatCard icon={<ICheck size={20} />} label="Completed Tests" value={stats.completed} delta={pct(stats.completed)} />
        <StatCard icon={<IClock size={20} />} label="Pending Tests" value={stats.pending} delta={pct(stats.pending)} tone="amber" deltaTone="warn" />
        <StatCard
          icon={<IAlert size={20} />}
          label="Abnormal Results"
          value={stats.abnormal}
          delta={stats.abnormal > 0 ? 'Needs attention' : 'None flagged'}
          tone="red"
          deltaTone={stats.abnormal > 0 ? 'bad' : 'ok'}
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
              placeholder="Search by test name, patient or category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="chips">
            {(
              [
                ['all', 'All', stats.total],
                ['pending', 'Pending', stats.pending],
                ['completed', 'Completed', stats.completed],
                ['abnormal', 'Abnormal', stats.abnormal],
                ['cancelled', 'Cancelled', stats.cancelled],
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
                    <th>Test Name</th>
                    <th>Visit Date</th>
                    <th>Patient</th>
                    <th>Status</th>
                    <th>Scheduled</th>
                    <th>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty">No tests found. Tests are added from a visit's detail page.</div>
                      </td>
                    </tr>
                  )}
                  {filtered.map((t, i) => {
                    const menuOpen = openMenu?.id === t.id
                    return (
                      <tr key={t.id} className="click" onClick={() => setEditing(t)}>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="sno-cell">
                            <button
                              type="button"
                              className={`act more-btn${menuOpen ? ' on' : ''}`}
                              title="Actions"
                              aria-label={`Actions for ${t.test_name}`}
                              aria-expanded={menuOpen}
                              onClick={(e) => toggleMenu(t.id, e)}
                            >
                              <IMore size={15} />
                            </button>
                            <span className="sno-num">{i + 1}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{t.test_name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{t.category || '—'}</div>
                        </td>
                        <td className="date-cell">{fmtDate(t.visit_date)}</td>
                        <td>
                          <div className="name-cell">
                            <Avatar name={t.patient_name} size={28} />
                            <span style={{ fontWeight: 600 }}>{t.patient_name}</span>
                          </div>
                        </td>
                        <td>
                          <Badge tone={testStatusTone(t.status)}>{t.status}</Badge>
                        </td>
                        <td className="date-cell">{fmtScheduledAt(t.scheduled_at)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {t.report_file_name ? (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => api.openTestReport(t.id).catch((err) => console.error(err))}
                            >
                              <IEye size={13} /> View
                            </button>
                          ) : (
                            <span style={{ color: 'var(--faint)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="tbl-foot">
              Showing {filtered.length} of {inRange.length} tests
            </div>
          </>
        )}
      </div>

      {openMenu && menuTest && (
        <RowMenu open top={openMenu.top} left={openMenu.left} onClose={() => setOpenMenu(null)}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenMenu(null)
              setEditing(menuTest)
            }}
          >
            <IEdit size={14} /> Manage Test
          </button>
          {menuTest.report_file_name && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenMenu(null)
                void api.openTestReport(menuTest.id)
              }}
            >
              <IEye size={14} /> View Report
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenMenu(null)
              navigate(`/visits/${menuTest.visit_id}`)
            }}
          >
            <IEye size={14} /> Open Visit
          </button>
        </RowMenu>
      )}

      {editing && <ResultModal test={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  )
}
