import { getDb, nextCode } from './database'
import { medicineUniqueKey, normalizeText, todayIso } from '../../shared/utils'
import { normalizePaperSizeId } from '../../shared/paper'
import { normalizeBillPrintLayout, normalizeBillPrintBaseStyle } from '../../shared/bill-print'
import { removeTestReportFile } from '../test-reports'
import type {
  Bill,
  BillItem,
  BillItemInput,
  BillListItem,
  ClinicSettings,
  DashboardData,
  DiscountType,
  Invoice,
  Medicine,
  Patient,
  PatientDashboard,
  PatientListItem,
  Payment,
  PaymentListItem,
  PaymentMode,
  Prescription,
  PrescriptionListItem,
  PrescriptionMedicine,
  PrescriptionMedicineInput,
  PrescriptionStatus,
  ProcedureItem,
  PrintTemplate,
  ReportSummary,
  TestItem,
  TestListItem,
  Visit,
  VisitListItem,
  VisitProcedure,
  VisitTest,
  VisitType,
  VisitVitals,
} from '../../shared/types'

function getSettingMap(): Record<string, string> {
  const rows = getDb().prepare(`SELECT key, value FROM settings`).all() as Array<{
    key: string
    value: string
  }>
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export function getSettings(): ClinicSettings {
  const m = getSettingMap()
  return {
    clinic_name: m.clinic_name ?? 'Clinic',
    clinic_address: m.clinic_address ?? '',
    clinic_phone: m.clinic_phone ?? '',
    clinic_email: m.clinic_email ?? '',
    doctor_name: m.doctor_name ?? 'Dr. Name',
    doctor_degrees: m.doctor_degrees ?? '',
    doctor_registration: m.doctor_registration ?? '',
    doctor_specialization: m.doctor_specialization ?? '',
    default_consultation_fee: Number(m.default_consultation_fee ?? 500),
    default_followup_fee: Number(m.default_followup_fee ?? 300),
    currency: m.currency ?? 'INR',
    tax_enabled: m.tax_enabled ?? '0',
    tax_percent: Number(m.tax_percent ?? 0),
    bill_prefix: m.bill_prefix ?? 'BILL',
    invoice_prefix: m.invoice_prefix ?? 'INV',
    print_letterhead_mode: m.print_letterhead_mode === 'paper' ? 'paper' : 'digital',
    print_header_mm: Number(m.print_header_mm ?? 0),
    print_footer_mm: Number(m.print_footer_mm ?? 0),
    print_paper_size: normalizePaperSizeId(m.print_paper_size),
    bill_print_layout: normalizeBillPrintLayout(m.bill_print_layout),
    bill_print_show_item_type: m.bill_print_show_item_type === '0' ? '0' : '1',
    bill_print_show_patient_details: m.bill_print_show_patient_details === '0' ? '0' : '1',
    bill_print_show_notes: m.bill_print_show_notes === '0' ? '0' : '1',
    bill_print_show_signature: m.bill_print_show_signature === '0' ? '0' : '1',
    bill_print_show_payment_summary: m.bill_print_show_payment_summary === '0' ? '0' : '1',
    bill_print_footer_note:
      m.bill_print_footer_note ?? 'Thank you for choosing our clinic. Get well soon.',
    bill_print_title: (m.bill_print_title || 'Invoice').trim() || 'Invoice',
    bill_print_base_style: normalizeBillPrintBaseStyle(m.bill_print_base_style),
    bill_print_bill_to_label: (m.bill_print_bill_to_label || 'Bill to').trim() || 'Bill to',
    bill_print_details_label: (m.bill_print_details_label || 'Invoice details').trim() || 'Invoice details',
    bill_print_show_qty: m.bill_print_show_qty === '0' ? '0' : '1',
    bill_print_show_rate: m.bill_print_show_rate === '0' ? '0' : '1',
    bill_print_file_name: m.bill_print_file_name ?? '',
    bill_print_file_kind:
      m.bill_print_file_kind === 'pdf' || m.bill_print_file_kind === 'image' || m.bill_print_file_kind === 'word'
        ? m.bill_print_file_kind
        : '',
    bill_print_original_name: m.bill_print_original_name ?? '',
  }
}

export function saveSettings(settings: Partial<ClinicSettings>): ClinicSettings {
  const stmt = getDb().prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  )
  const entries: Array<[string, string]> = [
    ['clinic_name', String(settings.clinic_name ?? '')],
    ['clinic_address', String(settings.clinic_address ?? '')],
    ['clinic_phone', String(settings.clinic_phone ?? '')],
    ['clinic_email', String(settings.clinic_email ?? '')],
    ['doctor_name', String(settings.doctor_name ?? '')],
    ['doctor_degrees', String(settings.doctor_degrees ?? '')],
    ['doctor_registration', String(settings.doctor_registration ?? '')],
    ['doctor_specialization', String(settings.doctor_specialization ?? '')],
    ['default_consultation_fee', String(settings.default_consultation_fee ?? 0)],
    ['default_followup_fee', String(settings.default_followup_fee ?? 0)],
    ['currency', String(settings.currency ?? 'INR')],
    ['tax_enabled', String(settings.tax_enabled ?? '0')],
    ['tax_percent', String(settings.tax_percent ?? 0)],
    ['bill_prefix', String(settings.bill_prefix ?? 'BILL')],
    ['invoice_prefix', String(settings.invoice_prefix ?? 'INV')],
    ['print_letterhead_mode', settings.print_letterhead_mode === 'paper' ? 'paper' : 'digital'],
    ['print_header_mm', String(Math.max(0, Number(settings.print_header_mm ?? 0)))],
    ['print_footer_mm', String(Math.max(0, Number(settings.print_footer_mm ?? 0)))],
    ['print_paper_size', normalizePaperSizeId(settings.print_paper_size)],
    ['bill_print_layout', normalizeBillPrintLayout(settings.bill_print_layout)],
    ['bill_print_show_item_type', settings.bill_print_show_item_type === '0' ? '0' : '1'],
    [
      'bill_print_show_patient_details',
      settings.bill_print_show_patient_details === '0' ? '0' : '1',
    ],
    ['bill_print_show_notes', settings.bill_print_show_notes === '0' ? '0' : '1'],
    ['bill_print_show_signature', settings.bill_print_show_signature === '0' ? '0' : '1'],
    [
      'bill_print_show_payment_summary',
      settings.bill_print_show_payment_summary === '0' ? '0' : '1',
    ],
    ['bill_print_footer_note', String(settings.bill_print_footer_note ?? '')],
    ['bill_print_title', String(settings.bill_print_title ?? 'Invoice').trim() || 'Invoice'],
    ['bill_print_base_style', normalizeBillPrintBaseStyle(settings.bill_print_base_style)],
    [
      'bill_print_bill_to_label',
      String(settings.bill_print_bill_to_label ?? 'Bill to').trim() || 'Bill to',
    ],
    [
      'bill_print_details_label',
      String(settings.bill_print_details_label ?? 'Invoice details').trim() || 'Invoice details',
    ],
    ['bill_print_show_qty', settings.bill_print_show_qty === '0' ? '0' : '1'],
    ['bill_print_show_rate', settings.bill_print_show_rate === '0' ? '0' : '1'],
    ['bill_print_file_name', String(settings.bill_print_file_name ?? '')],
    [
      'bill_print_file_kind',
      settings.bill_print_file_kind === 'pdf' ||
      settings.bill_print_file_kind === 'image' ||
      settings.bill_print_file_kind === 'word'
        ? settings.bill_print_file_kind
        : '',
    ],
    ['bill_print_original_name', String(settings.bill_print_original_name ?? '')],
  ]
  const tx = getDb().transaction(() => {
    for (const [k, v] of entries) stmt.run(k, v)
  })
  tx()
  return getSettings()
}

function syncActiveTemplateToSettings(tpl: PrintTemplate): void {
  const stmt = getDb().prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  )
  stmt.run('print_letterhead_mode', tpl.letterhead_mode)
  stmt.run('print_header_mm', String(tpl.header_mm))
  stmt.run('print_footer_mm', String(tpl.footer_mm))
  stmt.run('print_paper_size', normalizePaperSizeId(tpl.paper_size))
}

export function listPrintTemplates(): PrintTemplate[] {
  ensureDefaultPrintTemplate()
  return getDb()
    .prepare(`SELECT * FROM print_templates ORDER BY is_active DESC, name COLLATE NOCASE`)
    .all() as PrintTemplate[]
}

export function getActivePrintTemplate(): PrintTemplate | null {
  ensureDefaultPrintTemplate()
  return (
    (getDb().prepare(`SELECT * FROM print_templates WHERE is_active=1 LIMIT 1`).get() as PrintTemplate | undefined) ??
    null
  )
}

export function getPrintTemplate(id: number): PrintTemplate | null {
  return (getDb().prepare(`SELECT * FROM print_templates WHERE id=?`).get(id) as PrintTemplate | undefined) ?? null
}

/** Seeds one default template from settings if the table is empty. */
export function ensureDefaultPrintTemplate(): void {
  const count = getDb().prepare(`SELECT COUNT(*) AS c FROM print_templates`).get() as { c: number }
  if (count.c > 0) return
  const s = getSettings()
  const result = getDb()
    .prepare(
      `INSERT INTO print_templates (name, letterhead_mode, header_mm, footer_mm, paper_size, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
    )
    .run(
      'Default',
      s.print_letterhead_mode === 'paper' ? 'paper' : 'digital',
      Math.max(0, s.print_header_mm),
      Math.max(0, s.print_footer_mm),
      normalizePaperSizeId(s.print_paper_size),
    )
  const tpl = getPrintTemplate(Number(result.lastInsertRowid))
  if (tpl) syncActiveTemplateToSettings(tpl)
}

export function savePrintTemplate(input: {
  id?: number
  name: string
  letterheadMode: 'digital' | 'paper'
  headerMm: number
  footerMm: number
  paperSize?: string
  fileName?: string | null
  fileKind?: 'pdf' | 'image' | 'word' | null
  originalName?: string | null
  clearFile?: boolean
  setActive?: boolean
}): PrintTemplate {
  const name = input.name.trim()
  if (!name) throw new Error('Template name is required')
  const headerMm = Math.max(0, Math.min(120, Number(input.headerMm) || 0))
  const footerMm = Math.max(0, Math.min(120, Number(input.footerMm) || 0))
  const mode = input.letterheadMode === 'paper' ? 'paper' : 'digital'
  const paperSize = normalizePaperSizeId(input.paperSize)

  let id = input.id
  if (id) {
    const existing = getPrintTemplate(id)
    if (!existing) throw new Error('Template not found')
    if (input.clearFile) {
      getDb()
        .prepare(
          `UPDATE print_templates SET
            name=?, letterhead_mode=?, header_mm=?, footer_mm=?, paper_size=?,
            file_name=NULL, file_kind=NULL, original_name=NULL, updated_at=datetime('now')
           WHERE id=?`,
        )
        .run(name, mode, headerMm, footerMm, paperSize, id)
    } else if (input.fileName) {
      getDb()
        .prepare(
          `UPDATE print_templates SET
            name=?, letterhead_mode=?, header_mm=?, footer_mm=?, paper_size=?,
            file_name=?, file_kind=?, original_name=?, updated_at=datetime('now')
           WHERE id=?`,
        )
        .run(
          name,
          mode,
          headerMm,
          footerMm,
          paperSize,
          input.fileName,
          input.fileKind ?? null,
          input.originalName ?? null,
          id,
        )
    } else {
      getDb()
        .prepare(
          `UPDATE print_templates SET
            name=?, letterhead_mode=?, header_mm=?, footer_mm=?, paper_size=?, updated_at=datetime('now')
           WHERE id=?`,
        )
        .run(name, mode, headerMm, footerMm, paperSize, id)
    }
  } else {
    const anyActive = getDb().prepare(`SELECT id FROM print_templates WHERE is_active=1 LIMIT 1`).get()
    const makeActive = input.setActive || !anyActive ? 1 : 0
    if (makeActive) {
      getDb().prepare(`UPDATE print_templates SET is_active=0`).run()
    }
    const result = getDb()
      .prepare(
        `INSERT INTO print_templates (name, letterhead_mode, header_mm, footer_mm, paper_size, file_name, file_kind, original_name, is_active)
         VALUES (?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        name,
        mode,
        headerMm,
        footerMm,
        paperSize,
        input.clearFile ? null : (input.fileName ?? null),
        input.clearFile ? null : (input.fileKind ?? null),
        input.clearFile ? null : (input.originalName ?? null),
        makeActive,
      )
    id = Number(result.lastInsertRowid)
  }

  if (input.setActive && id) {
    return setActivePrintTemplate(id)
  }

  const saved = getPrintTemplate(id!)!
  if (saved.is_active) syncActiveTemplateToSettings(saved)
  return saved
}

export function setActivePrintTemplate(id: number): PrintTemplate {
  const tpl = getPrintTemplate(id)
  if (!tpl) throw new Error('Template not found')
  const tx = getDb().transaction(() => {
    getDb().prepare(`UPDATE print_templates SET is_active=0`).run()
    getDb().prepare(`UPDATE print_templates SET is_active=1, updated_at=datetime('now') WHERE id=?`).run(id)
  })
  tx()
  const active = getPrintTemplate(id)!
  syncActiveTemplateToSettings(active)
  return active
}

export function deletePrintTemplate(id: number): { removedFile: string | null } {
  const tpl = getPrintTemplate(id)
  if (!tpl) return { removedFile: null }
  const count = getDb().prepare(`SELECT COUNT(*) AS c FROM print_templates`).get() as { c: number }
  if (count.c <= 1) throw new Error('Keep at least one print template')
  getDb().prepare(`DELETE FROM print_templates WHERE id=?`).run(id)
  if (tpl.is_active) {
    const next = getDb().prepare(`SELECT id FROM print_templates ORDER BY id LIMIT 1`).get() as { id: number } | undefined
    if (next) setActivePrintTemplate(next.id)
  }
  // Only remove the file if no other template still references it
  let removedFile: string | null = null
  if (tpl.file_name) {
    const stillUsed = getDb()
      .prepare(`SELECT id FROM print_templates WHERE file_name=? LIMIT 1`)
      .get(tpl.file_name)
    if (!stillUsed) removedFile = tpl.file_name
  }
  return { removedFile }
}

