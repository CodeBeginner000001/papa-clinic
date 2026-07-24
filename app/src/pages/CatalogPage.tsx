import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtDate, money } from '../lib/format'
import { Badge, Field, Loading, Modal, StatCard, useToast } from '../components/ui'
import { RowMenu, menuCoordsFromEvent } from '../components/RowMenu'
import { ICheck, IClock, IEdit, IFlask, IMore, IPill, IPlus, ISearch, ITrash } from '../components/icons'
import type { Medicine, ProcedureItem, TestItem } from '@shared/types'

type Tab = 'medicines' | 'options' | 'tests' | 'services'
type MedFilter = 'all' | 'active' | 'inactive' | 'frequent' | 'unused'
type OptionCategory = 'dosage_form' | 'frequency' | 'timing'
type OpenMenu = { id: number; top: number; left: number }

const TABS: Array<[Tab, string]> = [
  ['medicines', 'Medicines'],
  ['options', 'Rx Options'],
  ['tests', 'Tests'],
  ['services', 'Services'],
]

const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drops', 'Cream', 'Ointment', 'Inhaler', 'Powder', 'Gel', 'Lotion', 'Sachet', 'Other']

interface MedForm {
  id?: number
  name: string
  strength: string
  dosageForm: string
  genericName: string
  defaultDosageInstruction: string
  isActive: boolean
}

interface CustomOption {
  id: number
  name: string
  usage_count: number
}

const emptyMed: MedForm = { name: '', strength: '', dosageForm: 'Tablet', genericName: '', defaultDosageInstruction: '', isActive: true }

function MedicineModal({ initial, onClose, onSaved }: { initial: MedForm; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<MedForm>(initial)
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const editing = Boolean(initial.id)

  const save = async () => {
    if (!form.name.trim()) {
      toast('Medicine name is required', 'error')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.updateMedicine(form.id!, {
          name: form.name,
          strength: form.strength || undefined,
          dosageForm: form.dosageForm || undefined,
          genericName: form.genericName || undefined,
          defaultDosageInstruction: form.defaultDosageInstruction || undefined,
          isActive: form.isActive,
        })
      } else {
        await api.createMedicine({
          name: form.name,
          strength: form.strength || undefined,
          dosageForm: form.dosageForm || undefined,
          genericName: form.genericName || undefined,
          defaultDosageInstruction: form.defaultDosageInstruction || undefined,
        })
      }
      toast(editing ? 'Medicine updated' : 'Medicine added')
      onSaved()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save medicine', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={editing ? 'Edit Medicine' : 'Add Medicine'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            Save Medicine
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Medicine Name" required>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Paracetamol" autoFocus />
        </Field>
        <div className="form-grid g2">
          <Field label="Strength">
            <input className="input" value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} placeholder="e.g. 500 mg" />
          </Field>
          <Field label="Form">
            <select className="select" value={form.dosageForm} onChange={(e) => setForm({ ...form, dosageForm: e.target.value })}>
              {FORMS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Composition / Generic Name" optional>
          <input className="input" value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} placeholder="e.g. Paracetamol 500 mg" />
        </Field>
        <Field label="Default Dosage Instruction" optional>
          <input
            className="input"
            value={form.defaultDosageInstruction}
            onChange={(e) => setForm({ ...form, defaultDosageInstruction: e.target.value })}
            placeholder="e.g. 1 Tablet"
          />
        </Field>
        {editing && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active (available in prescription search)
          </label>
        )}
      </div>
    </Modal>
  )
}

