import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtDate, todayIso, ageGender } from '../lib/format'
import { Avatar, Field, Loading, useSettings, useToast } from '../components/ui'
import { IDownload, IEdit, IPrint, ITrash } from '../components/icons'
import type { Medicine, Patient, Prescription, PrescriptionMedicine, Visit } from '@shared/types'

interface MedRow {
  medicineId: number | null
  medicineName: string
  strength: string
  dosageForm: string
  dose: string
  frequency: string
  duration: string
  timingInstruction: string
  specialInstructions: string
}

const emptyRow = (): MedRow => ({
  medicineId: null,
  medicineName: '',
  strength: '',
  dosageForm: '',
  dose: '',
  frequency: '',
  duration: '',
  timingInstruction: '',
  specialInstructions: '',
})

function MedicineCombo({
  value,
  onChange,
  onPick,
}: {
  value: string
  onChange: (v: string) => void
  onPick: (m: Medicine) => void
}) {
  const [options, setOptions] = useState<Medicine[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => api.searchMedicines(value).then(setOptions), 150)
    return () => clearTimeout(t)
  }, [value, open])

  return (
    <div className="combo" ref={ref}>
      <input
        className="input"
        value={value}
        placeholder="Medicine name"
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (options.length > 0 || value.trim()) && (
        <div className="combo-list">
          {options.map((m) => (
            <div
              key={m.id}
              className="combo-item"
              onClick={() => {
                onPick(m)
                setOpen(false)
              }}
            >
              <span>
                <strong>{m.name}</strong>
                {m.strength ? ` ${m.strength}` : ''}
              </span>
              <span className="meta">{m.dosage_form ?? ''}</span>
            </div>
          ))}
          {value.trim() && !options.some((m) => m.name.toLowerCase() === value.trim().toLowerCase()) && (
            <div className="combo-new" onClick={() => setOpen(false)}>
              + “{value.trim()}” will be added to the medicine database when this prescription is saved
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Editable dropdown: shows saved options, but the doctor can type anything.
 * Custom values are added to the options list when the prescription is saved.
 */
function OptionCombo({
  value,
  onChange,
  options,
  placeholder,
  minWidth = 100,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  minWidth?: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  const q = value.trim().toLowerCase()
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q)) : options
  const isNew = q.length > 0 && !options.some((o) => o.toLowerCase() === q)

  return (
    <div className="combo" ref={ref} style={{ minWidth }}>
      <input
        className="input"
        style={{ minWidth }}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (filtered.length > 0 || isNew) && (
        <div className="combo-list">
          {filtered.map((o) => (
            <div
              key={o}
              className="combo-item"
              onClick={() => {
                onChange(o)
                setOpen(false)
              }}
            >
              <span>{o}</span>
            </div>
          ))}
          {isNew && (
            <div className="combo-new" onClick={() => setOpen(false)}>
              + “{value.trim()}” will be added to the options when saved
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface OptionLists {
  dosage_form: string[]
  frequency: string[]
  timing: string[]
}

export default function PrescriptionFormPage() {
  const { visitId } = useParams()
  const [visit, setVisit] = useState<Visit | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [rxId, setRxId] = useState<number | undefined>()
  const [form, setForm] = useState({
    prescriptionDate: todayIso(),
    diagnosis: '',
    advice: '',
    testsAdvised: '',
    followUpDate: '',
    notes: '',
  })
  const [meds, setMeds] = useState<MedRow[]>([emptyRow()])
  const [optionLists, setOptionLists] = useState<OptionLists>({ dosage_form: [], frequency: [], timing: [] })
  const [saving, setSaving] = useState(false)
  const [loadedRx, setLoadedRx] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const { settings } = useSettings()

  useEffect(() => {
    Promise.all([api.listOptions('dosage_form'), api.listOptions('frequency'), api.listOptions('timing')]).then(
      ([forms, freqs, timings]: { name: string }[][]) =>
        setOptionLists({
          dosage_form: forms.map((o) => o.name),
          frequency: freqs.map((o) => o.name),
          timing: timings.map((o) => o.name),
        }),
    )
  }, [])

  useEffect(() => {
    const id = Number(visitId)
    api.getVisit(id).then((v: Visit | null) => {
      setVisit(v)
      if (!v) return
      api.getPatient(v.patient_id).then(setPatient)
      api.getPrescriptionByVisit(id).then((rx: (Prescription & { medicines: PrescriptionMedicine[] }) | null) => {
        if (rx) {
          setRxId(rx.id)
          setForm({
            prescriptionDate: rx.prescription_date,
            diagnosis: rx.diagnosis ?? '',
            advice: rx.advice ?? '',
            testsAdvised: rx.tests_advised ?? '',
            followUpDate: rx.follow_up_date ?? '',
            notes: rx.notes ?? '',
          })
          setMeds(
            rx.medicines.length
              ? rx.medicines.map((m) => ({
                  medicineId: m.medicine_id,
                  medicineName: m.medicine_name_snapshot,
                  strength: m.strength_snapshot ?? '',
                  dosageForm: m.dosage_form_snapshot ?? '',
                  dose: m.dose ?? '',
                  frequency: m.frequency ?? '',
                  duration: m.duration ?? '',
                  timingInstruction: m.timing_instruction ?? '',
                  specialInstructions: m.special_instructions ?? '',
                }))
              : [emptyRow()],
          )
        } else {
          setForm((f) => ({
            ...f,
            diagnosis: v.final_diagnosis || v.provisional_diagnosis || '',
            advice: v.advice || '',
            followUpDate: v.follow_up_date || '',
          }))
        }
        setLoadedRx(true)
      })
    })
  }, [visitId])

  if (!visit || !patient || !loadedRx) return <Loading />

  const updateMed = (i: number, patch: Partial<MedRow>) => setMeds(meds.map((m, idx) => (idx === i ? { ...m, ...patch } : m)))

  const save = async (print = false) => {
    const validMeds = meds.filter((m) => m.medicineName.trim())
    if (validMeds.length === 0) {
      toast('Add at least one medicine', 'error')
      return
    }
    setSaving(true)
    try {
      const rx = await api.savePrescription({
        id: rxId,
        patientId: patient.id,
        visitId: visit.id,
        prescriptionDate: form.prescriptionDate,
        diagnosis: form.diagnosis,
        testsAdvised: form.testsAdvised,
        advice: form.advice,
        followUpDate: form.followUpDate || null,
        notes: form.notes,
        status: 'draft',
        medicines: validMeds,
      })
      setRxId(rx.id)
      toast('Prescription saved')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save prescription', 'error')
      setSaving(false)
      return
    }
    if (print) {
      try {
        await api.printPrescription(visit.id)
      } catch (err) {
        toast(`Prescription saved, but printing failed: ${err instanceof Error ? err.message : 'unknown error'}`, 'error')
      }
    }
    setSaving(false)
  }

  const savePdf = async () => {
    const validMeds = meds.filter((m) => m.medicineName.trim())
    if (validMeds.length === 0) {
      toast('Add at least one medicine', 'error')
      return
    }
    setSaving(true)
    try {
      const rx = await api.savePrescription({
        id: rxId,
        patientId: patient.id,
        visitId: visit.id,
        prescriptionDate: form.prescriptionDate,
        diagnosis: form.diagnosis,
        testsAdvised: form.testsAdvised,
        advice: form.advice,
        followUpDate: form.followUpDate || null,
        notes: form.notes,
        status: 'draft',
        medicines: validMeds,
      })
      setRxId(rx.id)
      const file = await api.pdfPrescription(visit.id)
      toast(`PDF saved: ${file}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save PDF', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <div className="titles">
          <div className="crumbs">
            <Link to="/patients">Patients</Link>
            <span className="sep">/</span>
            <Link to={`/patients/${patient.id}`}>{patient.full_name}</Link>
            <span className="sep">/</span>
            <Link to={`/visits/${visit.id}`}>Visit on {fmtDate(visit.visit_date)}</Link>
            <span className="sep">/</span>
            <span>{rxId ? 'Prescription' : 'Add Prescription'}</span>
          </div>
          <h1 className="page-title">{rxId ? 'Prescription' : 'Add Prescription'}</h1>
        </div>
        <div className="page-actions">
          <Link to={`/visits/${visit.id}`} className="btn btn-outline">
            ← Back to Visit
          </Link>
          <Link to={`/visits/${visit.id}/edit`} className="btn btn-outline">
            <IEdit size={15} /> Edit Visit
          </Link>
        </div>
      </div>

      <div className="card person-card" style={{ marginBottom: 16 }}>
        <Avatar name={patient.full_name} size={50} />
        <div className="who">
          <div className="nm">{patient.full_name}</div>
          <div className="pid">
            Patient ID: {patient.patient_code} · {ageGender(patient.age, patient.gender)}
            {patient.mobile ? ` · ${patient.mobile}` : ''}
          </div>
        </div>
        <div className="person-meta">
          <div className="m">
            <div className="l">Diagnosis</div>
            <div className="v">{visit.final_diagnosis || visit.provisional_diagnosis || '—'}</div>
          </div>
          <div className="m">
            <div className="l">Visit Date</div>
            <div className="v">{fmtDate(visit.visit_date)}</div>
          </div>
          <div className="m">
            <div className="l">Prescribed By</div>
            <div className="v">{settings.doctor_name}</div>
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="form-section-title">℞ Prescription Details</div>
        <div className="form-grid g4">
          <Field label="Prescription Date" required>
            <input className="input" type="date" value={form.prescriptionDate} onChange={(e) => setForm({ ...form, prescriptionDate: e.target.value })} />
          </Field>
          <Field label="Diagnosis" required>
            <input className="input" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} placeholder="Diagnosis" />
          </Field>
          <Field label="Follow-up Date">
            <input className="input" type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
          </Field>
          <Field label="Tests Advised" optional>
            <input className="input" value={form.testsAdvised} onChange={(e) => setForm({ ...form, testsAdvised: e.target.value })} placeholder="e.g. CBC, Lipid Profile" />
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <Field label="Advice / Notes">
            <textarea
              className="textarea"
              value={form.advice}
              onChange={(e) => setForm({ ...form, advice: e.target.value })}
              placeholder="Plenty of rest and fluids. Take medication as prescribed. Return if symptoms worsen."
            />
          </Field>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h3>Medicines</h3>
          <span className="spacer" />
          <Link to="/catalog?tab=options" className="btn btn-ghost btn-sm" title="Edit Form / Frequency / Instruction options in Catalog">
            Manage dropdown options
          </Link>
          <button className="btn btn-outline btn-sm" onClick={() => setMeds([...meds, emptyRow()])}>
            + Add Medicine
          </button>
        </div>
        <div style={{ padding: '0 16px 12px' }}>
          <button className="btn btn-outline btn-sm" onClick={savePdf} disabled={saving}>
            <IDownload size={14} /> Save as PDF
          </button>
        </div>
        <div className="table-wrap" style={{ overflow: 'visible' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th style={{ minWidth: 190 }}>Medicine Name *</th>
                <th>Strength</th>
                <th>Form</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th style={{ minWidth: 150 }}>Instructions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {meds.map((m, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--muted)' }}>{i + 1}</td>
                  <td>
                    <MedicineCombo
                      value={m.medicineName}
                      onChange={(v) => updateMed(i, { medicineName: v, medicineId: null })}
                      onPick={(med) =>
                        updateMed(i, {
                          medicineId: med.id,
                          medicineName: med.name,
                          strength: med.strength ?? '',
                          dosageForm: med.dosage_form ?? '',
                          dose: m.dose || med.default_dosage_instruction || '',
                        })
                      }
                    />
                  </td>
                  <td>
                    <input className="input" style={{ minWidth: 80 }} value={m.strength} onChange={(e) => updateMed(i, { strength: e.target.value })} placeholder="500 mg" />
                  </td>
                  <td>
                    <OptionCombo
                      value={m.dosageForm}
                      onChange={(v) => updateMed(i, { dosageForm: v })}
                      options={optionLists.dosage_form}
                      placeholder="Tablet"
                      minWidth={90}
                    />
                  </td>
                  <td>
                    <input className="input" style={{ minWidth: 80 }} value={m.dose} onChange={(e) => updateMed(i, { dose: e.target.value })} placeholder="1 Tablet" />
                  </td>
                  <td>
                    <OptionCombo
                      value={m.frequency}
                      onChange={(v) => updateMed(i, { frequency: v })}
                      options={optionLists.frequency}
                      placeholder="BD (Twice daily)"
                      minWidth={130}
                    />
                  </td>
                  <td>
                    <input className="input" style={{ minWidth: 70 }} value={m.duration} onChange={(e) => updateMed(i, { duration: e.target.value })} placeholder="5 Days" />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <OptionCombo
                        value={m.timingInstruction}
                        onChange={(v) => updateMed(i, { timingInstruction: v })}
                        options={optionLists.timing}
                        placeholder="After meals"
                        minWidth={110}
                      />
                      <input
                        className="input"
                        style={{ minWidth: 110 }}
                        value={m.specialInstructions}
                        onChange={(e) => updateMed(i, { specialInstructions: e.target.value })}
                        placeholder="Notes"
                      />
                    </div>
                  </td>
                  <td>
                    <button className="btn btn-danger btn-icon" title="Remove" onClick={() => setMeds(meds.filter((_, idx) => idx !== i))}>
                      <ITrash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="form-footer" style={{ justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => save(false)} disabled={saving}>
              Save
            </button>
            <button className="btn btn-primary" onClick={() => save(true)} disabled={saving}>
              <IPrint size={15} /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