export function findDuplicatePatients(input: {
  fullName: string
  mobile?: string | null
  age?: number | null
  dateOfBirth?: string | null
  excludeId?: number
}): Patient[] {
  const db = getDb()
  const results: Patient[] = []
  const seen = new Set<number>()
  const push = (rows: Patient[]) => {
    for (const row of rows) {
      if (input.excludeId && row.id === input.excludeId) continue
      if (!seen.has(row.id)) {
        seen.add(row.id)
        results.push(row)
      }
    }
  }

  if (input.mobile?.trim()) {
    push(
      db
        .prepare(
          `SELECT * FROM patients WHERE deleted_at IS NULL AND mobile = ? COLLATE NOCASE LIMIT 10`,
        )
        .all(input.mobile.trim()) as Patient[],
    )
  }
  if (input.fullName.trim() && input.age != null) {
    push(
      db
        .prepare(
          `SELECT * FROM patients
           WHERE deleted_at IS NULL AND full_name = ? COLLATE NOCASE AND age = ?
           LIMIT 10`,
        )
        .all(input.fullName.trim(), input.age) as Patient[],
    )
  }
  if (input.fullName.trim() && input.dateOfBirth) {
    push(
      db
        .prepare(
          `SELECT * FROM patients
           WHERE deleted_at IS NULL AND full_name = ? COLLATE NOCASE AND date_of_birth = ?
           LIMIT 10`,
        )
        .all(input.fullName.trim(), input.dateOfBirth) as Patient[],
    )
  }
  return results
}

export function listPatients(query = ''): PatientListItem[] {
  const q = query.trim()
  const sql = `
    SELECT p.*,
      (SELECT MAX(v.visit_date) FROM visits v WHERE v.patient_id = p.id AND v.deleted_at IS NULL) AS last_visit_date,
      (SELECT COUNT(*) FROM visits v WHERE v.patient_id = p.id AND v.deleted_at IS NULL) AS total_visits,
      COALESCE((
        SELECT SUM(b.outstanding_amount) FROM bills b
        WHERE b.patient_id = p.id AND b.status = 'finalized' AND b.cancelled_at IS NULL
      ), 0) AS outstanding_amount
    FROM patients p
    WHERE p.deleted_at IS NULL AND p.is_archived = 0
      ${
        q
          ? `AND (
            p.full_name LIKE ? OR p.patient_code LIKE ? OR IFNULL(p.mobile,'') LIKE ?
            OR IFNULL(p.address,'') LIKE ? OR CAST(IFNULL(p.age,'') AS TEXT) LIKE ?
          )`
          : ''
      }
    ORDER BY p.full_name COLLATE NOCASE`
  const params = q ? Array(5).fill(`%${q}%`) : []
  return getDb().prepare(sql).all(...params) as PatientListItem[]
}

export function getPatient(id: number): Patient | null {
  return (
    (getDb()
      .prepare(`SELECT * FROM patients WHERE id = ? AND deleted_at IS NULL`)
      .get(id) as Patient | undefined) ?? null
  )
}

export function createPatient(input: Partial<Patient> & { full_name: string }): Patient {
  const code = nextCode('PAT')
  const result = getDb()
    .prepare(
      `INSERT INTO patients (
        patient_code, full_name, gender, date_of_birth, age, mobile, alternate_mobile, email,
        address, city, state, pin_code, emergency_contact_name, emergency_contact_number,
        emergency_contact_relation, emergency_contact_address,
        blood_group, marital_status, allergies, medical_conditions, current_medications, notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      code,
      input.full_name.trim(),
      input.gender ?? null,
      input.date_of_birth ?? null,
      input.age ?? null,
      input.mobile ?? null,
      input.alternate_mobile ?? null,
      input.email ?? null,
      input.address ?? null,
      input.city ?? null,
      input.state ?? null,
      input.pin_code ?? null,
      input.emergency_contact_name ?? null,
      input.emergency_contact_number ?? null,
      input.emergency_contact_relation ?? null,
      input.emergency_contact_address ?? null,
      input.blood_group ?? null,
      input.marital_status ?? null,
      input.allergies ?? null,
      input.medical_conditions ?? null,
      input.current_medications ?? null,
      input.notes ?? null,
    )
  return getPatient(Number(result.lastInsertRowid))!
}

export function updatePatient(id: number, input: Partial<Patient> & { full_name: string }): Patient {
  getDb()
    .prepare(
      `UPDATE patients SET
        full_name=?, gender=?, date_of_birth=?, age=?, mobile=?, alternate_mobile=?, email=?,
        address=?, city=?, state=?, pin_code=?, emergency_contact_name=?, emergency_contact_number=?,
        emergency_contact_relation=?, emergency_contact_address=?,
        blood_group=?, marital_status=?, allergies=?, medical_conditions=?, current_medications=?,
        notes=?, updated_at=datetime('now')
       WHERE id=?`,
    )
    .run(
      input.full_name.trim(),
      input.gender ?? null,
      input.date_of_birth ?? null,
      input.age ?? null,
      input.mobile ?? null,
      input.alternate_mobile ?? null,
      input.email ?? null,
      input.address ?? null,
      input.city ?? null,
      input.state ?? null,
      input.pin_code ?? null,
      input.emergency_contact_name ?? null,
      input.emergency_contact_number ?? null,
      input.emergency_contact_relation ?? null,
      input.emergency_contact_address ?? null,
      input.blood_group ?? null,
      input.marital_status ?? null,
      input.allergies ?? null,
      input.medical_conditions ?? null,
      input.current_medications ?? null,
      input.notes ?? null,
      id,
    )
  return getPatient(id)!
}

export function archivePatient(id: number): void {
  getDb()
    .prepare(`UPDATE patients SET is_archived=1, updated_at=datetime('now') WHERE id=?`)
    .run(id)
}

export function getPatientDashboard(id: number): PatientDashboard | null {
  const patient = getPatient(id)
  if (!patient) return null
  const visits = getDb()
    .prepare(
      `SELECT * FROM visits WHERE patient_id=? AND deleted_at IS NULL ORDER BY visit_date DESC, id DESC`,
    )
    .all(id) as Visit[]
  const prescriptions = getDb()
    .prepare(
      `SELECT * FROM prescriptions WHERE patient_id=? AND deleted_at IS NULL ORDER BY prescription_date DESC`,
    )
    .all(id) as Prescription[]
  const bills = getDb()
    .prepare(`SELECT * FROM bills WHERE patient_id=? ORDER BY bill_date DESC, id DESC`)
    .all(id) as Bill[]
  const payments = getDb()
    .prepare(
      `SELECT * FROM payments WHERE patient_id=? AND cancelled_at IS NULL ORDER BY payment_date DESC`,
    )
    .all(id) as Payment[]
  const totals = getDb()
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN status='finalized' THEN total_amount ELSE 0 END),0) AS billed,
        COALESCE(SUM(CASE WHEN status='finalized' THEN amount_paid ELSE 0 END),0) AS paid,
        COALESCE(SUM(CASE WHEN status='finalized' THEN outstanding_amount ELSE 0 END),0) AS outstanding
       FROM bills WHERE patient_id=? AND cancelled_at IS NULL`,
    )
    .get(id) as { billed: number; paid: number; outstanding: number }
  const nextFollowUp =
    (
      getDb()
        .prepare(
          `SELECT follow_up_date FROM visits
           WHERE patient_id=? AND deleted_at IS NULL AND follow_up_date IS NOT NULL AND follow_up_date >= date('now','localtime')
           ORDER BY follow_up_date ASC LIMIT 1`,
        )
        .get(id) as { follow_up_date: string } | undefined
    )?.follow_up_date ?? null

  return {
    patient,
    totalVisits: visits.length,
    totalBilled: totals.billed,
    totalPaid: totals.paid,
    outstanding: totals.outstanding,
    visits,
    prescriptions,
    bills,
    payments,
    latestVisit: visits[0] ?? null,
    nextFollowUp,
  }
}

export function createVisit(input: {
  patientId: number
  visitDate: string
  visitTime?: string | null
  visitType?: VisitType | string
  chiefComplaints?: string
  symptoms?: string
  symptomDuration?: string
  medicalHistory?: string
  examinationFindings?: string
  provisionalDiagnosis?: string
  finalDiagnosis?: string
  doctorNotes?: string
  advice?: string
  followUpDate?: string | null
  vitals?: Partial<VisitVitals>
}): Visit {
  const visitNumber =
    (
      getDb()
        .prepare(
          `SELECT COALESCE(MAX(visit_number),0)+1 AS n FROM visits WHERE patient_id=? AND deleted_at IS NULL`,
        )
        .get(input.patientId) as { n: number }
    ).n ?? 1
  const code = nextCode('VIS')
  const result = getDb()
    .prepare(
      `INSERT INTO visits (
        visit_code, patient_id, visit_number, visit_date, visit_time, visit_type,
        chief_complaints, symptoms, symptom_duration, medical_history, examination_findings,
        provisional_diagnosis, final_diagnosis, doctor_notes, advice, follow_up_date
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      code,
      input.patientId,
      visitNumber,
      input.visitDate,
      input.visitTime ?? null,
      input.visitType ?? 'New consultation',
      input.chiefComplaints ?? null,
      input.symptoms ?? null,
      input.symptomDuration ?? null,
      input.medicalHistory ?? null,
      input.examinationFindings ?? null,
      input.provisionalDiagnosis ?? null,
      input.finalDiagnosis ?? null,
      input.doctorNotes ?? null,
      input.advice ?? null,
      input.followUpDate ?? null,
    )
  const visitId = Number(result.lastInsertRowid)
  if (input.vitals) {
    upsertVitals(visitId, input.vitals)
  }
  recordSymptoms(input.symptoms)
  return getVisit(visitId)!
}

export function updateVisit(
  id: number,
  input: {
    visitDate: string
    visitTime?: string | null
    visitType?: VisitType | string
    chiefComplaints?: string
    symptoms?: string
    symptomDuration?: string
    medicalHistory?: string
    examinationFindings?: string
    provisionalDiagnosis?: string
    finalDiagnosis?: string
    doctorNotes?: string
    advice?: string
    followUpDate?: string | null
    vitals?: Partial<VisitVitals>
  },
): Visit {
  getDb()
    .prepare(
      `UPDATE visits SET
        visit_date=?, visit_time=?, visit_type=?, chief_complaints=?, symptoms=?, symptom_duration=?,
        medical_history=?, examination_findings=?, provisional_diagnosis=?, final_diagnosis=?,
        doctor_notes=?, advice=?, follow_up_date=?, updated_at=datetime('now')
       WHERE id=?`,
    )
    .run(
      input.visitDate,
      input.visitTime ?? null,
      input.visitType ?? 'New consultation',
      input.chiefComplaints ?? null,
      input.symptoms ?? null,
      input.symptomDuration ?? null,
      input.medicalHistory ?? null,
      input.examinationFindings ?? null,
      input.provisionalDiagnosis ?? null,
      input.finalDiagnosis ?? null,
      input.doctorNotes ?? null,
      input.advice ?? null,
      input.followUpDate ?? null,
      id,
    )
  if (input.vitals) upsertVitals(id, input.vitals)
  recordSymptoms(input.symptoms)
  return getVisit(id)!
}

export function getVisit(id: number): Visit | null {
  return (
    (getDb()
      .prepare(`SELECT * FROM visits WHERE id=? AND deleted_at IS NULL`)
      .get(id) as Visit | undefined) ?? null
  )
}

export function softDeleteVisit(id: number): void {
  const bill = getDb()
    .prepare(`SELECT id FROM bills WHERE visit_id=? AND status='finalized' LIMIT 1`)
    .get(id)
  if (bill) throw new Error('Cannot delete a visit with a finalized bill')
  getDb()
    .prepare(`UPDATE visits SET deleted_at=datetime('now'), updated_at=datetime('now') WHERE id=?`)
    .run(id)
}

export function getVitals(visitId: number): VisitVitals | null {
  return (
    (getDb().prepare(`SELECT * FROM visit_vitals WHERE visit_id=?`).get(visitId) as
      | VisitVitals
      | undefined) ?? null
  )
}

export function upsertVitals(visitId: number, vitals: Partial<VisitVitals>): VisitVitals {
  const existing = getVitals(visitId)
  if (existing) {
    getDb()
      .prepare(
        `UPDATE visit_vitals SET
          temperature=?, pulse=?, systolic_bp=?, diastolic_bp=?, respiratory_rate=?,
          oxygen_saturation=?, weight=?, height=?, bmi=?, blood_sugar=?, updated_at=datetime('now')
         WHERE visit_id=?`,
      )
      .run(
        vitals.temperature ?? null,
        vitals.pulse ?? null,
        vitals.systolic_bp ?? null,
        vitals.diastolic_bp ?? null,
        vitals.respiratory_rate ?? null,
        vitals.oxygen_saturation ?? null,
        vitals.weight ?? null,
        vitals.height ?? null,
        vitals.bmi ?? null,
        vitals.blood_sugar ?? null,
        visitId,
      )
  } else {
    getDb()
      .prepare(
        `INSERT INTO visit_vitals (
          visit_id, temperature, pulse, systolic_bp, diastolic_bp, respiratory_rate,
          oxygen_saturation, weight, height, bmi, blood_sugar
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        visitId,
        vitals.temperature ?? null,
        vitals.pulse ?? null,
        vitals.systolic_bp ?? null,
        vitals.diastolic_bp ?? null,
        vitals.respiratory_rate ?? null,
        vitals.oxygen_saturation ?? null,
        vitals.weight ?? null,
        vitals.height ?? null,
        vitals.bmi ?? null,
        vitals.blood_sugar ?? null,
      )
  }
  return getVitals(visitId)!
}

export interface SymptomItem {
  id: number
  name: string
  usage_count: number
}

export function searchSymptoms(query = '', limit = 12): SymptomItem[] {
  const q = query.trim()
  if (!q) {
    return getDb()
      .prepare(`SELECT id, name, usage_count FROM symptoms ORDER BY usage_count DESC, name COLLATE NOCASE LIMIT ?`)
      .all(limit) as SymptomItem[]
  }
  return getDb()
    .prepare(
      `SELECT id, name, usage_count FROM symptoms
       WHERE name LIKE ? OR normalized_name LIKE ?
       ORDER BY usage_count DESC, name COLLATE NOCASE LIMIT ?`,
    )
    .all(`%${q}%`, `%${normalizeText(q)}%`, limit) as SymptomItem[]
}

/**
 * Adds any unseen symptoms to the master list and bumps usage counts,
 * so they show up as dropdown suggestions on future visits.
 */
