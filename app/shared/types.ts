export type Gender = 'Male' | 'Female' | 'Other'

export type MaritalStatus = 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'Other'

export type VisitType =
  | 'New consultation'
  | 'Follow-up consultation'
  | 'Emergency visit'
  | 'Routine check-up'
  | 'Procedure visit'
  | 'Test review'

export type DosageForm =
  | 'Tablet'
  | 'Capsule'
  | 'Syrup'
  | 'Injection'
  | 'Cream'
  | 'Ointment'
  | 'Drops'
  | 'Inhaler'
  | 'Powder'
  | 'Gel'
  | 'Lotion'
  | 'Sachet'
  | 'Other'

export type PrescriptionStatus = 'draft' | 'finalized'
export type PaymentStatus = 'Unpaid' | 'Partially paid' | 'Paid' | 'Refunded' | 'Cancelled'
export type BillStatus = 'draft' | 'finalized' | 'cancelled'
export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Bank transfer' | 'Cheque' | 'Other'
export type BillItemType = 'Consultation' | 'Test' | 'Procedure' | 'Medicine' | 'Service' | 'Other'
export type TestStatus = 'Advised' | 'Scheduled' | 'Completed' | 'Cancelled' | 'Result received'
export type DiscountType = 'none' | 'flat' | 'percent'

export interface ClinicSettings {
  clinic_name: string
  clinic_address: string
  clinic_phone: string
  clinic_email: string
  doctor_name: string
  doctor_degrees: string
  doctor_registration: string
  doctor_specialization: string
  default_consultation_fee: number
  default_followup_fee: number
  currency: string
  tax_enabled: string
  tax_percent: number
  bill_prefix: string
  invoice_prefix: string
  /** digital = print clinic heading; paper = leave blank for pre-printed letterhead */
  print_letterhead_mode: 'digital' | 'paper'
  /** Blank space at top of page (mm) so content clears pre-printed heading */
  print_header_mm: number
  /** Blank space at bottom of page (mm) so content clears pre-printed footer */
  print_footer_mm: number
  /** Active print paper size: A4 | A5 | Letter | Legal */
  print_paper_size: 'A4' | 'A5' | 'Letter' | 'Legal'
  /** Bill invoice layout style */
  bill_print_layout: 'classic' | 'modern' | 'compact' | 'custom'
  /** Show item type column on printed bill */
  bill_print_show_item_type: string
  /** Show patient age / gender / mobile on bill */
  bill_print_show_patient_details: string
  /** Print bill notes when present */
  bill_print_show_notes: string
  /** Show doctor signature line on bill */
  bill_print_show_signature: string
  /** Show paid / outstanding summary on bill */
  bill_print_show_payment_summary: string
  /** Optional footer line on every bill (e.g. thank-you note) */
  bill_print_footer_note: string
  /** Custom template: document title (Invoice, Tax Invoice, Receipt, …) */
  bill_print_title: string
  /** Custom template: visual base style */
  bill_print_base_style: 'classic' | 'modern' | 'compact'
  /** Custom template: left party label */
  bill_print_bill_to_label: string
  /** Custom template: right party label */
  bill_print_details_label: string
  /** Show quantity column */
  bill_print_show_qty: string
  /** Show unit rate column */
  bill_print_show_rate: string
  /** Custom bill template file under bill-templates/ */
  bill_print_file_name: string
  bill_print_file_kind: 'pdf' | 'image' | 'word' | ''
  bill_print_original_name: string
}

export interface PrintTemplate {
  id: number
  name: string
  letterhead_mode: 'digital' | 'paper'
  header_mm: number
  footer_mm: number
  /** A4 | A5 | Letter | Legal */
  paper_size: 'A4' | 'A5' | 'Letter' | 'Legal'
  /** Relative filename under letterheads/ folder, or null */
  file_name: string | null
  /** pdf | image | word | null */
  file_kind: 'pdf' | 'image' | 'word' | null
  original_name: string | null
  is_active: number
  created_at: string
  updated_at: string
}

