import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { money, fmtDate, todayIso, nowTime, ageGender } from '../lib/format'
import { Avatar, Field, Loading, useToast } from '../components/ui'
import { ICalendar, ICheck, IClipboard, IClock, IMoney, IPatients, IPhone, IRx, ISearch, IVitals } from '../components/icons'
import type { Patient, PatientListItem, Visit, VisitVitals } from '@shared/types'

interface SymptomOption {
  id: number
  name: string
  usage_count: number
}

/**
 * Chip input with dropdown suggestions from the local symptoms database.
 * New symptoms typed here are added to the database when the visit is
 * saved, so they appear as suggestions next time.
 */
function SymptomsInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const chips = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const [text, setText] = useState('')
  const [options, setOptions] = useState<SymptomOption[]>([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => api.searchSymptoms(text).then(setOptions).catch(() => {}), 150)
    return () => clearTimeout(t)
  }, [text, open])

  const add = (name: string) => {
    const clean = name.trim().replace(/,+$/, '')
    if (!clean) return
    if (!chips.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      onChange([...chips, clean].join(', '))
    }
    setText('')
    inputRef.current?.focus()
  }

  const remove = (name: string) => {
    onChange(chips.filter((c) => c !== name).join(', '))
  }

  const suggestions = options.filter((o) => !chips.some((c) => c.toLowerCase() === o.name.toLowerCase()))
  const exactMatch = options.some((o) => o.name.toLowerCase() === text.trim().toLowerCase())

  return (
    <div className="combo" ref={wrapRef}>
      <div className="tags-input" onClick={() => inputRef.current?.focus()}>
        {chips.map((c) => (
          <span key={c} className="tag">
            {c}
            <button type="button" aria-label={`Remove ${c}`} onClick={() => remove(c)}>
              ✕
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={text}
          placeholder={chips.length ? 'Add symptom…' : 'Type a symptom and press Enter'}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add(text)
            } else if (e.key === 'Backspace' && !text && chips.length) {
              remove(chips[chips.length - 1])
            }
          }}
        />
      </div>
      {open && (suggestions.length > 0 || text.trim()) && (
        <div className="combo-list">
          {suggestions.map((o) => (
            <div key={o.id} className="combo-item" onClick={() => add(o.name)}>
              <span>{o.name}</span>
              {o.usage_count > 0 && <span className="meta">used {o.usage_count}×</span>}
            </div>
          ))}
          {text.trim() && !exactMatch && (
            <div className="combo-new" onClick={() => add(text)}>
              + Add “{text.trim()}” as new symptom
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const VISIT_TYPES = [
  'New consultation',
  'Follow-up consultation',
  'Emergency visit',
  'Routine check-up',
  'Procedure visit',
  'Test review',
]

const emptyForm = {
  visitDate: todayIso(),
  visitTime: nowTime(),
  visitType: 'New consultation',
  chiefComplaints: '',
  symptoms: '',
  symptomDuration: '',
  examinationFindings: '',
  provisionalDiagnosis: '',
  finalDiagnosis: '',
  doctorNotes: '',
  advice: '',
  followUpRequired: 'No' as 'Yes' | 'No',
  followUpDate: '',
  temperature: '',
  pulse: '',
  systolicBp: '',
  diastolicBp: '',
  respiratory_rate: '',
  oxygen_saturation: '',
  weight: '',
  blood_sugar: '',
}

type FormState = typeof emptyForm

function PatientPicker({ onPick }: { onPick: (p: PatientListItem) => void }) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<PatientListItem[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      api.listPatients(query).then((rows: PatientListItem[]) => setOptions(rows.slice(0, 12)))
    }, 180)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="combo">
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }}>
          <ISearch size={15} />
        </span>
        <input
          className="input"
          style={{ paddingLeft: 34 }}
          placeholder="Search patient by name, mobile or ID…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          autoFocus
        />
      </div>
      {open && (
        <div className="combo-list">
          {options.length === 0 && <div className="combo-item">No patients found</div>}
          {options.map((p) => (
            <div
              key={p.id}
              className="combo-item"
              onClick={() => {
                setOpen(false)
                onPick(p)
              }}
            >
              <span>
                <strong>{p.full_name}</strong> · {ageGender(p.age, p.gender)}
              </span>
              <span className="meta">
                {p.patient_code}
                {p.mobile ? ` · ${p.mobile}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function VisitFormPage() {
  const { patientId, visitId } = useParams()
  const editing = Boolean(visitId)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [patientStats, setPatientStats] = useState<{ totalVisits: number; outstanding: number; lastVisit: string | null }>({
    totalVisits: 0,
    outstanding: 0,
    lastVisit: null,
  })
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(!editing)
  const navigate = useNavigate()
  const toast = useToast()

  const loadPatient = (pid: number) => {
    api.getPatient(pid).then(setPatient)
    api.patientDashboard(pid).then((d) => {
      if (d)
        setPatientStats({
          totalVisits: d.totalVisits,
          outstanding: d.outstanding,
          lastVisit: d.latestVisit?.visit_date ?? null,
        })
    })
  }

  useEffect(() => {
    if (patientId) loadPatient(Number(patientId))
  }, [patientId])

  useEffect(() => {
    if (!editing) return
    Promise.all([api.getVisit(Number(visitId)), api.getVitals(Number(visitId))]).then(
      ([v, vitals]: [Visit | null, VisitVitals | null]) => {
        if (!v) return
        loadPatient(v.patient_id)
        setForm({
          visitDate: v.visit_date,
          visitTime: v.visit_time ?? '',
          visitType: v.visit_type,
          chiefComplaints: v.chief_complaints ?? '',
          symptoms: v.symptoms ?? '',
          symptomDuration: v.symptom_duration ?? '',
          examinationFindings: v.examination_findings ?? '',
          provisionalDiagnosis: v.provisional_diagnosis ?? '',
          finalDiagnosis: v.final_diagnosis ?? '',
          doctorNotes: v.doctor_notes ?? '',
          advice: v.advice ?? '',
          followUpRequired: v.follow_up_date ? 'Yes' : 'No',
          followUpDate: v.follow_up_date ?? '',
          temperature: vitals?.temperature ?? '',
          pulse: vitals?.pulse ?? '',
          systolicBp: vitals?.systolic_bp ?? '',
          diastolicBp: vitals?.diastolic_bp ?? '',
          respiratory_rate: vitals?.respiratory_rate ?? '',
          oxygen_saturation: vitals?.oxygen_saturation ?? '',
          weight: vitals?.weight ?? '',
          blood_sugar: vitals?.blood_sugar ?? '',
        })
        setLoaded(true)
      },
    )
  }, [editing, visitId])

  if (!loaded) return <Loading />

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value })

  const save = async (mode: 'save' | 'prescription') => {
    if (!patient) {
      toast('Select a patient first', 'error')
      return
    }
    if (!form.chiefComplaints.trim() && !form.provisionalDiagnosis.trim()) {
      toast('Enter a chief complaint or diagnosis', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        patientId: patient.id,
        visitDate: form.visitDate,
        visitTime: form.visitTime || null,
        visitType: form.visitType,
        chiefComplaints: form.chiefComplaints,
        symptoms: form.symptoms,
        symptomDuration: form.symptomDuration,
        examinationFindings: form.examinationFindings,
        provisionalDiagnosis: form.provisionalDiagnosis,
        finalDiagnosis: form.finalDiagnosis,
        doctorNotes: form.doctorNotes,
        advice: form.advice,
        followUpDate: form.followUpRequired === 'Yes' && form.followUpDate ? form.followUpDate : null,
        vitals: {
          temperature: form.temperature || null,
          pulse: form.pulse || null,
          systolic_bp: form.systolicBp || null,
          diastolic_bp: form.diastolicBp || null,
          respiratory_rate: form.respiratory_rate || null,
          oxygen_saturation: form.oxygen_saturation || null,
          weight: form.weight || null,
          blood_sugar: form.blood_sugar || null,
        },
      }
      const visit = editing ? await api.updateVisit(Number(visitId), payload) : await api.createVisit(payload)
      toast(editing ? 'Visit updated' : 'Visit saved')

      if (mode === 'prescription') {
        navigate(`/visits/${visit.id}/prescription`)
        return
      }

      navigate(`/visits/${visit.id}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save visit', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <div className="titles">
          <div className="crumbs">
            <Link to="/visits">Visits</Link>
            <span className="sep">/</span>
            {patient && (
              <>
                <Link to={`/patients/${patient.id}`}>{patient.full_name}</Link>
                <span className="sep">/</span>
              </>
            )}
            <span>{editing ? 'Edit Visit' : 'New Visit'}</span>
          </div>
          <h1 className="page-title">{editing ? 'Update Visit Details' : 'Add Visit'}</h1>
          <p className="page-sub">
            {editing
              ? 'Update visit details and clinical information'
              : 'Record visit details, vitals, and clinical notes'}
          </p>
        </div>
      </div>

      <div className="grid cols-1-3 visit-form-layout">
        <div className="card card-pad" style={{ alignSelf: 'flex-start' }}>
          {!patient ? (
            <>
              <div className="section-label">Patient Summary</div>
              <PatientPicker onPick={(p) => loadPatient(p.id)} />
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', margin: '4px 0 18px' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar name={patient.full_name} size={78} />
                  <span
                    style={{
                      position: 'absolute',
                      right: -2,
                      bottom: -2,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'var(--green-600)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #fff',
                    }}
                  >
                    <ICheck size={12} />
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, marginTop: 12 }}>{patient.full_name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                  Patient ID: {patient.patient_code}
                </div>
              </div>

              <div className="visit-patient-meta">
                <div className="visit-meta-row">
                  <IClock size={16} />
                  <span className="k">Age</span>
                  <span className="v">{patient.age != null ? `${patient.age} Years` : '—'}</span>
                </div>
                <div className="visit-meta-row">
                  <IPatients size={16} />
                  <span className="k">Gender</span>
                  <span className="v">{patient.gender ?? '—'}</span>
                </div>
                <div className="visit-meta-row">
                  <IPhone size={16} />
                  <span className="k">Phone</span>
                  <span className="v">{patient.mobile ?? '—'}</span>
                </div>
                <div className="visit-meta-row">
                  <ICalendar size={16} />
                  <span className="k">Last Visit</span>
                  <span className="v">{fmtDate(patientStats.lastVisit)}</span>
                </div>
                <div className="visit-meta-row">
                  <IClipboard size={16} />
                  <span className="k">Total Visits</span>
                  <span className="v">{patientStats.totalVisits}</span>
                </div>
                <div className="visit-meta-row">
                  <IMoney size={16} />
                  <span className="k">Outstanding Amount</span>
                  <span className="v" style={{ color: patientStats.outstanding > 0 ? 'var(--red)' : undefined, fontWeight: 700 }}>
                    {money(patientStats.outstanding)}
                  </span>
                </div>
              </div>

              {!editing && !patientId && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={() => setPatient(null)}>
                  Change patient
                </button>
              )}
            </>
          )}
        </div>

        <div className="card">
          <div className="card-pad">
            <div className="form-section-title">
              <ICalendar size={17} /> Visit Details
            </div>

            <div className="form-grid g2">
              <Field label="Visit Date" required>
                <input className="input" type="date" value={form.visitDate} onChange={set('visitDate')} />
              </Field>
              <Field label="Visit Time" required>
                <input className="input" type="time" value={form.visitTime} onChange={set('visitTime')} />
              </Field>
              <Field label="Chief Complaint" required>
                <input
                  className="input"
                  value={form.chiefComplaints}
                  onChange={set('chiefComplaints')}
                  placeholder="Fever and headache for 2 days"
                />
              </Field>
              <Field label="Duration of Complaint" optional>
                <input
                  className="input"
                  value={form.symptomDuration}
                  onChange={set('symptomDuration')}
                  placeholder="e.g. 2 days"
                />
              </Field>
            </div>

            <div style={{ marginTop: 14 }}>
              <Field label="Symptoms">
                <SymptomsInput value={form.symptoms} onChange={(v) => setForm({ ...form, symptoms: v })} />
              </Field>
            </div>

            <div className="form-section-title" style={{ marginTop: 22 }}>
              <IVitals size={17} /> Vitals
            </div>
            <div className="form-grid g3">
              <Field label="Temperature">
                <div className="input-affix">
                  <input
                    className="input"
                    value={form.temperature}
                    onChange={set('temperature')}
                    placeholder="98.6"
                  />
                  <span className="affix">°F</span>
                </div>
              </Field>
              <Field label="Blood Pressure">
                <div className="bp-inputs">
                  <input
                    className="input"
                    value={form.systolicBp}
                    onChange={set('systolicBp')}
                    placeholder="120"
                    inputMode="numeric"
                  />
                  <span className="bp-sep">/</span>
                  <input
                    className="input"
                    value={form.diastolicBp}
                    onChange={set('diastolicBp')}
                    placeholder="80"
                    inputMode="numeric"
                  />
                  <span className="affix-inline">mmHg</span>
                </div>
              </Field>
              <Field label="Pulse">
                <div className="input-affix">
                  <input className="input" value={form.pulse} onChange={set('pulse')} placeholder="72" />
                  <span className="affix">bpm</span>
                </div>
              </Field>
            </div>
            <div className="form-grid g4" style={{ marginTop: 12 }}>
              <Field label="Respiratory Rate" optional>
                <input className="input" value={form.respiratory_rate} onChange={set('respiratory_rate')} placeholder="16" />
              </Field>
              <Field label="SpO₂ (%)" optional>
                <input className="input" value={form.oxygen_saturation} onChange={set('oxygen_saturation')} placeholder="98" />
              </Field>
              <Field label="Weight (kg)" optional>
                <input className="input" value={form.weight} onChange={set('weight')} placeholder="68" />
              </Field>
              <Field label="Blood Sugar (mg/dL)" optional>
                <input className="input" value={form.blood_sugar} onChange={set('blood_sugar')} placeholder="110" />
              </Field>
            </div>

            <div style={{ marginTop: 18 }}>
              <Field label="Diagnosis / Provisional Diagnosis" required>
                <input
                  className="input"
                  value={form.provisionalDiagnosis}
                  onChange={set('provisionalDiagnosis')}
                  placeholder="Enter diagnosis or provisional diagnosis"
                />
              </Field>
            </div>

            <div className="form-grid g2" style={{ marginTop: 14 }}>
              <Field label="Notes" optional>
                <textarea
                  className="textarea"
                  value={form.doctorNotes}
                  onChange={set('doctorNotes')}
                  placeholder="Clinical notes about the visit"
                />
              </Field>
              <Field label="Advice / Plan">
                <textarea
                  className="textarea"
                  value={form.advice}
                  onChange={set('advice')}
                  placeholder="Advice or treatment plan for the patient"
                />
              </Field>
            </div>

            <div className="form-grid g2" style={{ marginTop: 14 }}>
              <Field label="Consultation Type">
                <select className="select" value={form.visitType} onChange={set('visitType')}>
                  {VISIT_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Follow-up Required">
                <select
                  className="select"
                  value={form.followUpRequired}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      followUpRequired: e.target.value === 'Yes' ? 'Yes' : 'No',
                      followUpDate: e.target.value === 'Yes' ? form.followUpDate : '',
                    })
                  }
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </Field>
              {form.followUpRequired === 'Yes' && (
                <Field label="Follow-up Date">
                  <input className="input" type="date" value={form.followUpDate} onChange={set('followUpDate')} />
                </Field>
              )}
              <Field label="Final Diagnosis" optional>
                <input
                  className="input"
                  value={form.finalDiagnosis}
                  onChange={set('finalDiagnosis')}
                  placeholder="Final diagnosis (if confirmed)"
                />
              </Field>
              <Field label="Examination Findings" optional>
                <textarea
                  className="textarea"
                  value={form.examinationFindings}
                  onChange={set('examinationFindings')}
                  placeholder="Examination findings"
                />
              </Field>
            </div>
          </div>

          <div className="form-footer visit-form-actions">
            <button className="btn btn-outline" onClick={() => navigate(-1)} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-outline" onClick={() => save('prescription')} disabled={saving || !patient}>
              <IRx size={15} /> Prescription
            </button>
            <button className="btn btn-primary" onClick={() => save('save')} disabled={saving || !patient}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
