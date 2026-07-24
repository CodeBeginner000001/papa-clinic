import Database from 'better-sqlite3'
import { getAppPaths, appendLog } from '../paths'

let db: Database.Database | null = null

const MIGRATION_001 = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth TEXT,
  age INTEGER,
  mobile TEXT,
  alternate_mobile TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pin_code TEXT,
  emergency_contact_name TEXT,
  emergency_contact_number TEXT,
  emergency_contact_relation TEXT,
  emergency_contact_address TEXT,
  blood_group TEXT,
  marital_status TEXT,
  allergies TEXT,
  medical_conditions TEXT,
  current_medications TEXT,
  notes TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_code TEXT NOT NULL UNIQUE,
  patient_id INTEGER NOT NULL,
  visit_number INTEGER NOT NULL,
  visit_date TEXT NOT NULL,
  visit_time TEXT,
  visit_type TEXT NOT NULL DEFAULT 'New consultation',
  chief_complaints TEXT,
  symptoms TEXT,
  symptom_duration TEXT,
  medical_history TEXT,
  examination_findings TEXT,
  provisional_diagnosis TEXT,
  final_diagnosis TEXT,
  doctor_notes TEXT,
  advice TEXT,
  follow_up_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS visit_vitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id INTEGER NOT NULL UNIQUE,
  temperature TEXT,
  pulse TEXT,
  systolic_bp TEXT,
  diastolic_bp TEXT,
  respiratory_rate TEXT,
  oxygen_saturation TEXT,
  weight TEXT,
  height TEXT,
  bmi TEXT,
  blood_sugar TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medicines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  generic_name TEXT,
  brand_name TEXT,
  strength TEXT,
  normalized_strength TEXT,
  dosage_form TEXT,
  manufacturer TEXT,
  default_route TEXT,
  default_dosage_instruction TEXT,
  unique_medicine_key TEXT NOT NULL UNIQUE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_prescribed_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_code TEXT NOT NULL UNIQUE,
  patient_id INTEGER NOT NULL,
  visit_id INTEGER NOT NULL UNIQUE,
  prescription_date TEXT NOT NULL,
  diagnosis TEXT,
  tests_advised TEXT,
  advice TEXT,
  follow_up_date TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (visit_id) REFERENCES visits(id)
);

CREATE TABLE IF NOT EXISTS prescription_medicines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_id INTEGER NOT NULL,
  medicine_id INTEGER,
  medicine_name_snapshot TEXT NOT NULL,
  strength_snapshot TEXT,
  dosage_form_snapshot TEXT,
  dose TEXT,
  frequency TEXT,
  route TEXT,
  duration TEXT,
  timing_instruction TEXT,
  quantity TEXT,
  special_instructions TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id)
);

CREATE TABLE IF NOT EXISTS tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  category TEXT,
  default_price REAL NOT NULL DEFAULT 0,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS procedures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  category TEXT,
  default_price REAL NOT NULL DEFAULT 0,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visit_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id INTEGER NOT NULL,
  test_id INTEGER,
  test_name_snapshot TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Advised',
  result_summary TEXT,
  result_date TEXT,
  is_abnormal INTEGER NOT NULL DEFAULT 0,
  charge REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'clinic',
  scheduled_at TEXT,
  report_file_name TEXT,
  report_original_name TEXT,
  report_file_kind TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
  FOREIGN KEY (test_id) REFERENCES tests(id)
);

CREATE TABLE IF NOT EXISTS visit_procedures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id INTEGER NOT NULL,
  procedure_id INTEGER,
  procedure_name_snapshot TEXT NOT NULL,
  notes TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
  FOREIGN KEY (procedure_id) REFERENCES procedures(id)
);

CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_number TEXT NOT NULL UNIQUE,
  patient_id INTEGER NOT NULL,
  visit_id INTEGER,
  bill_date TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'none',
  discount_value REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  amount_paid REAL NOT NULL DEFAULT 0,
  outstanding_amount REAL NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'Unpaid',
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  cancelled_at TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (visit_id) REFERENCES visits(id)
);