export interface Patient {
  id: number
  patient_code: string
  full_name: string
  gender: Gender | null
  date_of_birth: string | null
  age: number | null
  mobile: string | null
  alternate_mobile: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  pin_code: string | null
  emergency_contact_name: string | null
  emergency_contact_number: string | null
  emergency_contact_relation: string | null
  emergency_contact_address: string | null
  blood_group: string | null
  marital_status: MaritalStatus | string | null
  allergies: string | null
  medical_conditions: string | null
  current_medications: string | null
  notes: string | null
  is_archived: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PatientListItem extends Patient {
  last_visit_date: string | null
  total_visits: number
  outstanding_amount: number
}

export interface Visit {
  id: number
  visit_code: string
  patient_id: number
  visit_number: number
  visit_date: string
  visit_time: string | null
  visit_type: VisitType | string
  chief_complaints: string | null
  symptoms: string | null
  symptom_duration: string | null
  medical_history: string | null
  examination_findings: string | null
  provisional_diagnosis: string | null
  final_diagnosis: string | null
  doctor_notes: string | null
  advice: string | null
  follow_up_date: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface VisitVitals {
  id: number
  visit_id: number
  temperature: string | null
  pulse: string | null
  systolic_bp: string | null
  diastolic_bp: string | null
  respiratory_rate: string | null
  oxygen_saturation: string | null
  weight: string | null
  height: string | null
  bmi: string | null
  blood_sugar: string | null
}

export interface Medicine {
  id: number
  name: string
  normalized_name: string
  generic_name: string | null
  brand_name: string | null
  strength: string | null
  normalized_strength: string | null
  dosage_form: string | null
  manufacturer: string | null
  default_route: string | null
  default_dosage_instruction: string | null
  unique_medicine_key: string
  usage_count: number
  last_prescribed_at: string | null
  is_active: number
  created_at: string
  updated_at: string
}

export interface PrescriptionMedicineInput {
  medicineId?: number | null
  medicineName: string
  genericName?: string
  brandName?: string
  strength?: string
  dosageForm?: string
  dose?: string
  frequency?: string
  route?: string
  duration?: string
  timingInstruction?: string
  quantity?: string
  specialInstructions?: string
}

export interface Prescription {
  id: number
  prescription_code: string
  patient_id: number
  visit_id: number
  prescription_date: string
  diagnosis: string | null
  tests_advised: string | null
  advice: string | null
  follow_up_date: string | null
  notes: string | null
  status: PrescriptionStatus
  edit_count: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PrescriptionMedicine {
  id: number
  prescription_id: number
  medicine_id: number | null
  medicine_name_snapshot: string
  strength_snapshot: string | null
  dosage_form_snapshot: string | null
  dose: string | null
  frequency: string | null
  route: string | null
  duration: string | null
  timing_instruction: string | null
  quantity: string | null
  special_instructions: string | null
  sort_order: number
}

export interface TestItem {
  id: number
  name: string
  normalized_name: string
  category: string | null
  default_price: number
  description: string | null
  is_active: number
}

export interface ProcedureItem {
  id: number
  name: string
  normalized_name: string
  category: string | null
  default_price: number
  description: string | null
  is_active: number
}

export interface VisitTest {
  id: number
  visit_id: number
  test_id: number | null
  test_name_snapshot: string
  notes: string | null
  status: TestStatus
  result_summary: string | null
  result_date: string | null
  is_abnormal: number
  charge: number
  /** clinic = billed by clinic; outside = referred externally (not billed) */
  source: 'clinic' | 'outside'
  /** `YYYY-MM-DD HH:mm` when status is Scheduled (or later) */
  scheduled_at: string | null
  report_file_name: string | null
  report_original_name: string | null
  report_file_kind: 'pdf' | 'image' | 'word' | null
}

export interface TestListItem {
  id: number
  visit_id: number
  patient_id: number
  patient_name: string
  patient_code: string
  test_name: string
  category: string | null
  visit_date: string
  status: TestStatus
  result_summary: string | null
  result_date: string | null
  is_abnormal: number
  charge: number
  scheduled_at: string | null
  report_file_name: string | null
  report_original_name: string | null
  report_file_kind: 'pdf' | 'image' | 'word' | null
}

export interface VisitProcedure {
  id: number
  visit_id: number
  procedure_id: number | null
  procedure_name_snapshot: string
  notes: string | null
  quantity: number
  unit_price: number
  total: number
}

export interface BillItemInput {
  itemType: BillItemType
  itemReferenceId?: number | null
  itemName: string
  quantity: number
  unitPrice: number
  discount?: number
}

export interface Bill {
  id: number
  bill_number: string
  patient_id: number
  visit_id: number | null
  bill_date: string
  subtotal: number
  discount_type: DiscountType
  discount_value: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  outstanding_amount: number
  payment_status: PaymentStatus
  status: BillStatus
  notes: string | null
  created_at: string
  updated_at: string
  cancelled_at: string | null
}

export interface BillItem {
  id: number
  bill_id: number
  item_type: BillItemType
  item_reference_id: number | null
  item_name: string
  quantity: number
  unit_price: number
  discount: number
  total: number
}

export interface Payment {
  id: number
  payment_code: string
  bill_id: number
  patient_id: number
  payment_date: string
  amount: number
  payment_mode: PaymentMode
  reference_number: string | null
  notes: string | null
  created_at: string
  cancelled_at: string | null
}

/** Payment receipt / invoice generated when a payment is recorded against a bill */
export interface Invoice {
  id: number
  invoice_number: string
  bill_id: number
  payment_id: number
  invoice_date: string
  amount: number
  payment_mode: PaymentMode
  reference_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceListItem extends Invoice {
  bill_number: string
  patient_name: string
  patient_code: string
  payment_code: string
}

export interface VisitListItem extends Visit {
  patient_name: string
  patient_code: string
  patient_gender: Gender | null
  patient_age: number | null
  prescription_id: number | null
  prescription_status: PrescriptionStatus | null
  bill_id: number | null
  billed_amount: number
  bill_payment_status: PaymentStatus | null
}

export interface PrescriptionListItem extends Prescription {
  patient_name: string
  patient_code: string
  medicine_count: number
}

export interface BillListItem extends Bill {
  patient_name: string
  patient_code: string
}

export interface PaymentListItem extends Payment {
  patient_name: string
  patient_code: string
  bill_number: string
}

export interface DashboardData {
  totalPatients: number
  patientsThisMonth: number
  visitsToday: number
  visitsThisWeek: number
  visitsThisMonth: number
  collectionsToday: number
  pendingPayments: number
  pendingPrescriptions: number
  totalMedicines: number
  todaysVisits: VisitListItem[]
  recentVisits: Array<Visit & { patient_name: string; patient_code: string }>
  recentPatients: Array<{
    id: number
    full_name: string
    patient_code: string
    age: number | null
    gender: Gender | null
    created_at: string
  }>
  upcomingFollowUps: Array<Visit & { patient_name: string; patient_code: string }>
  topMedicines: Array<{ name: string; count: number }>
  /** Mon–Sun of the current calendar week */
  weeklyTrend: Array<{ date: string; count: number }>
  /** Mon–Sun of the previous calendar week */
  lastWeekTrend: Array<{ date: string; count: number }>
  visitsLastWeek: number
}

export interface PatientDashboard {
  patient: Patient
  totalVisits: number
  totalBilled: number
  totalPaid: number
  outstanding: number
  visits: Visit[]
  prescriptions: Prescription[]
  bills: Bill[]
  payments: Payment[]
  latestVisit: Visit | null
  nextFollowUp: string | null
}

export interface ReportSummary {
  from: string
  to: string
  totals: {
    totalPatients: number
    totalVisits: number
    totalRevenue: number
    pendingPayments: number
    totalPrescriptions: number
    newPatients: number
  }
  collections: Array<{ date: string; amount: number }>
  visitsByDay: Array<{ date: string; count: number }>
  topDiagnoses: Array<{ name: string; count: number }>
  paymentStatus: { paid: number; pending: number }
  paymentMethods: Array<{ mode: string; amount: number; count: number }>
  outstandingBills: Array<Bill & { patient_name: string; patient_code: string }>
  medicineUsage: Array<{ name: string; count: number }>
  patientGrowth: Array<{ month: string; count: number }>
}

export type ReportExportKind = 'patients' | 'visits' | 'prescriptions' | 'bills' | 'payments' | 'tests'