function MedicinesTab() {
  const [rows, setRows] = useState<Medicine[] | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<MedFilter>('all')
  const [modal, setModal] = useState<MedForm | null>(null)
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null)
  const toast = useToast()

  const load = useCallback(() => {
    api.listMedicines(query).then(setRows).catch(() => {})
  }, [query])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  const counts = useMemo(() => {
    const all = rows ?? []
    return {
      all: all.length,
      active: all.filter((m) => m.is_active).length,
      inactive: all.filter((m) => !m.is_active).length,
      frequent: all.filter((m) => m.usage_count >= 3).length,
      unused: all.filter((m) => m.usage_count === 0).length,
    }
  }, [rows])

  const filtered = useMemo(() => {
    const all = rows ?? []
    switch (filter) {
      case 'active':
        return all.filter((m) => m.is_active)
      case 'inactive':
        return all.filter((m) => !m.is_active)
      case 'frequent':
        return all.filter((m) => m.usage_count >= 3)
      case 'unused':
        return all.filter((m) => m.usage_count === 0)
      default:
        return all
    }
  }, [rows, filter])

  const topUsed = useMemo(() => {
    const all = rows ?? []
    if (all.length === 0) return 0
    return Math.max(...all.map((m) => m.usage_count))
  }, [rows])

  const menuMed = openMenu ? filtered.find((m) => m.id === openMenu.id) ?? null : null

  const toggleMenu = (id: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenu?.id === id) {
      setOpenMenu(null)
      return
    }
    setOpenMenu({ id, ...menuCoordsFromEvent(e) })
  }

  const openEdit = (m: Medicine) => {
    setOpenMenu(null)
    setModal({
      id: m.id,
      name: m.name,
      strength: m.strength ?? '',
      dosageForm: m.dosage_form ?? 'Tablet',
      genericName: m.generic_name ?? '',
      defaultDosageInstruction: m.default_dosage_instruction ?? '',
      isActive: Boolean(m.is_active),
    })
  }

  const remove = async (m: Medicine) => {
    if (!window.confirm(`Remove ${m.name}? If it was ever prescribed it will be deactivated instead.`)) return
    try {
      setOpenMenu(null)
      await api.deactivateMedicine(m.id)
      toast('Medicine removed')
      load()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to remove medicine', 'error')
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={() => setModal(emptyMed)}>
          <IPlus size={16} /> Add Medicine
        </button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard icon={<IPill size={20} />} label="Total Medicines" value={counts.all} />
        <StatCard
          icon={<ICheck size={20} />}
          label="Active"
          value={counts.active}
          delta={counts.all > 0 ? `${Math.round((counts.active / counts.all) * 100)}% of catalog` : '—'}
        />
        <StatCard
          icon={<IClock size={20} />}
          label="Frequently Used"
          value={counts.frequent}
          delta={topUsed > 0 ? `Top used ${topUsed}×` : 'No usage yet'}
          tone="blue"
        />
        <StatCard
          icon={<ITrash size={20} />}
          label="Inactive / Unused"
          value={counts.inactive + counts.unused}
          delta={counts.inactive > 0 ? `${counts.inactive} deactivated` : `${counts.unused} never prescribed`}
          tone="amber"
          deltaTone="warn"
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
              placeholder="Search medicines by name or composition…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="chips">
            {(
              [
                ['all', 'All Medicines', counts.all],
                ['active', 'Active', counts.active],
                ['frequent', 'Frequently Used', counts.frequent],
                ['unused', 'Never Used', counts.unused],
                ['inactive', 'Inactive', counts.inactive],
              ] as Array<[MedFilter, string, number]>
            ).map(([key, label, count]) => (
              <button key={key} className={`chip${filter === key ? ' on' : ''}`} onClick={() => setFilter(key)}>
                {label} <span className="cnt">{count}</span>
              </button>
            ))}
          </div>
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
                    <th>Medicine Name</th>
                    <th>Form</th>
                    <th>Strength</th>
                    <th>Composition</th>
                    <th className="num">Usage Count</th>
                    <th>Last Used</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty">
                          <IPill size={28} />
                          <div>No medicines found. They are added automatically when you prescribe, or add them here.</div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filtered.map((m, i) => {
                    const menuOpen = openMenu?.id === m.id
                    return (
                      <tr key={m.id} className="click" onClick={() => openEdit(m)}>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="sno-cell">
                            <button
                              type="button"
                              className={`act more-btn${menuOpen ? ' on' : ''}`}
                              title="Actions"
                              aria-label={`Actions for ${m.name}`}
                              aria-expanded={menuOpen}
                              onClick={(e) => toggleMenu(m.id, e)}
                            >
                              <IMore size={15} />
                            </button>
                            <span className="sno-num">{i + 1}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <IPill size={14} /> {m.name}
                          </span>
                        </td>
                        <td>{m.dosage_form || '—'}</td>
                        <td>{m.strength || '—'}</td>
                        <td>{m.generic_name || '—'}</td>
                        <td className="num">{m.usage_count}</td>
                        <td className="date-cell">{fmtDate(m.last_prescribed_at)}</td>
                        <td>{m.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Inactive</Badge>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="tbl-foot">
              Showing {filtered.length} of {(rows ?? []).length} medicines
            </div>
          </>
        )}
      </div>

      {openMenu && menuMed && (
        <RowMenu open top={openMenu.top} left={openMenu.left} onClose={() => setOpenMenu(null)}>
          <button type="button" role="menuitem" onClick={() => openEdit(menuMed)}>
            <IEdit size={14} /> Edit
          </button>
          <button type="button" role="menuitem" className="danger" onClick={() => remove(menuMed)}>
            <ITrash size={14} /> {menuMed.is_active ? 'Deactivate' : 'Remove'}
          </button>
        </RowMenu>
      )}

      {modal && <MedicineModal initial={modal} onClose={() => setModal(null)} onSaved={load} />}
    </>
  )
}

function OptionListCard({ category, title, hint }: { category: OptionCategory; title: string; hint: string }) {
  const [options, setOptions] = useState<CustomOption[]>([])
  const [newName, setNewName] = useState('')
  const toast = useToast()

  const load = useCallback(() => {
    api.listOptions(category).then(setOptions)
  }, [category])

  useEffect(() => {
    load()
  }, [load])

  const add = async () => {
    const name = newName.trim()
    if (!name) return
    await api.addOption(category, name)
    setNewName('')
    toast('Option added')
    load()
  }

  const rename = async (opt: CustomOption) => {
    const name = window.prompt('Edit option:', opt.name)
    if (name == null || !name.trim() || name.trim() === opt.name) return
    await api.updateOption(opt.id, name.trim())
    toast('Option updated')
    load()
  }

  const remove = async (opt: CustomOption) => {
    if (!window.confirm(`Delete “${opt.name}” from the ${title.toLowerCase()} options? Saved prescriptions are not affected.`)) return
    await api.deleteOption(opt.id)
    toast('Option deleted')
    load()
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>{title}</h3>
      </div>
      <div style={{ padding: '10px 14px 14px' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{hint}</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            className="input"
            value={newName}
            placeholder={`Add ${title.toLowerCase()} option…`}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button className="btn btn-outline btn-sm" onClick={add} disabled={!newName.trim()}>
            + Add
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
          {options.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--faint)' }}>No options yet.</div>}
          {options.map((o) => (
            <div
              key={o.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '6px 8px 6px 12px',
                fontSize: 13,
              }}
            >
              <span style={{ flex: 1 }}>{o.name}</span>
              {o.usage_count > 0 && <span style={{ fontSize: 11, color: 'var(--faint)' }}>used {o.usage_count}×</span>}
              <button className="btn btn-ghost btn-sm" onClick={() => rename(o)}>
                Edit
              </button>
              <button className="btn btn-danger btn-icon" title="Delete" onClick={() => remove(o)}>
                <ITrash size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OptionsTab() {
  return (
    <>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
        These options appear in the Form, Frequency and Instructions dropdowns when writing a prescription. Anything typed
        manually is added here automatically after saving.
      </p>
      <div className="grid cols-3">
        <OptionListCard category="dosage_form" title="Form" hint="Dosage forms, e.g. Tablet, Syrup, Injection." />
        <OptionListCard category="frequency" title="Frequency" hint="How often to take, e.g. BD (Twice daily)." />
        <OptionListCard category="timing" title="Instructions" hint="Timing instructions, e.g. After meals, At bedtime." />
      </div>
    </>
  )
}

function PriceCatalogTab({ kind }: { kind: 'test' | 'procedure' }) {
  const [items, setItems] = useState<Array<TestItem | ProcedureItem> | null>(null)
  const [query, setQuery] = useState('')
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null)
  const toast = useToast()
  const label = kind === 'test' ? 'Test' : 'Service'

  const load = useCallback(() => {
    const req = kind === 'test' ? api.listTests(query) : api.listProcedures(query)
    req.then(setItems).catch(() => {})
  }, [kind, query])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  const menuItem = openMenu ? items?.find((item) => item.id === openMenu.id) ?? null : null

  const toggleMenu = (id: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenu?.id === id) {
      setOpenMenu(null)
      return
    }
    setOpenMenu({ id, ...menuCoordsFromEvent(e) })
  }

  const add = async () => {
    const name = window.prompt(`New ${label.toLowerCase()} name:`)
    if (!name?.trim()) return
    const priceStr = window.prompt('Default price (₹):', '0')
    const price = Number(priceStr ?? 0) || 0
    if (kind === 'test') await api.upsertTest({ name, defaultPrice: price })
    else await api.upsertProcedure({ name, defaultPrice: price })
    toast(`${label} added`)
    load()
  }

  const edit = async (item: TestItem | ProcedureItem) => {
    setOpenMenu(null)
    const name = window.prompt(`Edit ${label.toLowerCase()} name:`, item.name)
    if (name == null || !name.trim()) return
    const priceStr = window.prompt(`Default price for ${name.trim()} (₹):`, String(item.default_price))
    if (priceStr == null) return
    const payload = {
      id: item.id,
      name: name.trim(),
      category: item.category ?? undefined,
      defaultPrice: Number(priceStr) || 0,
    }
    if (kind === 'test') await api.upsertTest(payload)
    else await api.upsertProcedure(payload)
    toast(`${label} updated`)
    load()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={add}>
          <IPlus size={16} /> Add {label}
        </button>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="filter-bar">
          <div className="grow">
            <span className="icon">
              <ISearch size={15} />
            </span>
            <input
              className="input"
              placeholder={`Search ${label.toLowerCase()}s…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="card">
        {!items ? (
          <Loading />
        ) : (
          <>
            <div className="table-wrap">
              <table className="tbl tbl-nowrap">
                <thead>
                  <tr>
                    <th style={{ width: 72 }}>S.No</th>
                    <th>{label} Name</th>
                    <th>Category</th>
                    <th className="num">Default Price</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty">No {label.toLowerCase()}s yet. Add one to use it on visits and bills.</div>
                      </td>
                    </tr>
                  )}
                  {items.map((item, i) => {
                    const menuOpen = openMenu?.id === item.id
                    return (
                      <tr key={item.id} className="click" onClick={() => edit(item)}>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="sno-cell">
                            <button
                              type="button"
                              className={`act more-btn${menuOpen ? ' on' : ''}`}
                              title="Actions"
                              aria-label={`Actions for ${item.name}`}
                              aria-expanded={menuOpen}
                              onClick={(e) => toggleMenu(item.id, e)}
                            >
                              <IMore size={15} />
                            </button>
                            <span className="sno-num">{i + 1}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            {kind === 'test' ? <IFlask size={14} /> : <IPlus size={14} />} {item.name}
                          </span>
                        </td>
                        <td>{item.category || '—'}</td>
                        <td className="num" style={{ fontWeight: 700 }}>{money(item.default_price)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="tbl-foot">
              Showing {items.length} {label.toLowerCase()}
              {items.length === 1 ? '' : 's'}
            </div>
          </>
        )}
      </div>

      {openMenu && menuItem && (
        <RowMenu open top={openMenu.top} left={openMenu.left} onClose={() => setOpenMenu(null)}>
          <button type="button" role="menuitem" onClick={() => edit(menuItem)}>
            <IEdit size={14} /> Edit
          </button>
        </RowMenu>
      )}
    </>
  )
}

export default function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: Tab =
    raw === 'options' || raw === 'tests' || raw === 'services' || raw === 'medicines' ? raw : 'medicines'

  const setTab = (next: Tab) => {
    setParams(next === 'medicines' ? {} : { tab: next }, { replace: true })
  }

  return (
    <div>
      <div className="page-head">
        <div className="titles">
          <h1 className="page-title">Catalog</h1>
          <p className="page-sub">
            Central place to manage medicines, prescription options, tests and services used across the clinic.
          </p>
        </div>
      </div>

      <div className="catalog-tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`catalog-tab${tab === key ? ' on' : ''}`}
            onClick={() => setTab(key)}
          >
            {key === 'medicines' && <IPill size={15} />}
            {key === 'options' && <ICheck size={15} />}
            {key === 'tests' && <IFlask size={15} />}
            {key === 'services' && <IPlus size={15} />}
            {label}
          </button>
        ))}
      </div>

      {tab === 'medicines' && <MedicinesTab />}
      {tab === 'options' && <OptionsTab />}
      {tab === 'tests' && <PriceCatalogTab kind="test" />}
      {tab === 'services' && <PriceCatalogTab kind="procedure" />}
    </div>
  )
}