export function recordSymptoms(symptoms: string | null | undefined): void {
  if (!symptoms?.trim()) return
  const stmt = getDb().prepare(
    `INSERT INTO symptoms (name, normalized_name, usage_count, last_used_at)
     VALUES (?, ?, 1, datetime('now'))
     ON CONFLICT(normalized_name) DO UPDATE SET
       usage_count = usage_count + 1,
       last_used_at = datetime('now')`,
  )
  const names = symptoms
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
  for (const name of names) {
    stmt.run(name, normalizeText(name))
  }
}

export type OptionCategory = 'dosage_form' | 'frequency' | 'timing'

export interface CustomOption {
  id: number
  category: string
  name: string
  usage_count: number
}

export function listOptions(category: OptionCategory): CustomOption[] {
  return getDb()
    .prepare(
      `SELECT id, category, name, usage_count FROM custom_options
       WHERE category=? ORDER BY usage_count DESC, name COLLATE NOCASE`,
    )
    .all(category) as CustomOption[]
}

/** Adds an unseen option value (or bumps usage of an existing one). */
export function recordOption(category: OptionCategory, name: string | null | undefined): void {
  const trimmed = name?.trim()
  if (!trimmed) return
  getDb()
    .prepare(
      `INSERT INTO custom_options (category, name, normalized_name, usage_count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(category, normalized_name) DO UPDATE SET usage_count = usage_count + 1`,
    )
    .run(category, trimmed, normalizeText(trimmed))
}

export function addOption(category: OptionCategory, name: string): CustomOption {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Option name is required')
  getDb()
    .prepare(
      `INSERT INTO custom_options (category, name, normalized_name)
       VALUES (?, ?, ?)
       ON CONFLICT(category, normalized_name) DO UPDATE SET name = excluded.name`,
    )
    .run(category, trimmed, normalizeText(trimmed))
  return getDb()
    .prepare(`SELECT id, category, name, usage_count FROM custom_options WHERE category=? AND normalized_name=?`)
    .get(category, normalizeText(trimmed)) as CustomOption
}

export function updateOption(id: number, name: string): void {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Option name is required')
  getDb()
    .prepare(`UPDATE custom_options SET name=?, normalized_name=? WHERE id=?`)
    .run(trimmed, normalizeText(trimmed), id)
}

export function deleteOption(id: number): void {
  getDb().prepare(`DELETE FROM custom_options WHERE id=?`).run(id)
}

export function searchMedicines(query: string, limit = 15): Medicine[] {
  const q = query.trim()
  if (!q) {
    return getDb()
      .prepare(
        `SELECT * FROM medicines WHERE is_active=1 ORDER BY usage_count DESC, name COLLATE NOCASE LIMIT ?`,
      )
      .all(limit) as Medicine[]
  }
  return getDb()
    .prepare(
      `SELECT * FROM medicines
       WHERE is_active=1 AND (
         name LIKE ? OR IFNULL(generic_name,'') LIKE ? OR IFNULL(brand_name,'') LIKE ?
         OR IFNULL(strength,'') LIKE ? OR unique_medicine_key LIKE ?
       )
       ORDER BY usage_count DESC, name COLLATE NOCASE LIMIT ?`,
    )
    .all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${normalizeText(q)}%`, limit) as Medicine[]
}

export function listMedicines(query = ''): Medicine[] {
  const q = query.trim()
  if (!q) {
    return getDb()
      .prepare(`SELECT * FROM medicines ORDER BY name COLLATE NOCASE`)
      .all() as Medicine[]
  }
  return getDb()
    .prepare(
      `SELECT * FROM medicines WHERE name LIKE ? OR IFNULL(generic_name,'') LIKE ? ORDER BY name COLLATE NOCASE`,
    )
    .all(`%${q}%`, `%${q}%`) as Medicine[]
}

export function getOrCreateMedicine(input: {
  name: string
  genericName?: string
  brandName?: string
  strength?: string
  dosageForm?: string
  manufacturer?: string
  defaultRoute?: string
  defaultDosageInstruction?: string
}): Medicine {
  const key = medicineUniqueKey(input.name, input.strength, input.dosageForm)
  const existing = getDb()
    .prepare(`SELECT * FROM medicines WHERE unique_medicine_key=?`)
    .get(key) as Medicine | undefined
  if (existing) return existing
  const result = getDb()
    .prepare(
      `INSERT INTO medicines (
        name, normalized_name, generic_name, brand_name, strength, normalized_strength,
        dosage_form, manufacturer, default_route, default_dosage_instruction, unique_medicine_key
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      input.name.trim(),
      normalizeText(input.name),
      input.genericName ?? null,
      input.brandName ?? null,
      input.strength ?? null,
      input.strength ? normalizeText(input.strength) : null,
      input.dosageForm ?? null,
      input.manufacturer ?? null,
      input.defaultRoute ?? null,
      input.defaultDosageInstruction ?? null,
      key,
    )
  return getDb().prepare(`SELECT * FROM medicines WHERE id=?`).get(Number(result.lastInsertRowid)) as Medicine
}

export function updateMedicine(
  id: number,
  input: {
    name: string
    genericName?: string
    brandName?: string
    strength?: string
    dosageForm?: string
    manufacturer?: string
    defaultRoute?: string
    defaultDosageInstruction?: string
    isActive?: boolean
  },
): Medicine {
  const key = medicineUniqueKey(input.name, input.strength, input.dosageForm)
  const clash = getDb()
    .prepare(`SELECT id FROM medicines WHERE unique_medicine_key=? AND id<>?`)
    .get(key, id)
  if (clash) throw new Error('A medicine with the same name, strength, and form already exists')
  getDb()
    .prepare(
      `UPDATE medicines SET
        name=?, normalized_name=?, generic_name=?, brand_name=?, strength=?, normalized_strength=?,
        dosage_form=?, manufacturer=?, default_route=?, default_dosage_instruction=?,
        unique_medicine_key=?, is_active=?, updated_at=datetime('now')
       WHERE id=?`,
    )
    .run(
      input.name.trim(),
      normalizeText(input.name),
      input.genericName ?? null,
      input.brandName ?? null,
      input.strength ?? null,
      input.strength ? normalizeText(input.strength) : null,
      input.dosageForm ?? null,
      input.manufacturer ?? null,
      input.defaultRoute ?? null,
      input.defaultDosageInstruction ?? null,
      key,
      input.isActive === false ? 0 : 1,
      id,
    )
  return getDb().prepare(`SELECT * FROM medicines WHERE id=?`).get(id) as Medicine
}

export function deactivateMedicine(id: number): void {
  const used = getDb()
    .prepare(`SELECT id FROM prescription_medicines WHERE medicine_id=? LIMIT 1`)
    .get(id)
  if (used) {
    getDb().prepare(`UPDATE medicines SET is_active=0, updated_at=datetime('now') WHERE id=?`).run(id)
    return
  }
  getDb().prepare(`DELETE FROM medicines WHERE id=?`).run(id)
}

export function savePrescription(input: {
  id?: number
  patientId: number
  visitId: number
  prescriptionDate: string
  diagnosis?: string
  testsAdvised?: string
  advice?: string
  followUpDate?: string | null
  notes?: string
  status?: PrescriptionStatus
  medicines: PrescriptionMedicineInput[]
}): Prescription {
  const status = input.status ?? 'draft'

  // Soft 24h lock — finalized prescriptions can still be edited explicitly from the UI.
  const assertEditable = (id: number) => {
    const existing = getDb()
      .prepare(`SELECT created_at FROM prescriptions WHERE id=?`)
      .get(id) as { created_at: string } | undefined
    if (!existing) return
    const createdMs = Date.parse(existing.created_at.replace(' ', 'T') + 'Z')
    if (Number.isFinite(createdMs) && Date.now() - createdMs > 24 * 60 * 60 * 1000) {
      throw new Error('This prescription is more than a day old and can no longer be edited.')
    }
  }

  const updatePrescription = (
    prescriptionId: number,
    nextStatus: PrescriptionStatus,
  ) => {
    getDb()
      .prepare(
        `UPDATE prescriptions SET
          prescription_date=?, diagnosis=?, tests_advised=?, advice=?, follow_up_date=?,
          notes=?, status=?, edit_count=edit_count + 1, updated_at=datetime('now')
         WHERE id=?`,
      )
      .run(
        input.prescriptionDate,
        input.diagnosis ?? null,
        input.testsAdvised ?? null,
        input.advice ?? null,
        input.followUpDate ?? null,
        input.notes ?? null,
        nextStatus,
        prescriptionId,
      )
    getDb().prepare(`DELETE FROM prescription_medicines WHERE prescription_id=?`).run(prescriptionId)
  }

  const tx = getDb().transaction(() => {
    let prescriptionId = input.id
    if (prescriptionId) {
      assertEditable(prescriptionId)
      updatePrescription(prescriptionId, status)
    } else {
      const existing = getDb()
        .prepare(`SELECT id FROM prescriptions WHERE visit_id=? AND deleted_at IS NULL`)
        .get(input.visitId) as { id: number } | undefined
      if (existing) {
        prescriptionId = existing.id
        assertEditable(prescriptionId)
        updatePrescription(prescriptionId, status)
      } else {
        const code = nextCode('RX')
        const result = getDb()
          .prepare(
            `INSERT INTO prescriptions (
              prescription_code, patient_id, visit_id, prescription_date, diagnosis,
              tests_advised, advice, follow_up_date, notes, status, edit_count
            ) VALUES (?,?,?,?,?,?,?,?,?,?,0)`,
          )
          .run(
            code,
            input.patientId,
            input.visitId,
            input.prescriptionDate,
            input.diagnosis ?? null,
            input.testsAdvised ?? null,
            input.advice ?? null,
            input.followUpDate ?? null,
            input.notes ?? null,
            status,
          )
        prescriptionId = Number(result.lastInsertRowid)
      }
    }

    const insertMed = getDb().prepare(
      `INSERT INTO prescription_medicines (
        prescription_id, medicine_id, medicine_name_snapshot, strength_snapshot, dosage_form_snapshot,
        dose, frequency, route, duration, timing_instruction, quantity, special_instructions, sort_order
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )

    input.medicines
      .filter((m) => m.medicineName.trim())
      .forEach((m, index) => {
        const medicine = getOrCreateMedicine({
          name: m.medicineName,
          genericName: m.genericName,
          brandName: m.brandName,
          strength: m.strength,
          dosageForm: m.dosageForm,
          defaultDosageInstruction: m.dose,
        })
        getDb()
          .prepare(
            `UPDATE medicines SET usage_count = usage_count + 1, last_prescribed_at=?, updated_at=datetime('now') WHERE id=?`,
          )
          .run(todayIso(), medicine.id)
        // Remember any custom-typed dropdown values for future suggestions
        recordOption('dosage_form', m.dosageForm)
        recordOption('frequency', m.frequency)
        recordOption('timing', m.timingInstruction)
        insertMed.run(
          prescriptionId,
          medicine.id,
          m.medicineName.trim(),
          m.strength ?? null,
          m.dosageForm ?? null,
          m.dose ?? null,
          m.frequency ?? null,
          m.route ?? null,
          m.duration ?? null,
          m.timingInstruction ?? null,
          m.quantity ?? null,
          m.specialInstructions ?? null,
          index,
        )
      })

    return prescriptionId!
  })
  const id = tx()
  return getDb().prepare(`SELECT * FROM prescriptions WHERE id=?`).get(id) as Prescription
}

export function getPrescriptionByVisit(visitId: number): Prescription | null {
  return (
    (getDb()
      .prepare(`SELECT * FROM prescriptions WHERE visit_id=? AND deleted_at IS NULL`)
      .get(visitId) as Prescription | undefined) ?? null
  )
}

export function getPrescriptionMedicines(prescriptionId: number): PrescriptionMedicine[] {
  return getDb()
    .prepare(
      `SELECT * FROM prescription_medicines WHERE prescription_id=? ORDER BY sort_order, id`,
    )
    .all(prescriptionId) as PrescriptionMedicine[]
}

export function listTests(query = ''): TestItem[] {
  const q = query.trim()
  if (!q) return getDb().prepare(`SELECT * FROM tests WHERE is_active=1 ORDER BY name`).all() as TestItem[]
  return getDb()
    .prepare(`SELECT * FROM tests WHERE is_active=1 AND name LIKE ? ORDER BY name`)
    .all(`%${q}%`) as TestItem[]
}

export function listProcedures(query = ''): ProcedureItem[] {
  const q = query.trim()
  if (!q)
    return getDb().prepare(`SELECT * FROM procedures WHERE is_active=1 ORDER BY name`).all() as ProcedureItem[]
  return getDb()
    .prepare(`SELECT * FROM procedures WHERE is_active=1 AND name LIKE ? ORDER BY name`)
    .all(`%${q}%`) as ProcedureItem[]
}

export function upsertTest(input: {
  id?: number
  name: string
  category?: string
  defaultPrice?: number
  description?: string
}): TestItem {
  if (input.id) {
    getDb()
      .prepare(
        `UPDATE tests SET name=?, normalized_name=?, category=?, default_price=?, description=?, updated_at=datetime('now') WHERE id=?`,
      )
      .run(
        input.name.trim(),
        normalizeText(input.name),
        input.category ?? null,
        input.defaultPrice ?? 0,
        input.description ?? null,
        input.id,
      )
    return getDb().prepare(`SELECT * FROM tests WHERE id=?`).get(input.id) as TestItem
  }
  const result = getDb()
    .prepare(
      `INSERT INTO tests (name, normalized_name, category, default_price, description) VALUES (?,?,?,?,?)`,
    )
    .run(
      input.name.trim(),
      normalizeText(input.name),
      input.category ?? null,
      input.defaultPrice ?? 0,
      input.description ?? null,
    )
  return getDb().prepare(`SELECT * FROM tests WHERE id=?`).get(Number(result.lastInsertRowid)) as TestItem
}

export function upsertProcedure(input: {
  id?: number
  name: string
  category?: string
  defaultPrice?: number
  description?: string
}): ProcedureItem {
  if (input.id) {
    getDb()
      .prepare(
        `UPDATE procedures SET name=?, normalized_name=?, category=?, default_price=?, description=?, updated_at=datetime('now') WHERE id=?`,
      )
      .run(
        input.name.trim(),
        normalizeText(input.name),
        input.category ?? null,
        input.defaultPrice ?? 0,
        input.description ?? null,
        input.id,
      )
    return getDb().prepare(`SELECT * FROM procedures WHERE id=?`).get(input.id) as ProcedureItem
  }
  const result = getDb()
    .prepare(
      `INSERT INTO procedures (name, normalized_name, category, default_price, description) VALUES (?,?,?,?,?)`,
    )
    .run(
      input.name.trim(),
      normalizeText(input.name),
      input.category ?? null,
      input.defaultPrice ?? 0,
      input.description ?? null,
    )
  return getDb()
    .prepare(`SELECT * FROM procedures WHERE id=?`)
    .get(Number(result.lastInsertRowid)) as ProcedureItem
}

export function setVisitTests(
  visitId: number,
  items: Array<{
    id?: number | null
    testId?: number | null
    testName: string
    notes?: string
    status?: string
    resultSummary?: string
    resultDate?: string
    isAbnormal?: boolean
    charge?: number
    source?: 'clinic' | 'outside'
  }>,
): VisitTest[] {
  const rows = items.filter((i) => i.testName.trim())
  const removedReports: string[] = []
  const tx = getDb().transaction(() => {
    const existingRows = getDb()
      .prepare(`SELECT * FROM visit_tests WHERE visit_id=?`)
      .all(visitId) as VisitTest[]
    const byId = new Map(existingRows.map((t) => [t.id, t]))
    const lockedIds = new Set(existingRows.filter((t) => t.status !== 'Advised').map((t) => t.id))

    const keepIds: number[] = []
    // Existing Advised rows only — status / schedule / report stay on workflow actions
    const update = getDb().prepare(
      `UPDATE visit_tests SET
        test_id=?, test_name_snapshot=?, notes=?, charge=?, source=?, updated_at=datetime('now')
       WHERE id=? AND visit_id=? AND status='Advised'`,
    )
    const insert = getDb().prepare(
      `INSERT INTO visit_tests (visit_id, test_id, test_name_snapshot, notes, status, result_summary, result_date, is_abnormal, charge, source)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    )

    for (const item of rows) {
      const source = item.source === 'outside' ? 'outside' : 'clinic'
      const charge = source === 'outside' ? 0 : (item.charge ?? 0)
      if (item.id) {
        const owned = byId.get(item.id)
        if (owned && owned.visit_id === visitId) {
          if (owned.status !== 'Advised') {
            // Past Advised: order fields are locked — keep as-is
            keepIds.push(item.id)
            continue
          }
          update.run(
            item.testId ?? null,
            item.testName.trim(),
            item.notes ?? null,
            charge,
            source,
            item.id,
            visitId,
          )
          keepIds.push(item.id)
          continue
        }
      }
      const result = insert.run(
        visitId,
        item.testId ?? null,
        item.testName.trim(),
        item.notes ?? null,
        'Advised',
        null,
        null,
        0,
        charge,
        source,
      )
      keepIds.push(Number(result.lastInsertRowid))
    }

    // Never drop tests that have left Advised (even if omitted from the payload)
    for (const id of lockedIds) {
      if (!keepIds.includes(id)) keepIds.push(id)
    }

    const keep = new Set(keepIds)
    for (const row of existingRows) {
      if (!keep.has(row.id)) {
        if (row.status !== 'Advised') {
          throw new Error(`Cannot remove "${row.test_name_snapshot}" after its status was updated`)
        }
        if (isVisitTestPaid(row.id)) {
          throw new Error(
            `"${row.test_name_snapshot}" is paid — use Refund to revert the payment instead of deleting`,
          )
        }
        if (row.report_file_name) removedReports.push(row.report_file_name)
      }
    }

    const removable = existingRows.filter((t) => t.status === 'Advised' && !keep.has(t.id)).map((t) => t.id)
    if (removable.length) {
      getDb()
        .prepare(`DELETE FROM visit_tests WHERE visit_id=? AND id IN (${removable.map(() => '?').join(',')})`)
        .run(visitId, ...removable)
    }
  })
  tx()
  for (const fileName of removedReports) removeTestReportFile(fileName)
  return getDb().prepare(`SELECT * FROM visit_tests WHERE visit_id=?`).all(visitId) as VisitTest[]
}

