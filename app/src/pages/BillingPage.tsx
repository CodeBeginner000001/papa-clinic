import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { money, fmtDate, inDateRange, DATE_RANGES, type DateRange } from '../lib/format'
import { Avatar, Badge, Loading, paymentTone, StatCard, useToast } from '../components/ui'
import { RowMenu, menuCoordsFromEvent } from '../components/RowMenu'
import { IBill, ICheck, IEdit, IEye, IMoney, IMore, IPrint, ISearch } from '../components/icons'
import type { BillListItem } from '@shared/types'

type Filter = 'all' | 'draft' | 'unpaid' | 'partial' | 'paid'
type OpenMenu = { id: number; top: number; left: number }

export default function BillingPage() {
  const [rows, setRows] = useState<BillListItem[] | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [range, setRange] = useState<DateRange>('all')
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null)
  const navigate = useNavigate()
  const toast = useToast()

  const load = () => api.listBills(query).then(setRows).catch(() => {})

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const active = useMemo(
    () => (rows ?? []).filter((b) => b.status !== 'cancelled' && inDateRange(b.bill_date, range)),
    [rows, range],
  )

  const counts = useMemo(
    () => ({
      all: active.length,
      draft: active.filter((b) => b.status === 'draft').length,
      unpaid: active.filter((b) => b.status === 'finalized' && b.payment_status === 'Unpaid').length,
      partial: active.filter((b) => b.payment_status === 'Partially paid').length,
      paid: active.filter((b) => b.payment_status === 'Paid').length,
    }),
    [active],
  )

  const filtered = useMemo(() => {
    switch (filter) {
      case 'draft':
        return active.filter((b) => b.status === 'draft')
      case 'unpaid':
        return active.filter((b) => b.status === 'finalized' && b.payment_status === 'Unpaid')
      case 'partial':
        return active.filter((b) => b.payment_status === 'Partially paid')
      case 'paid':
        return active.filter((b) => b.payment_status === 'Paid')
      default:
        return active
    }
  }, [active, filter])

  const totals = useMemo(
    () => ({
      billed: active.filter((b) => b.status === 'finalized').reduce((s, b) => s + b.total_amount, 0),
      due: active.filter((b) => b.status === 'finalized').reduce((s, b) => s + b.outstanding_amount, 0),
      collected: active.filter((b) => b.status === 'finalized').reduce((s, b) => s + b.amount_paid, 0),
    }),
    [active],
  )

  const menuBill = openMenu ? filtered.find((b) => b.id === openMenu.id) ?? null : null

  const toggleMenu = (id: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenu?.id === id) {
      setOpenMenu(null)
      return
    }
    setOpenMenu({ id, ...menuCoordsFromEvent(e) })
  }

  const print = async (b: BillListItem) => {
    try {
      setOpenMenu(null)
      await api.printBill(b.id)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Print failed', 'error')
    }
  }

  return (
    <div>
      <div className="page-head">
        <div className="titles">
          <h1 className="page-title">Billing & Payments</h1>
          <p className="page-sub">
            Total billed {money(totals.billed)} · Outstanding{' '}
            <span style={{ color: totals.due > 0 ? 'var(--red)' : 'var(--green-600)', fontWeight: 700 }}>{money(totals.due)}</span>
          </p>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard icon={<IBill size={20} />} label="Total Bills" value={counts.all} />
        <StatCard icon={<ICheck size={20} />} label="Amount Collected" value={money(totals.collected)} />
        <StatCard
          icon={<IMoney size={20} />}
          label="Outstanding"
          value={money(totals.due)}
          delta={totals.due > 0 ? `${counts.unpaid + counts.partial} bill(s) pending` : 'All settled'}
          tone="red"
          deltaTone={totals.due > 0 ? 'bad' : 'ok'}
        />
        <StatCard
          icon={<IBill size={20} />}
          label="Drafts"
          value={counts.draft}
          delta={counts.draft > 0 ? 'Pending finalization' : 'None pending'}
          tone="amber"
          deltaTone={counts.draft > 0 ? 'warn' : 'ok'}
        />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="filter-bar">
          <div className="grow">
            <span className="icon">
              <ISearch size={15} />
            </span>
            <input className="input" placeholder="Search by patient or bill number…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="chips">
            {(
              [
                ['all', 'All Bills', counts.all],
                ['unpaid', 'Unpaid', counts.unpaid],
                ['partial', 'Partially Paid', counts.partial],
                ['paid', 'Paid', counts.paid],
                ['draft', 'Drafts', counts.draft],
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
                    <th>Bill No.</th>
                    <th>Date</th>
                    <th>Patient</th>
                    <th className="num">Total</th>
                    <th className="num">Paid</th>
                    <th className="num">Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty">No bills found.</div>
                      </td>
                    </tr>
                  )}
                  {filtered.map((b, i) => {
                    const menuOpen = openMenu?.id === b.id
                    return (
                      <tr key={b.id} className="click" onClick={() => navigate(`/bills/${b.id}`, { state: { from: '/billing' } })}>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="sno-cell">
                            <button
                              type="button"
                              className={`act more-btn${menuOpen ? ' on' : ''}`}
                              title="Actions"
                              aria-label={`Actions for ${b.bill_number}`}
                              aria-expanded={menuOpen}
                              onClick={(e) => toggleMenu(b.id, e)}
                            >
                              <IMore size={15} />
                            </button>
                            <span className="sno-num">{i + 1}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--green-800)', fontWeight: 700 }}>{b.bill_number}</td>
                        <td className="date-cell">{fmtDate(b.bill_date)}</td>
                        <td>
                          <div className="name-cell">
                            <Avatar name={b.patient_name} size={28} />
                            <span style={{ fontWeight: 600 }}>{b.patient_name}</span>
                          </div>
                        </td>
                        <td className="num" style={{ fontWeight: 700 }}>{money(b.total_amount)}</td>
                        <td className="num" style={{ color: 'var(--green-600)' }}>{money(b.amount_paid)}</td>
                        <td className="num" style={{ color: b.outstanding_amount > 0 ? 'var(--red)' : undefined, fontWeight: 700 }}>
                          {money(b.outstanding_amount)}
                        </td>
                        <td>
                          <Badge tone={b.status === 'draft' ? 'gray' : paymentTone(b.payment_status)}>
                            {b.status === 'draft' ? 'Draft' : b.payment_status}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="tbl-foot">
              Showing {filtered.length} of {active.length} bills
            </div>
          </>
        )}
      </div>

      {openMenu && menuBill && (
        <RowMenu open top={openMenu.top} left={openMenu.left} onClose={() => setOpenMenu(null)}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenMenu(null)
              navigate(`/bills/${menuBill.id}`, { state: { from: '/billing' } })
            }}
          >
            <IEye size={14} /> View
          </button>
          {menuBill.status === 'draft' && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenMenu(null)
                navigate(`/bills/${menuBill.id}/edit`, { state: { from: '/billing' } })
              }}
            >
              <IEdit size={14} /> Edit
            </button>
          )}
          <button type="button" role="menuitem" onClick={() => print(menuBill)}>
            <IPrint size={14} /> Print
          </button>
          {menuBill.status === 'finalized' && menuBill.outstanding_amount > 0 && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenMenu(null)
                navigate(`/bills/${menuBill.id}?pay=1`, { state: { from: '/billing' } })
              }}
            >
              <IMoney size={14} /> Collect Payment
            </button>
          )}
        </RowMenu>
      )}
    </div>
  )
}
