import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Field, Loading, useSettings, useToast } from '../components/ui'
import { IFolder, IRefresh, IDownload } from '../components/icons'
import type { ClinicSettings } from '@shared/types'

export default function SettingsPage() {
  const { settings: current, reload } = useSettings()
  const [form, setForm] = useState<ClinicSettings | null>(null)
  const [dataDir, setDataDir] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    setForm({ ...current })
  }, [current])

  useEffect(() => {
    api.getAppInfo().then((info) => setDataDir(info.dataDir)).catch(() => {})
  }, [])

  if (!form) return <Loading />

  const set = (key: keyof ClinicSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value })

  const save = async () => {
    setSaving(true)
    try {
      await api.saveSettings({
        ...form,
        default_consultation_fee: Number(form.default_consultation_fee),
        default_followup_fee: Number(form.default_followup_fee),
        tax_percent: Number(form.tax_percent),
      })
      reload()
      toast('Settings saved')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const backup = async () => {
    try {
      const file = await api.createBackup()
      toast(`Backup created: ${file}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Backup failed', 'error')
    }
  }

  const restore = async () => {
    if (!window.confirm('Restoring a backup will replace current data. A safety backup is created first. Continue?')) return
    try {
      const file = await api.restoreBackup()
      if (file) {
        toast('Backup restored. Data reloaded.')
        reload()
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Restore failed', 'error')
    }
  }

  const changeDataDir = async () => {
    if (!window.confirm('Change the data folder? The database will be copied to the new folder and the app will restart.')) return
    await api.changeDataDir()
  }

  return (
    <div>
      <div className="page-head">
        <div className="titles">
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Manage clinic preferences, doctor profile, local storage and backups.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            ✓ Save Changes
          </button>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        <div className="card card-pad">
          <div className="form-section-title">🏥 Clinic Information</div>
          <div className="form-grid g2">
            <Field label="Clinic Name" required>
              <input className="input" value={form.clinic_name} onChange={set('clinic_name')} />
            </Field>
            <Field label="Phone">
              <input className="input" value={form.clinic_phone} onChange={set('clinic_phone')} />
            </Field>
            <Field label="Email">
              <input className="input" value={form.clinic_email} onChange={set('clinic_email')} />
            </Field>
            <Field label="Address">
              <input className="input" value={form.clinic_address} onChange={set('clinic_address')} />
            </Field>
          </div>

          <div className="form-section-title" style={{ marginTop: 22 }}>👨‍⚕️ Doctor Profile</div>
          <div className="form-grid g2">
            <Field label="Doctor Name" required>
              <input className="input" value={form.doctor_name} onChange={set('doctor_name')} />
            </Field>
            <Field label="Qualifications">
              <input className="input" value={form.doctor_degrees} onChange={set('doctor_degrees')} placeholder="MBBS, MD (Medicine)" />
            </Field>
            <Field label="Specialization">
              <input className="input" value={form.doctor_specialization} onChange={set('doctor_specialization')} placeholder="Consultant Physician" />
            </Field>
            <Field label="Registration No.">
              <input className="input" value={form.doctor_registration} onChange={set('doctor_registration')} placeholder="REG-12345" />
            </Field>
          </div>
        </div>

        <div className="card card-pad">
          <div className="form-section-title">💰 Fees & Billing</div>
          <div className="form-grid g2">
            <Field label="Default Consultation Fee (₹)">
              <input className="input" type="number" min={0} value={form.default_consultation_fee} onChange={set('default_consultation_fee')} />
            </Field>
            <Field label="Follow-up Consultation Fee (₹)">
              <input className="input" type="number" min={0} value={form.default_followup_fee} onChange={set('default_followup_fee')} />
            </Field>
            <Field label="Bill Prefix">
              <input className="input" value={form.bill_prefix} onChange={set('bill_prefix')} placeholder="BILL" />
            </Field>
            <Field label="Invoice Prefix">
              <input className="input" value={form.invoice_prefix} onChange={set('invoice_prefix')} placeholder="INV" />
            </Field>
            <Field label="Tax">
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="select" style={{ width: 110 }} value={form.tax_enabled} onChange={set('tax_enabled')}>
                  <option value="0">Disabled</option>
                  <option value="1">Enabled</option>
                </select>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  value={form.tax_percent}
                  onChange={set('tax_percent')}
                  disabled={form.tax_enabled !== '1'}
                  placeholder="GST %"
                />
              </div>
            </Field>
          </div>

          <div className="form-section-title" style={{ marginTop: 22 }}>
            <IFolder size={17} /> Data & Storage
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>
            All data is stored locally on this device in offline mode.
          </div>
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 9,
              padding: '10px 12px',
              fontSize: 12.5,
              wordBreak: 'break-all',
              marginBottom: 10,
            }}
          >
            {dataDir || 'Loading…'}
          </div>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={() => api.openPath(dataDir)}>
              <IFolder size={14} /> Open Folder
            </button>
            <button className="btn btn-outline btn-sm" onClick={changeDataDir}>
              <IRefresh size={14} /> Change Data Folder…
            </button>
          </div>

          <div className="form-section-title" style={{ marginTop: 22 }}>
            <IDownload size={17} /> Backup & Restore
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
            Create regular backups of the clinic database. Restoring replaces current data (a safety copy is made first).
          </div>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={backup}>
              Create Backup Now
            </button>
            <button className="btn btn-outline btn-sm" onClick={restore}>
              Restore Backup
            </button>
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          Medicines, prescription dropdown options (Form / Frequency / Instructions), tests and services are managed in{' '}
          <Link to="/catalog" style={{ color: 'var(--green-700)', fontWeight: 600 }}>
            Catalog
          </Link>
          . Open Catalog from the sidebar to edit those lists.
        </div>
      </div>
    </div>
  )
}