export function setVisitProcedures(
  visitId: number,
  items: Array<{
    id?: number | null
    procedureId?: number | null
    procedureName: string
    notes?: string
    quantity?: number
    unitPrice?: number
  }>,
): VisitProcedure[] {
  const tx = getDb().transaction(() => {
    const existing = getVisitProcedures(visitId)
    const byId = new Map(existing.map((p) => [p.id, p]))
    const keepIds: number[] = []
    const update = getDb().prepare(
      `UPDATE visit_procedures SET
        procedure_id=?, procedure_name_snapshot=?, notes=?, quantity=?, unit_price=?, total=?
       WHERE id=? AND visit_id=?`,
    )
    const insert = getDb().prepare(
      `INSERT INTO visit_procedures (visit_id, procedure_id, procedure_name_snapshot, notes, quantity, unit_price, total)
       VALUES (?,?,?,?,?,?,?)`,
    )

    for (const item of items.filter((i) => i.procedureName.trim())) {
      const qty = item.quantity ?? 1
      const price = item.unitPrice ?? 0
      const total = qty * price
      if (item.id && byId.has(item.id)) {
        if (isVisitProcedurePaid(item.id)) {
          // Paid services stay as-is (refund required to change)
          keepIds.push(item.id)
          continue
        }
        update.run(
          item.procedureId ?? null,
          item.procedureName.trim(),
          item.notes ?? null,
          qty,
          price,
          total,
          item.id,
          visitId,
        )
        keepIds.push(item.id)
        continue
      }
      const result = insert.run(
        visitId,
        item.procedureId ?? null,
        item.procedureName.trim(),
        item.notes ?? null,
        qty,
        price,
        total,
      )
      keepIds.push(Number(result.lastInsertRowid))
    }

    const keep = new Set(keepIds)
    for (const row of existing) {
      if (!keep.has(row.id)) {
        if (isVisitProcedurePaid(row.id)) {
          throw new Error(
            `"${row.procedure_name_snapshot}" is paid — use Refund to revert the payment instead of deleting`,
          )
        }
      }
    }
    const removable = existing.filter((p) => !keep.has(p.id)).map((p) => p.id)
    if (removable.length) {
      getDb()
        .prepare(`DELETE FROM visit_procedures WHERE visit_id=? AND id IN (${removable.map(() => '?').join(',')})`)
        .run(visitId, ...removable)
    }
  })
  tx()
  return getVisitProcedures(visitId)
}

export function isVisitProcedurePaid(visitProcedureId: number): boolean {
  const row = getDb()
    .prepare(`SELECT * FROM visit_procedures WHERE id=?`)
    .get(visitProcedureId) as VisitProcedure | undefined
  if (!row) return false
  for (const bill of listBillsForVisit(row.visit_id)) {
    if (Number(bill.amount_paid) <= 0) continue
    const items = getBillItems(bill.id)
    const onBill = items.some(
      (i) =>
        i.item_type === 'Procedure' &&
        (i.item_reference_id === visitProcedureId ||
          (row.procedure_id != null && i.item_reference_id === row.procedure_id) ||
          i.item_name === row.procedure_name_snapshot),
    )
    if (onBill) return true
  }
  return false
}

export function refundVisitProcedure(visitProcedureId: number): {
  visitId: number
  sync: { updatedBillIds: number[]; cancelledBillIds: number[] }
} {
  const row = getDb()
    .prepare(`SELECT * FROM visit_procedures WHERE id=?`)
    .get(visitProcedureId) as VisitProcedure | undefined
  if (!row) throw new Error('Service not found')
  if (!isVisitProcedurePaid(visitProcedureId)) {
    throw new Error('This service has no payment to refund')
  }
  const visitId = row.visit_id
  getDb().prepare(`DELETE FROM visit_procedures WHERE id=?`).run(visitProcedureId)
  const sync = syncBillsAfterVisitProceduresChange(visitId)
  return { visitId, sync }
}

export function syncBillsAfterVisitProceduresChange(visitId: number): {
  updatedBillIds: number[]
  cancelledBillIds: number[]
} {
  const procedures = getVisitProcedures(visitId)
  const activeIds = new Set(procedures.map((p) => p.id))
  const updatedBillIds: number[] = []
  const cancelledBillIds: number[] = []

  for (const bill of listBillsForVisit(visitId)) {
    const items = getBillItems(bill.id)
    const kept = items.filter((i) => {
      if (i.item_type !== 'Procedure') return true
      if (i.item_reference_id != null) {
        if (activeIds.has(i.item_reference_id)) return true
        // Catalog procedure_id legacy match
        return procedures.some((p) => p.procedure_id != null && i.item_reference_id === p.procedure_id)
      }
      return procedures.some((p) => i.item_name === p.procedure_name_snapshot)
    })

    if (kept.length === items.length) continue

    if (kept.length === 0) {
      const payments = getDb()
        .prepare(`SELECT id FROM payments WHERE bill_id=? AND cancelled_at IS NULL`)
        .all(bill.id) as Array<{ id: number }>
      for (const p of payments) {
        getDb()
          .prepare(`UPDATE payments SET cancelled_at=datetime('now'), updated_at=datetime('now') WHERE id=?`)
          .run(p.id)
        getDb().prepare(`DELETE FROM invoices WHERE payment_id=?`).run(p.id)
      }
      getDb()
        .prepare(
          `UPDATE bills SET status='cancelled', payment_status='Cancelled', cancelled_at=datetime('now'), updated_at=datetime('now') WHERE id=?`,
        )
        .run(bill.id)
      cancelledBillIds.push(bill.id)
      continue
    }

    rewriteBillItemsForSync(
      bill.id,
      kept.map((i) => ({
        itemType: i.item_type as BillItemInput['itemType'],
        itemReferenceId: i.item_reference_id,
        itemName: i.item_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        discount: i.discount,
      })),
    )
    updatedBillIds.push(bill.id)
  }

  return { updatedBillIds, cancelledBillIds }
}

function getUnbilledProcedures(visitId: number, procedures: VisitProcedure[]): VisitProcedure[] {
  const procedureLines: BillItem[] = []
  for (const b of listBillsForVisit(visitId)) {
    for (const item of getBillItems(b.id)) {
      if (item.item_type === 'Procedure') procedureLines.push(item)
    }
  }
  const claimed = new Set<number>()
  const billedIds = new Set<number>()

  for (const p of procedures) {
    const byVisitProcId = procedureLines.find((i) => i.item_reference_id === p.id && !claimed.has(i.id))
    if (byVisitProcId) {
      claimed.add(byVisitProcId.id)
      billedIds.add(p.id)
      continue
    }
    const byLegacy = procedureLines.find(
      (i) =>
        !claimed.has(i.id) &&
        ((p.procedure_id != null && i.item_reference_id === p.procedure_id) ||
          i.item_name === p.procedure_name_snapshot),
    )
    if (byLegacy) {
      claimed.add(byLegacy.id)
      billedIds.add(p.id)
    }
  }

  return procedures.filter((p) => !billedIds.has(p.id))
}

function procedureBillItems(procedures: VisitProcedure[]): BillItemInput[] {
  return procedures.map((p) => ({
    itemType: 'Procedure' as const,
    itemReferenceId: p.id,
    itemName: p.procedure_name_snapshot,
    quantity: p.quantity,
    unitPrice: Number(p.unit_price) || 0,
  }))
}

export type ClinicProcedureBillingResult = {
  bill: Bill
  procedureCount: number
  collectPayment: boolean
  message?: string
}

export function ensureClinicProcedureBill(visitId: number): ClinicProcedureBillingResult | null {
  const visit = getVisit(visitId)
  if (!visit) throw new Error('Visit not found')

  const procedures = getVisitProcedures(visitId)
  if (!procedures.length) return null

  const unbilled = getUnbilledProcedures(visitId, procedures)
  const bills = listBillsForVisit(visitId)
  const unpaidBill = bills.find((b) => b.payment_status !== 'Paid' && b.status !== 'cancelled') ?? null

  if (!unbilled.length) {
    if (unpaidBill && unpaidBill.outstanding_amount > 0) {
      return {
        bill: unpaidBill,
        procedureCount: 0,
        collectPayment: true,
        message: 'Collect outstanding payment for this visit',
      }
    }
    return null
  }

  const serviceItems = procedureBillItems(unbilled)
  const settings = getSettings()

  if (!bills.length) {
    const isFollowUp = String(visit.visit_type).toLowerCase().includes('follow')
    const items: BillItemInput[] = [
      {
        itemType: 'Consultation',
        itemName: isFollowUp ? 'Follow-up Consultation' : 'General Consultation',
        quantity: 1,
        unitPrice: isFollowUp
          ? Number(settings.default_followup_fee)
          : Number(settings.default_consultation_fee),
      },
      ...serviceItems,
    ]
    const bill = saveBill({
      patientId: visit.patient_id,
      visitId,
      billDate: todayIso(),
      status: 'finalized',
      items,
    })
    return {
      bill,
      procedureCount: unbilled.length,
      collectPayment: bill.outstanding_amount > 0,
    }
  }

  if (unpaidBill) {
    const existingItems = getBillItems(unpaidBill.id)
    const kept: BillItemInput[] = existingItems.map((i) => ({
      itemType: i.item_type as BillItemInput['itemType'],
      itemReferenceId: i.item_reference_id,
      itemName: i.item_name,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      discount: i.discount,
    }))
    const merged = [...kept, ...serviceItems]
    let bill: Bill
    if (unpaidBill.status === 'draft') {
      bill = saveBill({
        id: unpaidBill.id,
        patientId: unpaidBill.patient_id,
        visitId,
        billDate: unpaidBill.bill_date,
        discountType: unpaidBill.discount_type,
        discountValue: unpaidBill.discount_value,
        notes: unpaidBill.notes ?? undefined,
        status: 'finalized',
        items: merged,
      })
    } else {
      bill = rewriteUnpaidBillItems(unpaidBill.id, merged, 'finalized')
    }
    return {
      bill,
      procedureCount: unbilled.length,
      collectPayment: bill.outstanding_amount > 0,
    }
  }

  const bill = saveBill({
    patientId: visit.patient_id,
    visitId,
    billDate: todayIso(),
    status: 'finalized',
    notes: `Additional services (${unbilled.length})`,
    items: serviceItems,
  })
  return {
    bill,
    procedureCount: unbilled.length,
    collectPayment: bill.outstanding_amount > 0,
    message: `New bill created for ${unbilled.length} additional service${unbilled.length === 1 ? '' : 's'}`,
  }
}