CREATE TABLE IF NOT EXISTS bill_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL,
  item_type TEXT NOT NULL,
  item_reference_id INTEGER,
  item_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_code TEXT NOT NULL UNIQUE,
  bill_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  payment_date TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  reference_number TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  cancelled_at TEXT,
  FOREIGN KEY (bill_id) REFERENCES bills(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  bill_id INTEGER NOT NULL,
  payment_id INTEGER NOT NULL UNIQUE,
  invoice_date TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  reference_number TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS symptoms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_symptoms_norm ON symptoms(normalized_name);

CREATE TABLE IF NOT EXISTS custom_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(category, normalized_name)
);
CREATE INDEX IF NOT EXISTS idx_custom_options_cat ON custom_options(category);

CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_medicines_norm ON medicines(normalized_name);
CREATE INDEX IF NOT EXISTS idx_medicines_key ON medicines(unique_medicine_key);
CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_bill ON invoices(bill_id);
`

const DEFAULT_SETTINGS: Record<string, string> = {
  clinic_name: 'AK Heart & Diabetics Care Center',
  clinic_address: '',
  clinic_phone: '',
  clinic_email: '',
  doctor_name: 'Dr. Alok Kumar',
  doctor_degrees: 'MBBS, MD (Medicine)',
  doctor_registration: '',
  doctor_specialization: 'Consultant Physician',
  default_consultation_fee: '500',
  default_followup_fee: '300',
  currency: 'INR',
  tax_enabled: '0',
  tax_percent: '0',
  bill_prefix: 'BILL',
  invoice_prefix: 'INV',
  print_letterhead_mode: 'digital',
  print_header_mm: '0',
  print_footer_mm: '0',
  print_paper_size: 'A4',
  bill_print_layout: 'classic',
  bill_print_show_item_type: '1',
  bill_print_show_patient_details: '1',
  bill_print_show_notes: '1',
  bill_print_show_signature: '1',
  bill_print_show_payment_summary: '1',
  bill_print_footer_note: 'Thank you for choosing our clinic. Get well soon.',
  bill_print_title: 'Invoice',
  bill_print_base_style: 'classic',
  bill_print_bill_to_label: 'Bill to',
  bill_print_details_label: 'Invoice details',
  bill_print_show_qty: '1',
  bill_print_show_rate: '1',
  bill_print_file_name: '',
  bill_print_file_kind: '',
  bill_print_original_name: '',
}

const DEFAULT_TESTS = [
  ['Complete Blood Count', 'Lab', 400],
  ['Blood Sugar', 'Lab', 100],
  ['Thyroid Profile', 'Lab', 600],
  ['ECG', 'Cardiac', 350],
  ['X-Ray', 'Imaging', 500],
  ['Ultrasound', 'Imaging', 800],
] as const

const DEFAULT_SYMPTOMS = [
  'Fever',
  'Headache',
  'Cough',
  'Cold',
  'Sore throat',
  'Body ache',
  'Fatigue',
  'Nausea',
  'Vomiting',
  'Diarrhea',
  'Dizziness',
  'Chest pain',
  'Breathlessness',
  'Palpitations',
  'Loss of appetite',
] as const

const DEFAULT_OPTIONS: Record<string, readonly string[]> = {
  dosage_form: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drops', 'Cream', 'Ointment', 'Inhaler', 'Powder', 'Gel', 'Lotion', 'Sachet'],
  frequency: [
    'OD (Once daily)',
    'BD (Twice daily)',
    'TID (Thrice daily)',
    'QID (Four times)',
    'OD (Morning)',
    'OD (Night)',
    'SOS (As needed)',
    'Weekly',
  ],
  timing: ['After meals', 'Before meals', 'With meals', 'At bedtime', 'Empty stomach'],
}

const DEFAULT_PROCEDURES = [
  ['Consultation', 'Consult', 500],
  ['Follow-up Consultation', 'Consult', 300],
  ['Dressing', 'Procedure', 200],
  ['Injection administration', 'Procedure', 100],
  ['Nebulization', 'Procedure', 250],
] as const

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function initDatabase(): void {
  const paths = getAppPaths()
  db = new Database(paths.db)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(MIGRATION_001)

  const applied = db.prepare(`SELECT name FROM schema_migrations WHERE name = ?`).get('001_init')
  if (!applied) {
    db.prepare(`INSERT INTO schema_migrations (name) VALUES (?)`).run('001_init')
    appendLog('Applied migration 001_init')
  }

  // 002: is_abnormal flag on visit_tests (no-op on fresh databases)
  const applied002 = db.prepare(`SELECT name FROM schema_migrations WHERE name = ?`).get('002_test_abnormal')
  if (!applied002) {
    try {
      db.exec(`ALTER TABLE visit_tests ADD COLUMN is_abnormal INTEGER NOT NULL DEFAULT 0`)
    } catch {
      // column already exists (fresh install)
    }
    db.prepare(`INSERT INTO schema_migrations (name) VALUES (?)`).run('002_test_abnormal')
    appendLog('Applied migration 002_test_abnormal')
  }

  // 003: marital status + current medications on patients
  const applied003 = db.prepare(`SELECT name FROM schema_migrations WHERE name = ?`).get('003_patient_fields')
  if (!applied003) {
    try {
      db.exec(`ALTER TABLE patients ADD COLUMN marital_status TEXT`)
    } catch {
      // column already exists (fresh install)
    }
    try {
      db.exec(`ALTER TABLE patients ADD COLUMN current_medications TEXT`)
    } catch {
      // column already exists (fresh install)
    }
    db.prepare(`INSERT INTO schema_migrations (name) VALUES (?)`).run('003_patient_fields')
    appendLog('Applied migration 003_patient_fields')
  }

  // 004: emergency contact relation + address
  const applied004 = db.prepare(`SELECT name FROM schema_migrations WHERE name = ?`).get('004_emergency_contact_extra')
  if (!applied004) {
    try {
      db.exec(`ALTER TABLE patients ADD COLUMN emergency_contact_relation TEXT`)
    } catch {
      // column already exists (fresh install)
    }
    try {
      db.exec(`ALTER TABLE patients ADD COLUMN emergency_contact_address TEXT`)
    } catch {
      // column already exists (fresh install)
    }
    db.prepare(`INSERT INTO schema_migrations (name) VALUES (?)`).run('004_emergency_contact_extra')
    appendLog('Applied migration 004_emergency_contact_extra')
  }

  // 005: print / letterhead templates
  const applied005 = db.prepare(`SELECT name FROM schema_migrations WHERE name = ?`).get('005_print_templates')
  if (!applied005) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS print_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        letterhead_mode TEXT NOT NULL DEFAULT 'digital',
        header_mm REAL NOT NULL DEFAULT 0,
        footer_mm REAL NOT NULL DEFAULT 0,
        file_name TEXT,
        file_kind TEXT,
        original_name TEXT,
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
    db.prepare(`INSERT INTO schema_migrations (name) VALUES (?)`).run('005_print_templates')
    appendLog('Applied migration 005_print_templates')
  }

  // 006: paper size on print templates
  const applied006 = db.prepare(`SELECT name FROM schema_migrations WHERE name = ?`).get('006_print_paper_size')
  if (!applied006) {
    try {
      db.exec(`ALTER TABLE print_templates ADD COLUMN paper_size TEXT NOT NULL DEFAULT 'A4'`)
    } catch {
      // column already exists
    }
    db.prepare(`INSERT INTO schema_migrations (name) VALUES (?)`).run('006_print_paper_size')
    appendLog('Applied migration 006_print_paper_size')
  }

  const applied007 = db.prepare(`SELECT name FROM schema_migrations WHERE name = ?`).get('007_invoices')
  if (!applied007) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL UNIQUE,
        bill_id INTEGER NOT NULL,
        payment_id INTEGER NOT NULL UNIQUE,
        invoice_date TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_mode TEXT NOT NULL DEFAULT 'Cash',
        reference_number TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_invoices_bill ON invoices(bill_id);
    `)
    db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('invoice_prefix', 'INV')`).run()
    const prefixRow = db.prepare(`SELECT value FROM settings WHERE key='invoice_prefix'`).get() as
      | { value: string }
      | undefined
    const invPrefix = prefixRow?.value || 'INV'
    const orphanPayments = db
      .prepare(
        `SELECT * FROM payments
         WHERE cancelled_at IS NULL
           AND id NOT IN (SELECT payment_id FROM invoices)`,
      )
      .all() as Array<{
      id: number
      bill_id: number
      payment_date: string
      amount: number
      payment_mode: string
      reference_number: string | null
      notes: string | null
    }>
    const insertInv = db.prepare(
      `INSERT INTO invoices (invoice_number, bill_id, payment_id, invoice_date, amount, payment_mode, reference_number, notes)
       VALUES (?,?,?,?,?,?,?,?)`,
    )
    for (const pay of orphanPayments) {
      insertInv.run(
        nextCode(invPrefix),
        pay.bill_id,
        pay.id,
        pay.payment_date,
        pay.amount,
        pay.payment_mode,
        pay.reference_number,
        pay.notes,
      )
    }
    db.prepare(`INSERT INTO schema_migrations (name) VALUES (?)`).run('007_invoices')
    appendLog('Applied migration 007_invoices')
  }

  const applied008 = db.prepare(`SELECT name FROM schema_migrations WHERE name = ?`).get('008_test_source')
  if (!applied008) {
    try {
      db.exec(`ALTER TABLE visit_tests ADD COLUMN source TEXT NOT NULL DEFAULT 'clinic'`)
    } catch {
      // column already exists
    }
    db.prepare(`INSERT INTO schema_migrations (name) VALUES (?)`).run('008_test_source')
    appendLog('Applied migration 008_test_source')
  }

  const applied009 = db.prepare(`SELECT name FROM schema_migrations WHERE name = ?`).get('009_test_schedule_report')
  if (!applied009) {
    for (const sql of [
      `ALTER TABLE visit_tests ADD COLUMN scheduled_at TEXT`,
      `ALTER TABLE visit_tests ADD COLUMN report_file_name TEXT`,
      `ALTER TABLE visit_tests ADD COLUMN report_original_name TEXT`,
      `ALTER TABLE visit_tests ADD COLUMN report_file_kind TEXT`,
    ]) {
      try {
        db.exec(sql)
      } catch {
        // column already exists
      }
    }
    db.prepare(`INSERT INTO schema_migrations (name) VALUES (?)`).run('009_test_schedule_report')
    appendLog('Applied migration 009_test_schedule_report')
  }

  const insertSetting = db.prepare(
    `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
  )
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    insertSetting.run(key, value)
  }

  const testCount = db.prepare(`SELECT COUNT(*) AS c FROM tests`).get() as { c: number }
  if (testCount.c === 0) {
    const stmt = db.prepare(
      `INSERT INTO tests (name, normalized_name, category, default_price) VALUES (?, lower(?), ?, ?)`,
    )
    for (const [name, category, price] of DEFAULT_TESTS) {
      stmt.run(name, name, category, price)
    }
  }

  const symptomCount = db.prepare(`SELECT COUNT(*) AS c FROM symptoms`).get() as { c: number }
  if (symptomCount.c === 0) {
    const stmt = db.prepare(`INSERT INTO symptoms (name, normalized_name) VALUES (?, lower(?))`)
    for (const name of DEFAULT_SYMPTOMS) {
      stmt.run(name, name)
    }
  }

  const optionStmt = db.prepare(
    `INSERT OR IGNORE INTO custom_options (category, name, normalized_name) VALUES (?, ?, lower(?))`,
  )
  for (const [category, names] of Object.entries(DEFAULT_OPTIONS)) {
    const count = db
      .prepare(`SELECT COUNT(*) AS c FROM custom_options WHERE category = ?`)
      .get(category) as { c: number }
    if (count.c === 0) {
      for (const name of names) optionStmt.run(category, name, name)
    }
  }

  const procCount = db.prepare(`SELECT COUNT(*) AS c FROM procedures`).get() as { c: number }
  if (procCount.c === 0) {
    const stmt = db.prepare(
      `INSERT INTO procedures (name, normalized_name, category, default_price) VALUES (?, lower(?), ?, ?)`,
    )
    for (const [name, category, price] of DEFAULT_PROCEDURES) {
      stmt.run(name, name, category, price)
    }
  }

  appendLog(`Database ready at ${paths.db}`)
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function nextCode(prefix: string): string {
  const year = new Date().getFullYear()
  const key = `${prefix}-${year}`
  const row = getDb().prepare(`SELECT value FROM counters WHERE name = ?`).get(key) as
    | { value: number }
    | undefined
  const next = (row?.value ?? 0) + 1
  getDb()
    .prepare(
      `INSERT INTO counters (name, year, value) VALUES (?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET value = excluded.value, year = excluded.year`,
    )
    .run(key, year, next)
  return `${prefix}-${year}-${String(next).padStart(6, '0')}`
}
