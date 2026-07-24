import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Avatar, useSettings } from './ui'
import {
  IBell,
  IBill,
  ICalendar,
  IFlask,
  IHome,
  ILeafLogo,
  IPatients,
  IPill,
  IPrint,
  IReports,
  IRx,
  ISearch,
  ISettings,
} from './icons'

const NAV = [
  { to: '/', label: 'Dashboard', icon: IHome, end: true },
  { to: '/patients', label: 'Patients', icon: IPatients },
  { to: '/visits', label: 'Visits', icon: ICalendar },
  { to: '/prescriptions', label: 'Prescriptions', icon: IRx },
  { to: '/tests', label: 'Tests & Reports', icon: IFlask },
  { to: '/billing', label: 'Billing', icon: IBill },
  { to: '/reports', label: 'Reports', icon: IReports },
  { to: '/catalog', label: 'Catalog', icon: IPill },
  { to: '/print-template', label: 'Print Template', icon: IPrint },
  { to: '/settings', label: 'Settings', icon: ISettings },
]

interface SearchResults {
  patients: Array<{ id: number; patient_code: string; full_name: string; mobile: string | null }>
  visits: Array<{ id: number; visit_code: string; visit_date: string; patient_name: string }>
  bills: Array<{ id: number; bill_number: string; total_amount: number; patient_name: string }>
  medicines: Array<{ id: number; name: string; strength: string | null; dosage_form: string | null }>
}

function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      return
    }
    const t = setTimeout(() => {
      api.globalSearch(query).then((r) => {
        setResults(r)
        setOpen(true)
      })
    }, 180)
    return () => clearTimeout(t)
  }, [query])

  const go = (path: string) => {
    setOpen(false)
    setQuery('')
    navigate(path)
  }

  const hasAny =
    results &&
    (results.patients.length || results.visits.length || results.bills.length || results.medicines.length)

  return (
    <div className="topbar-search" ref={boxRef}>
      <span className="icon">
        <ISearch size={16} />
      </span>
      <input
        ref={inputRef}
        value={query}
        placeholder="Search patients, visits, prescriptions…"
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && setOpen(true)}
      />
      <span className="kbd">Ctrl + K</span>
      {open && results && (
        <div className="search-results">
          {!hasAny && <div className="search-empty">No results for “{query}”</div>}
          {results.patients.length > 0 && (
            <>
              <div className="search-group-label">Patients</div>
              {results.patients.map((p) => (
                <div key={p.id} className="search-row" onClick={() => go(`/patients/${p.id}`)}>
                  <Avatar name={p.full_name} size={26} />
                  <span>{p.full_name}</span>
                  <span className="sub">
                    {p.patient_code}
                    {p.mobile ? ` · ${p.mobile}` : ''}
                  </span>
                </div>
              ))}
            </>
          )}
          {results.visits.length > 0 && (
            <>
              <div className="search-group-label">Visits</div>
              {results.visits.map((v) => (
                <div key={v.id} className="search-row" onClick={() => go(`/visits/${v.id}`)}>
                  <ICalendar size={15} />
                  <span>{v.patient_name}</span>
                  <span className="sub">
                    {v.visit_code} · {v.visit_date}
                  </span>
                </div>
              ))}
            </>
          )}
          {results.bills.length > 0 && (
            <>
              <div className="search-group-label">Bills</div>
              {results.bills.map((b) => (
                <div key={b.id} className="search-row" onClick={() => go(`/bills/${b.id}`)}>
                  <IBill size={15} />
                  <span>{b.bill_number}</span>
                  <span className="sub">{b.patient_name}</span>
                </div>
              ))}
            </>
          )}
          {results.medicines.length > 0 && (
            <>
              <div className="search-group-label">Medicines</div>
              {results.medicines.map((m) => (
                <div key={m.id} className="search-row" onClick={() => go('/catalog')}>
                  <IPill size={15} />
                  <span>{m.name}</span>
                  <span className="sub">{[m.strength, m.dosage_form].filter(Boolean).join(' · ')}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings()
  const [version, setVersion] = useState('1.0.0')

  useEffect(() => {
    api.getAppInfo().then((info) => setVersion(info.version)).catch(() => {})
  }, [])

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="logo">
            <ILeafLogo size={28} />
          </span>
          <div className="brand-text">
            <div className="name">{settings.clinic_name}</div>
            <div className="mode">Offline Mode</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-offline">
          <strong>You are working OFFLINE</strong>
          All data is saved locally on this computer.
        </div>
        <div className="sidebar-version">Version {version}</div>
      </aside>
      <div className="main">
        <header className="topbar">
          <GlobalSearch />
          <div className="topbar-right">
            <button className="btn btn-ghost btn-icon" title="Notifications">
              <IBell size={18} />
            </button>
            <div className="topbar-profile">
              <Avatar name={settings.doctor_name} size={36} />
              <div className="who">
                <div className="n">{settings.doctor_name}</div>
                <div className="r">{settings.doctor_specialization || 'Consultant Physician'}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