export function applyVisitProcedureBilling(visitId: number): {
  sync: { updatedBillIds: number[]; cancelledBillIds: number[] }
  billing: ClinicProcedureBillingResult | null
} {
  const sync = syncBillsAfterVisitProceduresChange(visitId)
  const billing = ensureClinicProcedureBill(visitId)
  return { sync, billing }
}

export function getVisitTests(visitId: number): VisitTest[] {
  return getDb().prepare(`SELECT * FROM visit_tests WHERE visit_id=?`).all(visitId) as VisitTest[]
}

export function getVisitTest(id: number): VisitTest | null {
  return (getDb().prepare(`SELECT * FROM visit_tests WHERE id=?`).get(id) as VisitTest | undefined) ?? null
}

export function listAllTests(query = ''): TestListItem[] {
  const q = query.trim()
  const base = `
    SELECT vt.id, vt.visit_id, v.patient_id, p.full_name AS patient_name, p.patient_code,
           vt.test_name_snapshot AS test_name, t.category, v.visit_date,
           vt.status, vt.result_summary, vt.result_date, vt.is_abnormal, vt.charge,
           vt.scheduled_at, vt.report_file_name, vt.report_original_name, vt.report_file_kind
    FROM visit_tests vt
    JOIN visits v ON v.id = vt.visit_id AND v.deleted_at IS NULL
    JOIN patients p ON p.id = v.patient_id
    LEFT JOIN tests t ON t.id = vt.test_id`
  if (!q) {
    return getDb()
      .prepare(`${base} ORDER BY v.visit_date DESC, vt.id DESC`)
      .all() as TestListItem[]
  }
  return getDb()
    .prepare(
      `${base}
       WHERE vt.test_name_snapshot LIKE ? OR p.full_name LIKE ? OR p.patient_code LIKE ? OR IFNULL(t.category,'') LIKE ?
       ORDER BY v.visit_date DESC, vt.id DESC`,
    )
    .all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`) as TestListItem[]
}

export function updateVisitTestResult(
  id: number,
  input: {
    status?: string
    resultSummary?: string | null
    resultDate?: string | null
    isAbnormal?: boolean
  },
): VisitTest {
  const row = getVisitTest(id)
  if (!row) throw new Error('Test not found')
  getDb()
    .prepare(
      `UPDATE visit_tests SET
        status=?, result_summary=?, result_date=?, is_abnormal=?, updated_at=datetime('now')
       WHERE id=?`,
    )
    .run(
      input.status ?? row.status,
      input.resultSummary !== undefined ? input.resultSummary : row.result_summary,
      input.resultDate !== undefined ? input.resultDate : row.result_date,
      input.isAbnormal !== undefined ? (input.isAbnormal ? 1 : 0) : row.is_abnormal,
      id,
    )
  return getVisitTest(id)!
}

/** Schedule an advised (or already scheduled) test for a date/time. */
export function scheduleVisitTest(id: number, scheduledAt: string): VisitTest {
  const row = getVisitTest(id)
  if (!row) throw new Error('Test not found')
  if (row.status !== 'Advised' && row.status !== 'Scheduled') {
    throw new Error('Only advised or scheduled tests can be scheduled')
  }
  const value = scheduledAt.trim()
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) {
    throw new Error('Schedule time must be YYYY-MM-DD HH:mm')
  }
  getDb()
    .prepare(
      `UPDATE visit_tests SET status='Scheduled', scheduled_at=?, updated_at=datetime('now') WHERE id=?`,
    )
    .run(value, id)
  return getVisitTest(id)!
}

/**
 * Clinic tests that should appear on bills (outside / cancelled are excluded).
 */
export function billableClinicTests(visitId: number): VisitTest[] {
  return getVisitTests(visitId).filter(
    (t) => t.status !== 'Cancelled' && (t.source ?? 'clinic') !== 'outside',
  )
}

/** Drop cancelled/removed test lines and create bills for any still-unbilled clinic tests. */
export function applyVisitTestBilling(visitId: number): {
  sync: { updatedBillIds: number[]; cancelledBillIds: number[] }
  billing: ClinicTestBillingResult | null
} {
  const sync = syncBillsAfterVisitTestsChange(visitId)
  const billing = ensureClinicTestBill(visitId)
  return { sync, billing }
}

/** Whether a clinic visit-test is already on a bill that has received payment. */
export function isVisitTestPaid(visitTestId: number): boolean {
  const test = getVisitTest(visitTestId)
  if (!test || (test.source ?? 'clinic') === 'outside') return false
  for (const bill of listBillsForVisit(test.visit_id)) {
    if (Number(bill.amount_paid) <= 0) continue
    const items = getBillItems(bill.id)
    const onBill = items.some(
      (i) =>
        i.item_type === 'Test' &&
        (i.item_reference_id === visitTestId ||
          (test.test_id != null && i.item_reference_id === test.test_id) ||
          i.item_name === test.test_name_snapshot),
    )
    if (onBill) return true
  }
  return false
}

/**
 * Refund a paid clinic test: remove its bill line, cancel excess payments,
 * then remove the visit-test order.
 */
export function refundVisitTest(visitTestId: number): {
  visitId: number
  sync: { updatedBillIds: number[]; cancelledBillIds: number[] }
} {
  const test = getVisitTest(visitTestId)
  if (!test) throw new Error('Test not found')
  if ((test.source ?? 'clinic') === 'outside') {
    throw new Error('Outside tests are not billed and cannot be refunded')
  }
  if (!isVisitTestPaid(visitTestId)) {
    throw new Error('This test has no payment to refund')
  }

  const visitId = test.visit_id
  // Soft-remove by cancelling so sync drops the bill line, then delete the row
  getDb()
    .prepare(`UPDATE visit_tests SET status='Cancelled', updated_at=datetime('now') WHERE id=?`)
    .run(visitTestId)
  const sync = syncBillsAfterVisitTestsChange(visitId)
  const row = getVisitTest(visitTestId)
  if (row?.report_file_name) removeTestReportFile(row.report_file_name)
  getDb().prepare(`DELETE FROM visit_tests WHERE id=?`).run(visitTestId)
  return { visitId, sync }
}

/** Mark scheduled test completed, or advised/scheduled test cancelled. */
export function setVisitTestWorkflowStatus(id: number, status: 'Completed' | 'Cancelled'): VisitTest {
  const row = getVisitTest(id)
  if (!row) throw new Error('Test not found')
  if (status === 'Completed') {
    if (row.status !== 'Scheduled') throw new Error('Only scheduled tests can be marked completed')
  } else if (status === 'Cancelled') {
    if (row.status !== 'Advised' && row.status !== 'Scheduled') {
      throw new Error('Only advised or scheduled tests can be cancelled')
    }
  } else {
    throw new Error('Invalid status')
  }
  getDb()
    .prepare(`UPDATE visit_tests SET status=?, updated_at=datetime('now') WHERE id=?`)
    .run(status, id)
  return getVisitTest(id)!
}

export function saveVisitTestReport(
  id: number,
  file: { fileName: string; fileKind: string; originalName: string },
): { test: VisitTest; previousFileName: string | null } {
  const row = getVisitTest(id)
  if (!row) throw new Error('Test not found')
  if (row.status !== 'Completed' && row.status !== 'Result received') {
    throw new Error('Upload a report only after the test is completed')
  }
  const previousFileName = row.report_file_name
  getDb()
    .prepare(
      `UPDATE visit_tests SET
        report_file_name=?, report_original_name=?, report_file_kind=?,
        status='Result received',
        result_date=COALESCE(result_date, date('now')),
        updated_at=datetime('now')
       WHERE id=?`,
    )
    .run(file.fileName, file.originalName, file.fileKind, id)
  return { test: getVisitTest(id)!, previousFileName }
}

export function getVisitTestReportFileName(id: number): string | null {
  const row = getVisitTest(id)
  return row?.report_file_name ?? null
}

export function getVisitProcedures(visitId: number): VisitProcedure[] {
  return getDb().prepare(`SELECT * FROM visit_procedures WHERE visit_id=?`).all(visitId) as VisitProcedure[]
}

function calcBillTotals(
  items: BillItemInput[],
  discountType: DiscountType,
  discountValue: number,
  taxPercent: number,
) {
  const subtotal = items.reduce((sum, item) => {
    const line = item.quantity * item.unitPrice - (item.discount ?? 0)
    return sum + Math.max(0, line)
  }, 0)
  let afterDiscount = subtotal
  if (discountType === 'flat') afterDiscount = Math.max(0, subtotal - discountValue)
  if (discountType === 'percent') afterDiscount = Math.max(0, subtotal - (subtotal * discountValue) / 100)
  const taxAmount = taxPercent > 0 ? (afterDiscount * taxPercent) / 100 : 0
  const totalAmount = afterDiscount + taxAmount
  return { subtotal, taxAmount, totalAmount }
}

function refreshBillPaymentState(billId: number): Bill {
  const paid = getDb()
    .prepare(
      `SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE bill_id=? AND cancelled_at IS NULL`,
    )
    .get(billId) as { total: number }
  const bill = getDb().prepare(`SELECT * FROM bills WHERE id=?`).get(billId) as Bill
  const amountPaid = paid.total
  const outstanding = Math.max(0, Number(bill.total_amount) - amountPaid)
  let paymentStatus: Bill['payment_status'] = 'Unpaid'
  if (amountPaid <= 0) paymentStatus = 'Unpaid'
  else if (outstanding <= 0.009) paymentStatus = 'Paid'
  else paymentStatus = 'Partially paid'
  getDb()
    .prepare(
      `UPDATE bills SET amount_paid=?, outstanding_amount=?, payment_status=?, updated_at=datetime('now') WHERE id=?`,
    )
    .run(amountPaid, outstanding, paymentStatus, billId)
  return getDb().prepare(`SELECT * FROM bills WHERE id=?`).get(billId) as Bill
}

/** Cancel newest payments (and their invoices) until paid amount fits the bill total. */
function cancelExcessPayments(billId: number): void {
  const bill = getBill(billId)
  if (!bill) return
  const payments = getDb()
    .prepare(
      `SELECT * FROM payments WHERE bill_id=? AND cancelled_at IS NULL ORDER BY id DESC`,
    )
    .all(billId) as Payment[]
  let paid = payments.reduce((s, p) => s + Number(p.amount), 0)
  const target = Number(bill.total_amount)
  for (const p of payments) {
    if (paid <= target + 0.009) break
    getDb()
      .prepare(`UPDATE payments SET cancelled_at=datetime('now'), updated_at=datetime('now') WHERE id=?`)
      .run(p.id)
    getDb().prepare(`DELETE FROM invoices WHERE payment_id=?`).run(p.id)
    paid -= Number(p.amount)
  }
}

function rewriteBillItemsForSync(billId: number, items: BillItemInput[]): Bill {
  if (!items.length) throw new Error('Bill must keep at least one item')
  const bill = getBill(billId)
  if (!bill) throw new Error('Bill not found')
  if (bill.cancelled_at) throw new Error('Cancelled bills cannot be edited')

  const settings = getSettings()
  const taxPercent = settings.tax_enabled === '1' ? settings.tax_percent : 0
  const { subtotal, taxAmount, totalAmount } = calcBillTotals(
    items,
    bill.discount_type,
    bill.discount_value,
    taxPercent,
  )

  getDb().transaction(() => {
    getDb()
      .prepare(
        `UPDATE bills SET
          subtotal=?, tax_amount=?, total_amount=?, updated_at=datetime('now')
         WHERE id=?`,
      )
      .run(subtotal, taxAmount, totalAmount, billId)
    getDb().prepare(`DELETE FROM bill_items WHERE bill_id=?`).run(billId)
    const insert = getDb().prepare(
      `INSERT INTO bill_items (bill_id, item_type, item_reference_id, item_name, quantity, unit_price, discount, total)
       VALUES (?,?,?,?,?,?,?,?)`,
    )
    for (const item of items) {
      const line = Math.max(0, item.quantity * item.unitPrice - (item.discount ?? 0))
      insert.run(
        billId,
        item.itemType,
        item.itemReferenceId ?? null,
        item.itemName,
        item.quantity,
        item.unitPrice,
        item.discount ?? 0,
        line,
      )
    }
  })()
  cancelExcessPayments(billId)
  return refreshBillPaymentState(billId)
}

/**
 * After tests change: drop cancelled/removed clinic-test lines from visit bills and
 * cancel excess payments so totals stay consistent.
 */
export function syncBillsAfterVisitTestsChange(visitId: number): { updatedBillIds: number[]; cancelledBillIds: number[] } {
  const allTests = getVisitTests(visitId)
  const clinicTests = billableClinicTests(visitId)
  const activeIds = new Set(clinicTests.map((t) => t.id))
  const visitTestIds = new Set(allTests.map((t) => t.id))
  const updatedBillIds: number[] = []
  const cancelledBillIds: number[] = []

  for (const bill of listBillsForVisit(visitId)) {
    const items = getBillItems(bill.id)
    const kept = items.filter((i) => {
      if (i.item_type !== 'Test') return true
      if (i.item_reference_id != null) {
        if (activeIds.has(i.item_reference_id)) return true
        // Line points at a visit_test for this visit that is cancelled / outside → drop
        if (visitTestIds.has(i.item_reference_id)) return false
        // Legacy catalog test_id match
        return clinicTests.some((t) => t.test_id != null && i.item_reference_id === t.test_id)
      }
      return clinicTests.some((t) => i.item_name === t.test_name_snapshot)
    })

    if (kept.length === items.length) continue

    if (kept.length === 0) {
      const payments = getDb()
        .prepare(`SELECT id FROM payments WHERE bill_id=? AND cancelled_at IS NULL`)
        .all(bill.id) as Array<{ id: number }>
      for (const p of payments) {
        getDb()
          .prepare(`UPDATE payments SET cancelled_at=datetime('now'), updated_at=datetime('now') WHERE id=?`)
          .run(p.id)
        getDb().prepare(`DELETE FROM invoices WHERE payment_id=?`).run(p.id)
      }
      getDb()
        .prepare(
          `UPDATE bills SET status='cancelled', payment_status='Cancelled', cancelled_at=datetime('now'), updated_at=datetime('now') WHERE id=?`,
        )
        .run(bill.id)
      cancelledBillIds.push(bill.id)
      continue
    }

    rewriteBillItemsForSync(
      bill.id,
      kept.map((i) => ({
        itemType: i.item_type as BillItemInput['itemType'],
        itemReferenceId: i.item_reference_id,
        itemName: i.item_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        discount: i.discount,
      })),
    )
    updatedBillIds.push(bill.id)
  }

  return { updatedBillIds, cancelledBillIds }
}

export function listBillsForVisit(visitId: number): Bill[] {
  return getDb()
    .prepare(
      `SELECT * FROM bills WHERE visit_id=? AND cancelled_at IS NULL ORDER BY id DESC`,
    )
    .all(visitId) as Bill[]
}

export function getActiveBillForVisit(visitId: number): Bill | null {
  return listBillsForVisit(visitId)[0] ?? null
}

function visitHasBillableWork(visitId: number): boolean {
  const rx = getPrescriptionByVisit(visitId)
  if (rx) return true
  const tests = getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM visit_tests
       WHERE visit_id=? AND status != 'Cancelled' AND IFNULL(source,'clinic') = 'clinic'`,
    )
    .get(visitId) as { c: number }
  if (tests.c > 0) return true
  const procedures = getDb()
    .prepare(`SELECT COUNT(*) AS c FROM visit_procedures WHERE visit_id=?`)
    .get(visitId) as { c: number }
  return procedures.c > 0
}

