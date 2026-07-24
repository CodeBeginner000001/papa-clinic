import { useState } from 'react'
import { api } from '../lib/api'
import { fmtDate, fmtTime, todayIso } from '../lib/format'
import { Field, Modal, useToast } from './ui'
import { ICalendar, ICheck, IDownload, IEye } from './icons'
import type { TestStatus } from '@shared/types'

export function testStatusTone(status: TestStatus): 'green' | 'amber' | 'blue' | 'gray' {
  if (status === 'Completed' || status === 'Result received') return 'green'
  if (status === 'Scheduled') return 'blue'
  if (status === 'Cancelled') return 'gray'
  return 'amber'
}

export function fmtScheduledAt(value: string | null | undefined): string {
  if (!value) return '—'
  const [date, time] = value.split(' ')
  if (!date) return value
  return time ? `${fmtDate(date)} · ${fmtTime(time)}` : fmtDate(date)
}

function splitScheduled(value: string | null | undefined): { date: string; time: string } {
  if (!value) return { date: todayIso(), time: '09:00' }
  const [date, time] = value.split(' ')
  return { date: date || todayIso(), time: (time || '09:00').slice(0, 5) }
}

export function ScheduleTestModal({
  testName,
  initialScheduledAt,
  onClose,
  onConfirm,
}: {
  testName: string
  initialScheduledAt?: string | null
  onClose: () => void
  onConfirm: (scheduledAt: string) => Promise<void>
}) {
  const initial = splitScheduled(initialScheduledAt)
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const save = async () => {
    if (!date || !time) {
      toast('Pick a date and time', 'error')
      return
    }
    setSaving(true)
    try {
      await onConfirm(`${date} ${time}`)
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to schedule', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Schedule — ${testName}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            Save Schedule
          </button>
        </>
      }
    >
      <div className="form-grid g2">
        <Field label="Date" required>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Time" required>
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

type WorkflowTest = {
  id: number
  status: TestStatus
  test_name?: string
  test_name_snapshot?: string
  scheduled_at?: string | null
  report_file_name?: string | null
  report_original_name?: string | null
}

export function TestWorkflowActions({
  test,
  onChanged,
  compact = false,
}: {
  test: WorkflowTest
  onChanged: () => void
  compact?: boolean
}) {
  const [scheduling, setScheduling] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const name = test.test_name_snapshot || test.test_name || 'Test'

  const billingToast = (result: unknown, fallback: string) => {
    const r = result as {
      sync?: { updatedBillIds?: number[]; cancelledBillIds?: number[] }
      billing?: { message?: string; collectPayment?: boolean } | null
    } | null
    if (r?.sync?.cancelledBillIds?.length) {
      toast('Test updated — related bill and payments cancelled')
      return
    }
    if (r?.sync?.updatedBillIds?.length) {
      toast('Test updated — bill and payments adjusted')
      return
    }
    if (r?.billing?.message) {
      toast(r.billing.message)
      return
    }
    toast(fallback)
  }

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try {
      const result = await fn()
      billingToast(result, ok)
      onChanged()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const btn = compact ? 'btn btn-outline btn-sm' : 'btn btn-outline btn-sm'

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {(test.status === 'Advised' || test.status === 'Scheduled') && (
          <button
            type="button"
            className={btn}
            disabled={busy}
            onClick={() => setScheduling(true)}
            title="Schedule test"
          >
            <ICalendar size={13} /> {test.status === 'Scheduled' ? 'Reschedule' : 'Schedule'}
          </button>
        )}
        {test.status === 'Scheduled' && (
          <>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => run(() => api.setTestWorkflowStatus(test.id, 'Completed'), 'Marked completed')}
            >
              <ICheck size={13} /> Complete
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={busy}
              onClick={() => {
                if (!window.confirm(`Cancel ${name}? This will remove it from the bill and adjust payments.`)) return
                void run(() => api.setTestWorkflowStatus(test.id, 'Cancelled'), 'Test cancelled')
              }}
            >
              Cancel
            </button>
          </>
        )}
        {test.status === 'Advised' && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`Cancel ${name}? This will remove it from the bill and adjust payments.`)) return
              void run(() => api.setTestWorkflowStatus(test.id, 'Cancelled'), 'Test cancelled')
            }}
          >
            Cancel
          </button>
        )}
        {(test.status === 'Completed' || test.status === 'Result received') && (
          <button
            type="button"
            className={btn}
            disabled={busy}
            onClick={() =>
              run(async () => {
                const updated = await api.uploadTestReport(test.id)
                if (!updated) throw new Error('Upload cancelled')
                return updated
              }, test.report_file_name ? 'Report replaced' : 'Report uploaded')
            }
          >
            <IDownload size={13} /> {test.report_file_name ? 'Replace Report' : 'Upload Report'}
          </button>
        )}
        {test.report_file_name && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => run(() => api.openTestReport(test.id), 'Opening report')}
            title={test.report_original_name || 'View report'}
          >
            <IEye size={13} /> View
          </button>
        )}
      </div>
      {scheduling && (
        <ScheduleTestModal
          testName={name}
          initialScheduledAt={test.scheduled_at}
          onClose={() => setScheduling(false)}
          onConfirm={async (scheduledAt) => {
            await api.scheduleTest(test.id, scheduledAt)
            toast('Test scheduled')
            onChanged()
          }}
        />
      )}
    </>
  )
}
