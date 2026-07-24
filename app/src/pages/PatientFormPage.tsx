import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Field, Loading, useToast } from '../components/ui'
import { IHeart, IPatients, IPhone, IClipboard } from '../components/icons'
import type { Patient } from '@shared/types'

const emptyForm = {
  full_name: '',
  gender: '',
  date_of_birth: '',
  age: '',
  mobile: '',
  alternate_mobile: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pin_code: '',
  blood_group: '',
  marital_status: '',
  allergies: '',
  medical_conditions: '',
  current_medications: '',
  emergency_contact_name: '',
  emergency_contact_number: '',
  emergency_contact_relation: '',
  emergency_contact_address: '',
  notes: '',
}

type FormState = typeof emptyForm

export default function PatientFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const [form, setForm] = useState<FormState | null>(editing ? null : emptyForm)
  const [saving, setSaving] = useState(false)
  const [duplicates, setDuplicates] = useState<Patient[]>([])
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    if (!editing) return
    api.getPatient(Number(id)).then((p: Patient | null) => {
      if (!p) return
      setForm({
        full_name: p.full_name,
        gender: p.gender ?? '',
        date_of_birth: p.date_of_birth ?? '',
        age: p.age != null ? String(p.age) : '',
        mobile: p.mobile ?? '',
        alternate_mobile: p.alternate_mobile ?? '',
        email: p.email ?? '',
        address: p.address ?? '',
        city: p.city ?? '',
        state: p.state ?? '',
        pin_code: p.pin_code ?? '',
        blood_group: p.blood_group ?? '',
        marital_status: p.marital_status ?? '',
        allergies: p.allergies ?? '',
        medical_conditions: p.medical_conditions ?? '',
        current_medications: p.current_medications ?? '',
        emergency_contact_name: p.emergency_contact_name ?? '',
        emergency_contact_number: p.emergency_contact_number ?? '',
        emergency_contact_relation: p.emergency_contact_relation ?? '',
        emergency_contact_address: p.emergency_contact_address ?? '',
        notes: p.notes ?? '',
      })
    })
  }, [editing, id])

  // Duplicate check while typing name/mobile (create only)
  useEffect(() => {
    if (editing || !form?.full_name.trim()) {
      setDuplicates([])
      return
    }
    const t = setTimeout(() => {
      api
        .findDuplicates({
          fullName: form.full_name,
          mobile: form.mobile || null,
          age: form.age ? Number(form.age) : null,
          dateOfBirth: form.date_of_birth || null,
        })
        .then(setDuplicates)
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [editing, form?.full_name, form?.mobile, form?.age, form?.date_of_birth])

  if (!form) return <Loading />

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value })

  const save = async () => {
    if (!form.full_name.trim()) {
      toast('Full name is required', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        full_name: form.full_name,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        age: form.age ? Number(form.age) : null,
        mobile: form.mobile || null,
        alternate_mobile: form.alternate_mobile || null,
        email: form.email || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        pin_code: form.pin_code || null,
        blood_group: form.blood_group || null,
        marital_status: form.marital_status || null,
        allergies: form.allergies || null,
        medical_conditions: form.medical_conditions || null,
        current_medications: form.current_medications || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_number: form.emergency_contact_number || null,
        emergency_contact_relation: form.emergency_contact_relation || null,
        emergency_contact_address: form.emergency_contact_address || null,
        notes: form.notes || null,
      }
      const saved = editing ? await api.updatePatient(Number(id), payload) : await api.createPatient(payload)
      toast(editing ? 'Patient updated' : `Patient ${saved.patient_code} created`)
      navigate(`/patients/${saved.id}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save patient', 'error')
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
            <span>{editing ? 'Edit Patient' : 'Add New Patient'}</span>
          </div>
          <h1 className="page-title">{editing ? 'Edit Patient' : 'Add New Patient'}</h1>
          <p className="page-sub">
            {editing ? 'Update patient information.' : 'Enter patient information to create a new patient record.'}
          </p>
        </div>
      </div>

      {duplicates.length > 0 && (
        <div
          className="card card-pad"
          style={{ marginBottom: 14, borderColor: '#f0d9a8', background: 'var(--amber-bg)' }}
        >
          <strong style={{ color: 'var(--amber)', fontSize: 13 }}>⚠ Possible duplicate patient</strong>
          <div style={{ fontSize: 12.5, marginTop: 6 }}>
            {duplicates.map((d) => (
              <div key={d.id} style={{ marginBottom: 3 }}>
                <Link to={`/patients/${d.id}`}>
                  {d.full_name} ({d.patient_code}){d.mobile ? ` · ${d.mobile}` : ''}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid cols-2" style={{ marginBottom: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card card-pad">
            <div className="form-section-title">
              <IPatients size={17} /> Personal Information
            </div>
            <div className="form-grid g2">
              <Field label="Full Name" required>
                <input className="input" value={form.full_name} onChange={set('full_name')} placeholder="Enter full name" autoFocus />
              </Field>
              <div className="form-grid g2">
                <Field label="Age">
                  <input className="input" type="number" min={0} value={form.age} onChange={set('age')} placeholder="Age" />
                </Field>
                <Field label="Gender">
                  <select className="select" value={form.gender} onChange={set('gender')}>
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </Field>
              </div>
              <Field label="Date of Birth">
                <input className="input" type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
              </Field>
              <Field label="Blood Group">
                <select className="select" value={form.blood_group} onChange={set('blood_group')}>
                  <option value="">Select blood group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </Field>
              <Field label="Marital Status">
                <select className="select" value={form.marital_status} onChange={set('marital_status')}>
                  <option value="">Select</option>
                  <option>Single</option>
                  <option>Married</option>
                  <option>Divorced</option>
                  <option>Widowed</option>
                  <option>Other</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="card card-pad">
            <div className="form-section-title">
              <IHeart size={17} /> Medical Information
            </div>
            <div className="form-grid g2">
              <Field label="Allergies">
                <textarea className="textarea" value={form.allergies} onChange={set('allergies')} placeholder="List any known allergies" />
              </Field>
              <Field label="Chronic Conditions">
                <textarea
                  className="textarea"
                  value={form.medical_conditions}
                  onChange={set('medical_conditions')}
                  placeholder="e.g. Diabetes, Hypertension"
                />
              </Field>
            </div>
            <div style={{ marginTop: 14 }}>
              <Field label="Current Medications">
                <textarea
                  className="textarea"
                  value={form.current_medications}
                  onChange={set('current_medications')}
                  placeholder="List medicines the patient is currently taking"
                />
              </Field>
            </div>
          </div>

          <div className="card card-pad">
            <div className="form-section-title">
              <IPhone size={17} /> Emergency Contact
            </div>
            <div className="form-grid g2">
              <Field label="Contact Name">
                <input className="input" value={form.emergency_contact_name} onChange={set('emergency_contact_name')} placeholder="Enter contact name" />
              </Field>
              <Field label="Relation">
                <input
                  className="input"
                  value={form.emergency_contact_relation}
                  onChange={set('emergency_contact_relation')}
                  placeholder="e.g. Spouse, Parent, Sibling"
                />
              </Field>
              <Field label="Phone Number">
                <input className="input" value={form.emergency_contact_number} onChange={set('emergency_contact_number')} placeholder="Contact number" />
              </Field>
            </div>
            <div style={{ marginTop: 14 }}>
              <Field label="Address">
                <textarea
                  className="textarea"
                  value={form.emergency_contact_address}
                  onChange={set('emergency_contact_address')}
                  placeholder="Emergency contact address"
                />
              </Field>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card card-pad">
            <div className="form-section-title">
              <IPhone size={17} /> Contact Information
            </div>
            <div className="form-grid g2">
              <Field label="Phone Number">
                <input className="input" value={form.mobile} onChange={set('mobile')} placeholder="Mobile number" />
              </Field>
              <Field label="Alternate Number">
                <input className="input" value={form.alternate_mobile} onChange={set('alternate_mobile')} placeholder="Alternate number" />
              </Field>
              <Field label="Email Address">
                <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="Email address" />
              </Field>
              <Field label="PIN Code">
                <input className="input" value={form.pin_code} onChange={set('pin_code')} placeholder="PIN code" />
              </Field>
            </div>
            <div style={{ marginTop: 14 }}>
              <Field label="Address">
                <textarea className="textarea" value={form.address} onChange={set('address')} placeholder="Enter full address" />
              </Field>
            </div>
            <div className="form-grid g2" style={{ marginTop: 14 }}>
              <Field label="City">
                <input className="input" value={form.city} onChange={set('city')} placeholder="City" />
              </Field>
              <Field label="State">
                <input className="input" value={form.state} onChange={set('state')} placeholder="State" />
              </Field>
            </div>
          </div>

          <div className="card card-pad">
            <div className="form-section-title">
              <IClipboard size={17} /> Additional Notes
            </div>
            <Field label="Notes">
              <textarea className="textarea" value={form.notes} onChange={set('notes')} placeholder="Add any additional notes about the patient" />
            </Field>
          </div>
        </div>
      </div>

      <div className="form-footer" style={{ borderTop: 'none', padding: '4px 0 0', background: 'transparent', position: 'static' }}>
        <button className="btn btn-outline" onClick={() => navigate(-1)}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save Changes' : 'Save Patient'}
        </button>
      </div>
    </div>
  )
}