export function saveBill(input: {
  id?: number
  patientId: number
  visitId?: number | null
  billDate: string
  discountType?: DiscountType
  discountValue?: number
  notes?: string
  status?: 'draft' | 'finalized'
  items: BillItemInput[]
}): Bill {
  if (!input.items.length) throw new Error('Add at least one bill item')
  if (!input.visitId) {
    throw new Error('Bills must be linked to a visit')
  }
  const visit = getVisit(input.visitId)
  if (!visit || visit.patient_id !== input.patientId) {
    throw new Error('Visit not found for this patient')
  }
  if (!visitHasBillableWork(input.visitId)) {
    throw new Error('Create a prescription, add tests, or add services for this visit before generating a bill')
  }
  if (input.id) {
    const existing = getBill(input.id)
    if (!existing) throw new Error('Bill not found')
    if (existing.payment_status === 'Paid') throw new Error('Paid bills cannot be edited')
    if (existing.status === 'finalized') throw new Error('Finalized bills cannot be edited')
  } else {
    const unpaid = listBillsForVisit(input.visitId).find(
      (b) => b.payment_status !== 'Paid' && b.status !== 'cancelled',
    )
    if (unpaid) {
      throw new Error('An unpaid bill already exists for this visit — collect payment or edit that bill')
    }
  }

  const settings = getSettings()
  const taxPercent = settings.tax_enabled === '1' ? settings.tax_percent : 0
  const discountType = input.discountType ?? 'none'
  const discountValue = input.discountValue ?? 0
  const { subtotal, taxAmount, totalAmount } = calcBillTotals(
    input.items,
    discountType,
    discountValue,
    taxPercent,
  )

  const tx = getDb().transaction(() => {
    let billId = input.id
    if (billId) {
      const existing = getDb().prepare(`SELECT * FROM bills WHERE id=?`).get(billId) as Bill
      if (existing.status === 'finalized') throw new Error('Finalized bills cannot be edited')
      getDb()
        .prepare(
          `UPDATE bills SET
            visit_id=?, bill_date=?, subtotal=?, discount_type=?, discount_value=?, tax_amount=?,
            total_amount=?, outstanding_amount=?, notes=?, status=?, updated_at=datetime('now')
           WHERE id=?`,
        )
        .run(
          input.visitId,
          input.billDate,
          subtotal,
          discountType,
          discountValue,
          taxAmount,
          totalAmount,
          totalAmount,
          input.notes ?? null,
          input.status ?? 'draft',
          billId,
        )
      getDb().prepare(`DELETE FROM bill_items WHERE bill_id=?`).run(billId)
    } else {
      const prefix = settings.bill_prefix || 'BILL'
      const billNumber = nextCode(prefix)
      const result = getDb()
        .prepare(
          `INSERT INTO bills (
            bill_number, patient_id, visit_id, bill_date, subtotal, discount_type, discount_value,
            tax_amount, total_amount, amount_paid, outstanding_amount, payment_status, status, notes
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          billNumber,
          input.patientId,
          input.visitId,
          input.billDate,
          subtotal,
          discountType,
          discountValue,
          taxAmount,
          totalAmount,
          0,
          totalAmount,
          'Unpaid',
          input.status ?? 'draft',
          input.notes ?? null,
        )
      billId = Number(result.lastInsertRowid)
    }

    const insert = getDb().prepare(
      `INSERT INTO bill_items (bill_id, item_type, item_reference_id, item_name, quantity, unit_price, discount, total)
       VALUES (?,?,?,?,?,?,?,?)`,
    )
    for (const item of input.items) {
      const line = Math.max(0, item.quantity * item.unitPrice - (item.discount ?? 0))
      insert.run(
        billId,
        item.itemType,
        item.itemReferenceId ?? null,
        item.itemName,
        item.quantity,
        item.unitPrice,
        item.discount ?? 0,
        line,
      )
    }
    return billId!
  })
  const id = tx()
  return refreshBillPaymentState(id)
}

export function getBill(id: number): Bill | null {
  return (getDb().prepare(`SELECT * FROM bills WHERE id=?`).get(id) as Bill | undefined) ?? null
}

export function getBillItems(billId: number): BillItem[] {
  return getDb().prepare(`SELECT * FROM bill_items WHERE bill_id=?`).all(billId) as BillItem[]
}

/** Rewrite line items on an unpaid bill (draft or finalized) and refresh payment totals. */
function rewriteUnpaidBillItems(
  billId: number,
  items: BillItemInput[],
  status: 'draft' | 'finalized' = 'finalized',
): Bill {
  if (!items.length) throw new Error('Add at least one bill item')
  const bill = getBill(billId)
  if (!bill) throw new Error('Bill not found')
  if (bill.payment_status === 'Paid') throw new Error('Paid bills cannot be edited')
  if (bill.cancelled_at) throw new Error('Cancelled bills cannot be edited')

  const settings = getSettings()
  const taxPercent = settings.tax_enabled === '1' ? settings.tax_percent : 0
  const { subtotal, taxAmount, totalAmount } = calcBillTotals(
    items,
    bill.discount_type,
    bill.discount_value,
    taxPercent,
  )

  getDb().transaction(() => {
    getDb()
      .prepare(
        `UPDATE bills SET
          subtotal=?, tax_amount=?, total_amount=?, status=?, updated_at=datetime('now')
         WHERE id=?`,
      )
      .run(subtotal, taxAmount, totalAmount, status, billId)
    getDb().prepare(`DELETE FROM bill_items WHERE bill_id=?`).run(billId)
    const insert = getDb().prepare(
      `INSERT INTO bill_items (bill_id, item_type, item_reference_id, item_name, quantity, unit_price, discount, total)
       VALUES (?,?,?,?,?,?,?,?)`,
    )
    for (const item of items) {
      const line = Math.max(0, item.quantity * item.unitPrice - (item.discount ?? 0))
      insert.run(
        billId,
        item.itemType,
        item.itemReferenceId ?? null,
        item.itemName,
        item.quantity,
        item.unitPrice,
        item.discount ?? 0,
        line,
      )
    }
  })()
  return refreshBillPaymentState(billId)
}

export type ClinicTestBillingResult = {
  bill: Bill
  clinicTestCount: number
  collectPayment: boolean
  message?: string
}

/** Clinic tests on this visit that are not yet on any active bill. */
function getUnbilledClinicTests(visitId: number, clinicTests: VisitTest[]): VisitTest[] {
  const testLines: BillItem[] = []
  for (const b of listBillsForVisit(visitId)) {
    for (const item of getBillItems(b.id)) {
      if (item.item_type === 'Test') testLines.push(item)
    }
  }
  const claimedItemIds = new Set<number>()
  const billedVisitTestIds = new Set<number>()

  for (const t of clinicTests) {
    const byVisitTestId = testLines.find((i) => i.item_reference_id === t.id && !claimedItemIds.has(i.id))
    if (byVisitTestId) {
      claimedItemIds.add(byVisitTestId.id)
      billedVisitTestIds.add(t.id)
      continue
    }
    // Legacy rows stored catalog test_id or name only
    const byLegacy = testLines.find(
      (i) =>
        !claimedItemIds.has(i.id) &&
        ((t.test_id != null && i.item_reference_id === t.test_id) ||
          i.item_name === t.test_name_snapshot),
    )
    if (byLegacy) {
      claimedItemIds.add(byLegacy.id)
      billedVisitTestIds.add(t.id)
    }
  }

  return clinicTests.filter((t) => !billedVisitTestIds.has(t.id))
}

function clinicTestBillItems(tests: VisitTest[]): BillItemInput[] {
  return tests.map((t) => ({
    itemType: 'Test' as const,
    itemReferenceId: t.id, // visit_tests.id — tracks which ordered tests are billed
    itemName: t.test_name_snapshot,
    quantity: 1,
    unitPrice: Number(t.charge) || 0,
  }))
}

/**
 * After clinic tests are ordered: bill any not-yet-billed clinic tests and open payment.
 * If the visit bill was already paid, creates a new bill for the additional tests.
 * Outside tests are ignored.
 */
export function ensureClinicTestBill(visitId: number): ClinicTestBillingResult | null {
  const visit = getVisit(visitId)
  if (!visit) throw new Error('Visit not found')

  const clinicTests = billableClinicTests(visitId)
  if (!clinicTests.length) return null

  const unbilled = getUnbilledClinicTests(visitId, clinicTests)
  const bills = listBillsForVisit(visitId)
  const unpaidBill = bills.find((b) => b.payment_status !== 'Paid' && b.status !== 'cancelled') ?? null

  if (!unbilled.length) {
    if (unpaidBill && unpaidBill.outstanding_amount > 0) {
      return {
        bill: unpaidBill,
        clinicTestCount: 0,
        collectPayment: true,
        message: 'Collect outstanding payment for this visit',
      }
    }
    return null
  }

  const testItems = clinicTestBillItems(unbilled)
  const settings = getSettings()

  // No bill yet — first bill with consultation + tests (+ procedures)
  if (!bills.length) {
    const isFollowUp = String(visit.visit_type).toLowerCase().includes('follow')
    const items: BillItemInput[] = [
      {
        itemType: 'Consultation',
        itemName: isFollowUp ? 'Follow-up Consultation' : 'General Consultation',
        quantity: 1,
        unitPrice: isFollowUp
          ? Number(settings.default_followup_fee)
          : Number(settings.default_consultation_fee),
      },
      ...testItems,
    ]
    const unbilledProcs = getUnbilledProcedures(visitId, getVisitProcedures(visitId))
    items.push(...procedureBillItems(unbilledProcs))
    const bill = saveBill({
      patientId: visit.patient_id,
      visitId,
      billDate: todayIso(),
      status: 'finalized',
      items,
    })
    return {
      bill,
      clinicTestCount: unbilled.length,
      collectPayment: bill.outstanding_amount > 0,
    }
  }

  // Unpaid bill exists — append new clinic tests onto it
  if (unpaidBill) {
    const existingItems = getBillItems(unpaidBill.id)
    const kept: BillItemInput[] = existingItems.map((i) => ({
      itemType: i.item_type as BillItemInput['itemType'],
      itemReferenceId: i.item_reference_id,
      itemName: i.item_name,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      discount: i.discount,
    }))
    const merged = [...kept, ...testItems]
    let bill: Bill
    if (unpaidBill.status === 'draft') {
      bill = saveBill({
        id: unpaidBill.id,
        patientId: unpaidBill.patient_id,
        visitId,
        billDate: unpaidBill.bill_date,
        discountType: unpaidBill.discount_type,
        discountValue: unpaidBill.discount_value,
        notes: unpaidBill.notes ?? undefined,
        status: 'finalized',
        items: merged,
      })
    } else {
      bill = rewriteUnpaidBillItems(unpaidBill.id, merged, 'finalized')
    }
    return {
      bill,
      clinicTestCount: unbilled.length,
      collectPayment: bill.outstanding_amount > 0,
    }
  }

  // All existing bills are paid — new bill for additional clinic tests only
  const bill = saveBill({
    patientId: visit.patient_id,
    visitId,
    billDate: todayIso(),
    status: 'finalized',
    notes: `Additional clinic tests (${unbilled.length})`,
    items: testItems,
  })
  return {
    bill,
    clinicTestCount: unbilled.length,
    collectPayment: bill.outstanding_amount > 0,
    message: `New bill created for ${unbilled.length} additional clinic test${unbilled.length === 1 ? '' : 's'}`,
  }
}

/** Line items not yet on any active visit bill (consultation / clinic tests / procedures). */
export function getVisitLeftoverBillItems(visitId: number): BillItemInput[] {
  const visit = getVisit(visitId)
  if (!visit) throw new Error('Visit not found')

  const settings = getSettings()
  const bills = listBillsForVisit(visitId)
  const billed = bills.flatMap((b) => getBillItems(b.id))
  const hasConsultation = billed.some((i) => i.item_type === 'Consultation')

  const clinicTests = billableClinicTests(visitId)
  const unbilledTests = getUnbilledClinicTests(visitId, clinicTests)

  const items: BillItemInput[] = []
  if (!hasConsultation) {
    const isFollowUp = String(visit.visit_type).toLowerCase().includes('follow')
    items.push({
      itemType: 'Consultation',
      itemName: isFollowUp ? 'Follow-up Consultation' : 'General Consultation',
      quantity: 1,
      unitPrice: isFollowUp
        ? Number(settings.default_followup_fee)
        : Number(settings.default_consultation_fee),
    })
  }
  items.push(...clinicTestBillItems(unbilledTests))
  const unbilledProcedures = getUnbilledProcedures(visitId, getVisitProcedures(visitId))
  items.push(...procedureBillItems(unbilledProcedures))
  return items
}

/** Combined billing view for a visit — all bills, line items, and invoices. */
export function getVisitBillingSummary(visitId: number): {
  visit_id: number
  patient_id: number
  bills: Bill[]
  items: Array<BillItem & { bill_id: number; bill_number: string }>
  invoices: Invoice[]
  totals: { billed: number; paid: number; outstanding: number }
} {
  const visit = getVisit(visitId)
  if (!visit) throw new Error('Visit not found')
  const bills = listBillsForVisit(visitId)
  const items = bills.flatMap((b) =>
    getBillItems(b.id).map((i) => ({
      ...i,
      bill_id: b.id,
      bill_number: b.bill_number,
    })),
  )
  const invoices = bills.flatMap((b) => listInvoicesForBill(b.id))
  return {
    visit_id: visitId,
    patient_id: visit.patient_id,
    bills,
    items,
    invoices,
    totals: {
      billed: bills.reduce((s, b) => s + Number(b.total_amount), 0),
      paid: bills.reduce((s, b) => s + Number(b.amount_paid), 0),
      outstanding: bills.reduce((s, b) => s + Number(b.outstanding_amount), 0),
    },
  }
}

export function cancelBill(id: number): Bill {
  getDb()
    .prepare(
      `UPDATE bills SET status='cancelled', payment_status='Cancelled', cancelled_at=datetime('now'), updated_at=datetime('now') WHERE id=?`,
    )
    .run(id)
  return getBill(id)!
}

export function getPayment(id: number): Payment | null {
  return (getDb().prepare(`SELECT * FROM payments WHERE id=?`).get(id) as Payment | undefined) ?? null
}

export function getInvoice(id: number): Invoice | null {
  return (getDb().prepare(`SELECT * FROM invoices WHERE id=?`).get(id) as Invoice | undefined) ?? null
}

export function listInvoicesForBill(billId: number): Invoice[] {
  return getDb()
    .prepare(`SELECT * FROM invoices WHERE bill_id=? ORDER BY id DESC`)
    .all(billId) as Invoice[]
}

export function getInvoiceByPayment(paymentId: number): Invoice | null {
  return (
    (getDb().prepare(`SELECT * FROM invoices WHERE payment_id=?`).get(paymentId) as Invoice | undefined) ??
    null
  )
}

export function recordPayment(input: {
  billId: number
  patientId: number
  paymentDate: string
  amount: number
  paymentMode: PaymentMode
  referenceNumber?: string
  notes?: string
}): { payment: Payment; invoice: Invoice } {
  if (input.amount <= 0) throw new Error('Payment amount must be positive')
  const bill = getBill(input.billId)
  if (!bill) throw new Error('Bill not found')
  if (bill.status !== 'finalized') throw new Error('Finalize the bill before recording payment')
  if (input.amount > bill.outstanding_amount + 0.009) {
    throw new Error('Payment exceeds outstanding amount')
  }
  const settings = getSettings()
  const payCode = nextCode('PAY')
  const invoiceNumber = nextCode(settings.invoice_prefix || 'INV')

  const result = getDb()
    .transaction(() => {
      const payResult = getDb()
        .prepare(
          `INSERT INTO payments (payment_code, bill_id, patient_id, payment_date, amount, payment_mode, reference_number, notes)
           VALUES (?,?,?,?,?,?,?,?)`,
        )
        .run(
          payCode,
          input.billId,
          input.patientId,
          input.paymentDate,
          input.amount,
          input.paymentMode,
          input.referenceNumber ?? null,
          input.notes ?? null,
        )
      const paymentId = Number(payResult.lastInsertRowid)
      const invResult = getDb()
        .prepare(
          `INSERT INTO invoices (invoice_number, bill_id, payment_id, invoice_date, amount, payment_mode, reference_number, notes)
           VALUES (?,?,?,?,?,?,?,?)`,
        )
        .run(
          invoiceNumber,
          input.billId,
          paymentId,
          input.paymentDate,
          input.amount,
          input.paymentMode,
          input.referenceNumber ?? null,
          input.notes ?? null,
        )
      return {
        paymentId,
        invoiceId: Number(invResult.lastInsertRowid),
      }
    })()

  refreshBillPaymentState(input.billId)
  const payment = getDb().prepare(`SELECT * FROM payments WHERE id=?`).get(result.paymentId) as Payment
  const invoice = getInvoice(result.invoiceId)!
  return { payment, invoice }
}

const VISIT_LIST_SELECT = `
  SELECT v.*, p.full_name AS patient_name, p.patient_code, p.gender AS patient_gender, p.age AS patient_age,
    rx.id AS prescription_id, rx.status AS prescription_status,
    (
      SELECT id FROM bills
      WHERE visit_id = v.id AND cancelled_at IS NULL
      ORDER BY id DESC LIMIT 1
    ) AS bill_id,
    (
      SELECT COALESCE(SUM(total_amount), 0) FROM bills
      WHERE visit_id = v.id AND cancelled_at IS NULL
    ) AS billed_amount,
    (
      SELECT payment_status FROM bills
      WHERE visit_id = v.id AND cancelled_at IS NULL
      ORDER BY
        CASE payment_status
          WHEN 'Unpaid' THEN 0
          WHEN 'Partially paid' THEN 1
          ELSE 2
        END,
        id DESC
      LIMIT 1
    ) AS bill_payment_status
  FROM visits v
  JOIN patients p ON p.id = v.patient_id
  LEFT JOIN prescriptions rx ON rx.visit_id = v.id AND rx.deleted_at IS NULL
  WHERE v.deleted_at IS NULL`

export function listVisits(query = '', limit = 300): VisitListItem[] {
  const q = query.trim()
  const sql = `${VISIT_LIST_SELECT}
    ${q ? `AND (p.full_name LIKE ? OR p.patient_code LIKE ? OR v.visit_code LIKE ? OR IFNULL(v.provisional_diagnosis,'') LIKE ? OR IFNULL(v.chief_complaints,'') LIKE ?)` : ''}
    ORDER BY v.visit_date DESC, v.id DESC LIMIT ?`
  const params: unknown[] = q ? [...Array(5).fill(`%${q}%`), limit] : [limit]
  return getDb().prepare(sql).all(...params) as VisitListItem[]
}

export function listPrescriptions(query = '', limit = 300): PrescriptionListItem[] {
  const q = query.trim()
  const sql = `
    SELECT rx.*, p.full_name AS patient_name, p.patient_code,
      (SELECT COUNT(*) FROM prescription_medicines pm WHERE pm.prescription_id = rx.id) AS medicine_count
    FROM prescriptions rx
    JOIN patients p ON p.id = rx.patient_id
    WHERE rx.deleted_at IS NULL
      ${q ? `AND (p.full_name LIKE ? OR p.patient_code LIKE ? OR rx.prescription_code LIKE ? OR IFNULL(rx.diagnosis,'') LIKE ?)` : ''}
    ORDER BY rx.prescription_date DESC, rx.id DESC LIMIT ?`
  const params: unknown[] = q ? [...Array(4).fill(`%${q}%`), limit] : [limit]
  return getDb().prepare(sql).all(...params) as PrescriptionListItem[]
}

export function listBills(query = '', limit = 300): BillListItem[] {
  const q = query.trim()
  const sql = `
    SELECT b.*, p.full_name AS patient_name, p.patient_code
    FROM bills b
    JOIN patients p ON p.id = b.patient_id
    WHERE 1=1
      ${q ? `AND (p.full_name LIKE ? OR p.patient_code LIKE ? OR b.bill_number LIKE ?)` : ''}
    ORDER BY b.bill_date DESC, b.id DESC LIMIT ?`
  const params: unknown[] = q ? [...Array(3).fill(`%${q}%`), limit] : [limit]
  return getDb().prepare(sql).all(...params) as BillListItem[]
}

export function listPayments(query = '', limit = 300): PaymentListItem[] {
  const q = query.trim()
  const sql = `
    SELECT pay.*, p.full_name AS patient_name, p.patient_code, b.bill_number
    FROM payments pay
    JOIN patients p ON p.id = pay.patient_id
    JOIN bills b ON b.id = pay.bill_id
    WHERE pay.cancelled_at IS NULL
      ${q ? `AND (p.full_name LIKE ? OR p.patient_code LIKE ? OR b.bill_number LIKE ? OR pay.payment_code LIKE ?)` : ''}
    ORDER BY pay.payment_date DESC, pay.id DESC LIMIT ?`
  const params: unknown[] = q ? [...Array(4).fill(`%${q}%`), limit] : [limit]
  return getDb().prepare(sql).all(...params) as PaymentListItem[]
}

export function getDashboard(): DashboardData {
  const db = getDb()
  const totalPatients = (db.prepare(`SELECT COUNT(*) AS c FROM patients WHERE deleted_at IS NULL AND is_archived=0`).get() as { c: number }).c
  const patientsThisMonth = (db.prepare(`SELECT COUNT(*) AS c FROM patients WHERE deleted_at IS NULL AND is_archived=0 AND strftime('%Y-%m', created_at)=strftime('%Y-%m','now','localtime')`).get() as { c: number }).c
  const visitsToday = (db.prepare(`SELECT COUNT(*) AS c FROM visits WHERE deleted_at IS NULL AND date(visit_date)=date('now','localtime')`).get() as { c: number }).c
  const visitsThisWeek = (db.prepare(`SELECT COUNT(*) AS c FROM visits WHERE deleted_at IS NULL AND date(visit_date) >= date('now','localtime','weekday 0','-6 days')`).get() as { c: number }).c
  const visitsThisMonth = (db.prepare(`SELECT COUNT(*) AS c FROM visits WHERE deleted_at IS NULL AND strftime('%Y-%m', visit_date)=strftime('%Y-%m','now','localtime')`).get() as { c: number }).c
  const collectionsToday = (db.prepare(`SELECT COALESCE(SUM(amount),0) AS c FROM payments WHERE cancelled_at IS NULL AND date(payment_date)=date('now','localtime')`).get() as { c: number }).c
  const pendingPayments = (db.prepare(`SELECT COALESCE(SUM(outstanding_amount),0) AS c FROM bills WHERE status='finalized' AND cancelled_at IS NULL`).get() as { c: number }).c
  const pendingPrescriptions = (db.prepare(`SELECT COUNT(*) AS c FROM prescriptions WHERE deleted_at IS NULL AND status='draft'`).get() as { c: number }).c
  const totalMedicines = (db.prepare(`SELECT COUNT(*) AS c FROM medicines WHERE is_active=1`).get() as { c: number }).c
  const todaysVisits = db
    .prepare(`${VISIT_LIST_SELECT} AND date(v.visit_date)=date('now','localtime') ORDER BY v.visit_time ASC, v.id ASC LIMIT 10`)
    .all() as VisitListItem[]
  const recentVisits = db
    .prepare(
      `SELECT v.*, p.full_name AS patient_name, p.patient_code
       FROM visits v JOIN patients p ON p.id=v.patient_id
       WHERE v.deleted_at IS NULL
       ORDER BY v.visit_date DESC, v.id DESC LIMIT 8`,
    )
    .all() as DashboardData['recentVisits']
  const recentPatients = db
    .prepare(
      `SELECT id, full_name, patient_code, age, gender, created_at
       FROM patients WHERE deleted_at IS NULL AND is_archived=0
       ORDER BY created_at DESC, id DESC LIMIT 6`,
    )
    .all() as DashboardData['recentPatients']
  const upcomingFollowUps = db
    .prepare(
      `SELECT v.*, p.full_name AS patient_name, p.patient_code
       FROM visits v JOIN patients p ON p.id=v.patient_id
       WHERE v.deleted_at IS NULL AND v.follow_up_date IS NOT NULL AND v.follow_up_date >= date('now','localtime')
       ORDER BY v.follow_up_date ASC LIMIT 8`,
    )
    .all() as DashboardData['upcomingFollowUps']
  const topMedicines = db
    .prepare(
      `SELECT name, usage_count AS count FROM medicines WHERE usage_count > 0 ORDER BY usage_count DESC LIMIT 8`,
    )
    .all() as DashboardData['topMedicines']

  // Calendar weeks: Monday = date('now','weekday 0','-6 days') in SQLite
  const thisMonday = (db.prepare(`SELECT date('now','localtime','weekday 0','-6 days') AS d`).get() as { d: string }).d
  const lastMonday = addDaysIso(thisMonday, -7)
  const dayCountStmt = db.prepare(
    `SELECT COUNT(*) AS c FROM visits WHERE deleted_at IS NULL AND date(visit_date)=?`,
  )
  const buildWeekTrend = (monday: string): DashboardData['weeklyTrend'] => {
    const days: DashboardData['weeklyTrend'] = []
    for (let i = 0; i < 7; i++) {
      const d = addDaysIso(monday, i)
      days.push({ date: d, count: (dayCountStmt.get(d) as { c: number }).c })
    }
    return days
  }
  const weeklyTrend = buildWeekTrend(thisMonday)
  const lastWeekTrend = buildWeekTrend(lastMonday)
  const visitsLastWeek = lastWeekTrend.reduce((s, d) => s + d.count, 0)

  return {
    totalPatients,
    patientsThisMonth,
    visitsToday,
    visitsThisWeek,
    visitsThisMonth,
    collectionsToday,
    pendingPayments,
    pendingPrescriptions,
    totalMedicines,
    todaysVisits,
    recentVisits,
    recentPatients,
    upcomingFollowUps,
    topMedicines,
    weeklyTrend,
    lastWeekTrend,
    visitsLastWeek,
  }
}

function isoTodayLocal(): string {
  return (getDb().prepare(`SELECT date('now','localtime') AS d`).get() as { d: string }).d
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function eachDay(from: string, to: string): string[] {
  const out: string[] = []
  let cur = from.slice(0, 10)
  const end = to.slice(0, 10)
  // Cap at 400 days to keep charts readable; for longer ranges we bucket by month later
  let guard = 0
  while (cur <= end && guard < 800) {
    out.push(cur)
    cur = addDaysIso(cur, 1)
    guard++
  }
  return out
}

function eachMonth(from: string, to: string): string[] {
  const out: string[] = []
  let y = Number(from.slice(0, 4))
  let m = Number(from.slice(5, 7))
  const endY = Number(to.slice(0, 4))
  const endM = Number(to.slice(5, 7))
  let guard = 0
  while ((y < endY || (y === endY && m <= endM)) && guard < 120) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
    guard++
  }
  return out
}

export function getReports(input?: { from?: string; to?: string }): ReportSummary {
  const db = getDb()
  const today = isoTodayLocal()
  const to = (input?.to || today).slice(0, 10)
  const from = (input?.from || addDaysIso(to, -29)).slice(0, 10)

  const daySpan = eachDay(from, to).length
  const useMonthlyBuckets = daySpan > 90

  const totals = {
    totalPatients: (db.prepare(`SELECT COUNT(*) AS c FROM patients WHERE deleted_at IS NULL AND is_archived=0`).get() as { c: number }).c,
    totalVisits: (
      db
        .prepare(`SELECT COUNT(*) AS c FROM visits WHERE deleted_at IS NULL AND date(visit_date) BETWEEN ? AND ?`)
        .get(from, to) as { c: number }
    ).c,
    totalRevenue: (
      db
        .prepare(
          `SELECT COALESCE(SUM(amount),0) AS c FROM payments WHERE cancelled_at IS NULL AND payment_date BETWEEN ? AND ?`,
        )
        .get(from, to) as { c: number }
    ).c,
    pendingPayments: (
      db
        .prepare(
          `SELECT COALESCE(SUM(outstanding_amount),0) AS c FROM bills
           WHERE status='finalized' AND cancelled_at IS NULL AND bill_date BETWEEN ? AND ?`,
        )
        .get(from, to) as { c: number }
    ).c,
    totalPrescriptions: (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM prescriptions WHERE deleted_at IS NULL AND prescription_date BETWEEN ? AND ?`,
        )
        .get(from, to) as { c: number }
    ).c,
    newPatients: (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM patients WHERE deleted_at IS NULL AND date(created_at) BETWEEN ? AND ?`,
        )
        .get(from, to) as { c: number }
    ).c,
  }

  let collections: ReportSummary['collections'] = []
  if (useMonthlyBuckets) {
    const rows = db
      .prepare(
        `SELECT strftime('%Y-%m', payment_date) AS date, SUM(amount) AS amount
         FROM payments WHERE cancelled_at IS NULL AND payment_date BETWEEN ? AND ?
         GROUP BY strftime('%Y-%m', payment_date)`,
      )
      .all(from, to) as Array<{ date: string; amount: number }>
    const map = new Map(rows.map((r) => [r.date, r.amount]))
    collections = eachMonth(from, to).map((month) => ({ date: `${month}-01`, amount: map.get(month) ?? 0 }))
  } else {
    const rows = db
      .prepare(
        `SELECT payment_date AS date, SUM(amount) AS amount
         FROM payments WHERE cancelled_at IS NULL AND payment_date BETWEEN ? AND ?
         GROUP BY payment_date`,
      )
      .all(from, to) as Array<{ date: string; amount: number }>
    const map = new Map(rows.map((r) => [r.date, r.amount]))
    collections = eachDay(from, to).map((date) => ({ date, amount: map.get(date) ?? 0 }))
  }

  let visitsByDay: ReportSummary['visitsByDay'] = []
  if (useMonthlyBuckets) {
    const rows = db
      .prepare(
        `SELECT strftime('%Y-%m', visit_date) AS date, COUNT(*) AS count
         FROM visits WHERE deleted_at IS NULL AND date(visit_date) BETWEEN ? AND ?
         GROUP BY strftime('%Y-%m', visit_date)`,
      )
      .all(from, to) as Array<{ date: string; count: number }>
    const map = new Map(rows.map((r) => [r.date, r.count]))
    visitsByDay = eachMonth(from, to).map((month) => ({ date: `${month}-01`, count: map.get(month) ?? 0 }))
  } else {
    // For short ranges show every day; for medium ranges still daily
    const rows = db
      .prepare(
        `SELECT date(visit_date) AS date, COUNT(*) AS count
         FROM visits WHERE deleted_at IS NULL AND date(visit_date) BETWEEN ? AND ?
         GROUP BY date(visit_date)`,
      )
      .all(from, to) as Array<{ date: string; count: number }>
    const map = new Map(rows.map((r) => [r.date, r.count]))
    visitsByDay = eachDay(from, to).map((date) => ({ date, count: map.get(date) ?? 0 }))
  }

  const topDiagnoses = db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(final_diagnosis),''), NULLIF(TRIM(provisional_diagnosis),'')) AS name, COUNT(*) AS count
       FROM visits WHERE deleted_at IS NULL
         AND date(visit_date) BETWEEN ? AND ?
         AND COALESCE(NULLIF(TRIM(final_diagnosis),''), NULLIF(TRIM(provisional_diagnosis),'')) IS NOT NULL
       GROUP BY name ORDER BY count DESC LIMIT 8`,
    )
    .all(from, to) as ReportSummary['topDiagnoses']

  const paymentStatus = {
    paid: (
      db
        .prepare(
          `SELECT COALESCE(SUM(amount_paid),0) AS c FROM bills
           WHERE status='finalized' AND cancelled_at IS NULL AND bill_date BETWEEN ? AND ?`,
        )
        .get(from, to) as { c: number }
    ).c,
    pending: totals.pendingPayments,
  }

  const paymentMethods = db
    .prepare(
      `SELECT payment_mode AS mode, SUM(amount) AS amount, COUNT(*) AS count
       FROM payments WHERE cancelled_at IS NULL AND payment_date BETWEEN ? AND ?
       GROUP BY payment_mode ORDER BY amount DESC`,
    )
    .all(from, to) as ReportSummary['paymentMethods']

  const outstandingBills = db
    .prepare(
      `SELECT b.*, p.full_name AS patient_name, p.patient_code
       FROM bills b JOIN patients p ON p.id=b.patient_id
       WHERE b.status='finalized' AND b.outstanding_amount > 0
         AND b.bill_date BETWEEN ? AND ?
       ORDER BY b.outstanding_amount DESC`,
    )
    .all(from, to) as ReportSummary['outstandingBills']

  const medicineUsage = db
    .prepare(
      `SELECT pm.medicine_name_snapshot AS name, COUNT(*) AS count
       FROM prescription_medicines pm
       JOIN prescriptions rx ON rx.id = pm.prescription_id AND rx.deleted_at IS NULL
       WHERE rx.prescription_date BETWEEN ? AND ?
       GROUP BY pm.medicine_name_snapshot
       ORDER BY count DESC LIMIT 10`,
    )
    .all(from, to) as ReportSummary['medicineUsage']

  const growthRows = db
    .prepare(
      `SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count
       FROM patients WHERE deleted_at IS NULL AND date(created_at) BETWEEN ? AND ?
       GROUP BY month`,
    )
    .all(from, to) as Array<{ month: string; count: number }>
  const growthMap = new Map(growthRows.map((r) => [r.month, r.count]))
  const patientGrowth = eachMonth(from, to).map((month) => ({ month, count: growthMap.get(month) ?? 0 }))

  return {
    from,
    to,
    totals,
    collections,
    visitsByDay,
    topDiagnoses,
    paymentStatus,
    paymentMethods,
    outstandingBills,
    medicineUsage,
    patientGrowth,
  }
}

export type ExportKind = 'patients' | 'visits' | 'prescriptions' | 'bills' | 'payments' | 'tests'

export function getExportRows(
  kind: ExportKind,
  from: string,
  to: string,
): { headers: string[]; rows: Array<Array<string | number | null>> } {
  const db = getDb()
  const f = from.slice(0, 10)
  const t = to.slice(0, 10)

  if (kind === 'patients') {
    const rows = db
      .prepare(
        `SELECT patient_code, full_name, age, gender, mobile, email, address, blood_group,
                allergies, medical_conditions, created_at
         FROM patients WHERE deleted_at IS NULL AND date(created_at) BETWEEN ? AND ?
         ORDER BY created_at DESC`,
      )
      .all(f, t) as Array<Record<string, string | number | null>>
    return {
      headers: [
        'Patient Code',
        'Full Name',
        'Age',
        'Gender',
        'Mobile',
        'Email',
        'Address',
        'Blood Group',
        'Allergies',
        'Medical Conditions',
        'Registered On',
      ],
      rows: rows.map((r) => [
        r.patient_code,
        r.full_name,
        r.age,
        r.gender,
        r.mobile,
        r.email,
        r.address,
        r.blood_group,
        r.allergies,
        r.medical_conditions,
        r.created_at,
      ]),
    }
  }

  if (kind === 'visits') {
    const rows = db
      .prepare(
        `SELECT v.visit_code, v.visit_date, v.visit_time, p.patient_code, p.full_name,
                v.visit_type, v.chief_complaints, v.provisional_diagnosis, v.final_diagnosis,
                v.advice, v.follow_up_date
         FROM visits v JOIN patients p ON p.id=v.patient_id
         WHERE v.deleted_at IS NULL AND date(v.visit_date) BETWEEN ? AND ?
         ORDER BY v.visit_date DESC, v.id DESC`,
      )
      .all(f, t) as Array<Record<string, string | number | null>>
    return {
      headers: [
        'Visit Code',
        'Date',
        'Time',
        'Patient Code',
        'Patient Name',
        'Visit Type',
        'Complaints',
        'Provisional Diagnosis',
        'Final Diagnosis',
        'Advice',
        'Follow-up Date',
      ],
      rows: rows.map((r) => [
        r.visit_code,
        r.visit_date,
        r.visit_time,
        r.patient_code,
        r.full_name,
        r.visit_type,
        r.chief_complaints,
        r.provisional_diagnosis,
        r.final_diagnosis,
        r.advice,
        r.follow_up_date,
      ]),
    }
  }

  if (kind === 'prescriptions') {
    const rows = db
      .prepare(
        `SELECT rx.prescription_code, rx.prescription_date, p.patient_code, p.full_name,
                rx.diagnosis, rx.advice, rx.follow_up_date, rx.status, rx.edit_count,
                (SELECT COUNT(*) FROM prescription_medicines pm WHERE pm.prescription_id=rx.id) AS medicine_count
         FROM prescriptions rx JOIN patients p ON p.id=rx.patient_id
         WHERE rx.deleted_at IS NULL AND rx.prescription_date BETWEEN ? AND ?
         ORDER BY rx.prescription_date DESC`,
      )
      .all(f, t) as Array<Record<string, string | number | null>>
    return {
      headers: [
        'Prescription Code',
        'Date',
        'Patient Code',
        'Patient Name',
        'Diagnosis',
        'Advice',
        'Follow-up Date',
        'Status',
        'Edits',
        'Medicine Count',
      ],
      rows: rows.map((r) => [
        r.prescription_code,
        r.prescription_date,
        r.patient_code,
        r.full_name,
        r.diagnosis,
        r.advice,
        r.follow_up_date,
        r.status,
        r.edit_count ?? 0,
        r.medicine_count,
      ]),
    }
  }

  if (kind === 'bills') {
    const rows = db
      .prepare(
        `SELECT b.bill_number, b.bill_date, p.patient_code, p.full_name, b.status, b.payment_status,
                b.subtotal, b.discount_value, b.tax_amount, b.total_amount, b.amount_paid, b.outstanding_amount
         FROM bills b JOIN patients p ON p.id=b.patient_id
         WHERE b.cancelled_at IS NULL AND b.bill_date BETWEEN ? AND ?
         ORDER BY b.bill_date DESC`,
      )
      .all(f, t) as Array<Record<string, string | number | null>>
    return {
      headers: [
        'Invoice No',
        'Date',
        'Patient Code',
        'Patient Name',
        'Status',
        'Payment Status',
        'Subtotal',
        'Discount',
        'Tax',
        'Total',
        'Paid',
        'Outstanding',
      ],
      rows: rows.map((r) => [
        r.bill_number,
        r.bill_date,
        r.patient_code,
        r.full_name,
        r.status,
        r.payment_status,
        r.subtotal,
        r.discount_value,
        r.tax_amount,
        r.total_amount,
        r.amount_paid,
        r.outstanding_amount,
      ]),
    }
  }

  if (kind === 'payments') {
    const rows = db
      .prepare(
        `SELECT pay.payment_code, pay.payment_date, p.patient_code, p.full_name, b.bill_number,
                pay.amount, pay.payment_mode, pay.reference_number, pay.notes
         FROM payments pay
         JOIN patients p ON p.id=pay.patient_id
         JOIN bills b ON b.id=pay.bill_id
         WHERE pay.cancelled_at IS NULL AND pay.payment_date BETWEEN ? AND ?
         ORDER BY pay.payment_date DESC`,
      )
      .all(f, t) as Array<Record<string, string | number | null>>
    return {
      headers: [
        'Payment Code',
        'Date',
        'Patient Code',
        'Patient Name',
        'Invoice No',
        'Amount',
        'Mode',
        'Reference',
        'Notes',
      ],
      rows: rows.map((r) => [
        r.payment_code,
        r.payment_date,
        r.patient_code,
        r.full_name,
        r.bill_number,
        r.amount,
        r.payment_mode,
        r.reference_number,
        r.notes,
      ]),
    }
  }

  // tests
  const rows = db
    .prepare(
      `SELECT vt.test_name_snapshot, t.category, v.visit_date, p.patient_code, p.full_name,
              vt.status, vt.result_summary, vt.result_date, vt.is_abnormal, vt.charge
       FROM visit_tests vt
       JOIN visits v ON v.id=vt.visit_id AND v.deleted_at IS NULL
       JOIN patients p ON p.id=v.patient_id
       LEFT JOIN tests t ON t.id=vt.test_id
       WHERE date(v.visit_date) BETWEEN ? AND ?
       ORDER BY v.visit_date DESC`,
    )
    .all(f, t) as Array<Record<string, string | number | null>>
  return {
    headers: [
      'Test Name',
      'Category',
      'Visit Date',
      'Patient Code',
      'Patient Name',
      'Status',
      'Result Summary',
      'Result Date',
      'Abnormal',
      'Charge',
    ],
    rows: rows.map((r) => [
      r.test_name_snapshot,
      r.category,
      r.visit_date,
      r.patient_code,
      r.full_name,
      r.status,
      r.result_summary,
      r.result_date,
      r.is_abnormal ? 'Yes' : 'No',
      r.charge,
    ]),
  }
}

export function globalSearch(query: string) {
  const q = query.trim()
  if (!q) return { patients: [], visits: [], bills: [], medicines: [] }
  const like = `%${q}%`
  return {
    patients: getDb()
      .prepare(
        `SELECT id, patient_code, full_name, mobile FROM patients
         WHERE deleted_at IS NULL AND (full_name LIKE ? OR patient_code LIKE ? OR IFNULL(mobile,'') LIKE ?)
         LIMIT 10`,
      )
      .all(like, like, like),
    visits: getDb()
      .prepare(
        `SELECT v.id, v.visit_code, v.visit_date, p.full_name AS patient_name
         FROM visits v JOIN patients p ON p.id=v.patient_id
         WHERE v.deleted_at IS NULL AND (v.visit_code LIKE ? OR p.full_name LIKE ?)
         LIMIT 10`,
      )
      .all(like, like),
    bills: getDb()
      .prepare(
        `SELECT b.id, b.bill_number, b.total_amount, p.full_name AS patient_name
         FROM bills b JOIN patients p ON p.id=b.patient_id
         WHERE b.bill_number LIKE ? OR p.full_name LIKE ?
         LIMIT 10`,
      )
      .all(like, like),
    medicines: getDb()
      .prepare(`SELECT id, name, strength, dosage_form FROM medicines WHERE name LIKE ? LIMIT 10`)
      .all(like),
  }
}
