# Frontend ↔ Backend ↔ Database

How data moves between the React UI, Electron main process, and local SQLite storage in **AK Heart & Diabetics Care Center**.

---

## Mental model

This app is **not** a classic web API. There is no HTTP server and no cloud database.

```
┌─────────────────────────────────────────────────────────────┐
│  Renderer (React UI)                                        │
│  pages → api.listPatients() → window.clinic.invoke(...)     │
└────────────────────────────┬────────────────────────────────┘
                             │ contextBridge (preload)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Main process (Node + Electron)                             │
│  ipcMain.handle → repos / pdf / backup / files              │
└────────────────────────────┬────────────────────────────────┘
                             │ better-sqlite3 + fs
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Local data folder                                          │
│  clinic.db · PDFs · backups · letterheads · test-reports    │
└─────────────────────────────────────────────────────────────┘
```

The UI is sandboxed: **no Node**, **no direct SQLite**. The only bridge is `window.clinic`.

---

## Security boundary (preload)

File: `electron/preload.ts`

```ts
contextBridge.exposeInMainWorld('clinic', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => { /* subscribe + unsubscribe */ },
})
```

| API | Direction | Use |
|-----|-----------|-----|
| `clinic.invoke(channel, …args)` | UI → main → UI | Request/response (CRUD, print, backup) |
| `clinic.on(channel, cb)` | main → UI | Push events (e.g. splash progress) |

Browser window options (`electron/main.ts`):

- `contextIsolation: true`  
- `nodeIntegration: false`  
- `sandbox: false` (needed for native modules / preload interop)  

---

## How every request runs

### 1. Page calls a typed helper

```ts
const rows = await api.listPatients(query)
```

### 2. Helper maps to an IPC channel (`src/lib/api.ts`)

```ts
listPatients: (query = '') => invoke('patients:list', query)
```

### 3. Main process handles the channel (`electron/ipc.ts`)

```ts
handle('patients:list', (query) => repos.listPatients(query))
```

Errors are logged to `logs/app.log` and rethrown to the UI.

### 4. Repository / file module runs

- **Read** → `SELECT` / `get` / `all`, or read a file from disk  
- **Write** → `INSERT` / `UPDATE` / `DELETE` / `run`, or copy/delete files  

### 5. Result returns to React

JSON-serializable data resolves on the Promise; the page updates state or shows a toast.

**Legend used below**

| Tag | Meaning |
|-----|---------|
| **R** | Read only |
| **W** | Write (insert / update / delete) |
| **R+W** | Reads then writes (or writes then reads for return) |
| **File** | Touches files on disk (not only SQLite) |

---

## Every request — read & write handling

### Settings

| `api.*` | Channel | Mode | What it reads | What it writes | Returns |
|---------|---------|------|---------------|----------------|---------|
| `getSettings` | `settings:get` | **R** | `settings` key/value table | — | `ClinicSettings` object |
| `saveSettings` | `settings:save` | **W** | — | Upserts each key in `settings` | Saved settings |

---

### Print templates & stationery

| `api.*` | Channel | Mode | What it reads | What it writes | Returns |
|---------|---------|------|---------------|----------------|---------|
| `listPrintTemplates` | `templates:list` | **R** | `print_templates` | — | Template list |
| `getPrintTemplate` | `templates:get` | **R** | One `print_templates` row | — | Template or null |
| `getActivePrintTemplate` | `templates:active` | **R** | Active template row | — | Template or null |
| `savePrintTemplate` | `templates:save` | **R+W** + **File** | Existing template (if update) | Insert/update `print_templates`; may delete orphan letterhead file under `letterheads/` | Saved template |
| `setActivePrintTemplate` | `templates:setActive` | **W** | — | Clears other actives; sets `is_active` on chosen id | Updated active |
| `deletePrintTemplate` | `templates:delete` | **W** + **File** | Template file name | Deletes DB row; removes letterhead file if unused | `true` |
| `pickLetterheadFile` | `templates:pickFile` | **File** | OS file dialog | Copies chosen file into `letterheads/` | `{ fileName, fileKind, originalName, preview }` or null |
| `letterheadPreview` | `templates:preview` | **R** + **File** | File bytes from `letterheads/` | — | Data-URL preview or null |
| `pickBillTemplateFile` | `templates:pickBillFile` | **File** | OS file dialog | Copies into `bill-templates/` | Same shape as letterhead pick |
| `billTemplatePreview` | `templates:billPreview` | **R** + **File** | File under `bill-templates/` | — | Preview data-URL |
| `clearBillTemplateFile` | `templates:clearBillFile` | **File** | — | Deletes bill stationery file if provided | `true` |

---

### Dashboard, reports, search

| `api.*` | Channel | Mode | What it reads | What it writes | Returns |
|---------|---------|------|---------------|----------------|---------|
| `getDashboard` | `dashboard:get` | **R** | Aggregates over patients, visits, bills, tests for today / recent | — | Dashboard stats + lists |
| `getReports` | `reports:get` | **R** | Date-filtered counts and sums across domain tables | — | `ReportSummary` |
| `exportReport` | `reports:export` | **R** + **File** | Rows for kind (`patients` \| `visits` \| …) in date range | Writes `.xlsx` under `exports/` | File path |
| `globalSearch` | `search:global` | **R** | Patients, visits, bills matching query | — | Grouped search hits |

---

### Patients

| `api.*` | Channel | Mode | What it reads | What it writes | Returns |
|---------|---------|------|---------------|----------------|---------|
| `listPatients` | `patients:list` | **R** | `patients` (+ search filters); skips archived unless searched | — | `PatientListItem[]` |
| `getPatient` | `patients:get` | **R** | One `patients` row | — | `Patient` or null |
| `findDuplicates` | `patients:duplicates` | **R** | Similar name / mobile / etc. | — | Possible duplicate patients |
| `createPatient` | `patients:create` | **R+W** | Counter for next `patient_code` | `INSERT patients`; bump counter | New `Patient` |
| `updatePatient` | `patients:update` | **W** | — | `UPDATE patients` fields | Updated `Patient` |
| `archivePatient` | `patients:archive` | **W** | — | Soft-archive (`archived_at` / flag) | Result |
| `patientDashboard` | `patients:dashboard` | **R** | Patient + visits, bills, payments, Rx summary | — | `PatientDashboard` |

---

### Visits & vitals

| `api.*` | Channel | Mode | What it reads | What it writes | Returns |
|---------|---------|------|---------------|----------------|---------|
| `listVisits` | `visits:list` | **R** | `visits` joined with patients / bill summary | — | `VisitListItem[]` |
| `getVisit` | `visits:get` | **R** | One `visits` row (not soft-deleted) | — | `Visit` or null |
| `createVisit` | `visits:create` | **R+W** | Next `visit_code`; patient exists | `INSERT visits`; upsert `visit_vitals` if provided | New `Visit` |
| `updateVisit` | `visits:update` | **W** | — | `UPDATE visits` + vitals row | Updated `Visit` |
| `deleteVisit` | `visits:delete` | **W** | — | Soft-delete (`deleted_at`) | Result |
| `getVitals` | `visits:vitals` | **R** | `visit_vitals` for visit | — | `VisitVitals` or null |
| `printVisit` | `visits:print` | **R** | Visit, patient, vitals, settings/templates | Opens print preview (no DB write); optional PDF later via preview | `true` |

---

### Visit tests & procedures

| `api.*` | Channel | Mode | What it reads | What it writes | Returns |
|---------|---------|------|---------------|----------------|---------|
| `getVisitTests` | `visits:getTests` | **R** | `visit_tests` for visit | — | `VisitTest[]` |
| `setVisitTests` | `visits:setTests` | **R+W** + **File** | Existing tests; bills for sync | Upsert **Advised** rows only; insert new as Advised; delete removed Advised; never delete locked statuses; delete orphan report files; then **billing sync** (see below) | `{ tests, sync, billing }` |
| `getVisitProcedures` | `visits:getProcedures` | **R** | `visit_procedures` | — | `VisitProcedure[]` |
| `setVisitProcedures` | `visits:setProcedures` | **W** | — | Replace procedure rows for visit | `VisitProcedure[]` |
| `getVisitLeftoverBillItems` | `visits:leftoverBillItems` | **R** | Unbilled clinic tests + procedures + consultation if needed | — | `BillItemInput[]` for “Generate Bill” |
| `getVisitBillingSummary` | `visits:billingSummary` | **R** | All non-cancelled bills, items, invoices for visit | — | Totals + line items + bills |

**Billing side-effects after `setVisitTests` / test status cancel** (`applyVisitTestBilling`):

1. **Read** visit bills + items + billable clinic tests (status ≠ Cancelled, source ≠ outside).  
2. **Write** — drop Test lines for cancelled/removed tests; rewrite totals; cancel excess payments + delete their invoices; cancel empty bills.  
3. **Write** — `ensureClinicTestBill`: create/append finalized bill lines for still-unbilled clinic tests.

---

### Test workflow (status machine)

| `api.*` | Channel | Mode | What it reads | What it writes | Returns |
|---------|---------|------|---------------|----------------|---------|
| `listAllTests` | `tests:listAll` | **R** | All `visit_tests` + patient/visit/catalog | — | `TestListItem[]` |
| `updateTestResult` | `tests:updateResult` | **W** | Existing row (for defaults) | Updates `result_summary`, `result_date`, `is_abnormal`, optional status | Updated `VisitTest` |
| `scheduleTest` | `tests:schedule` | **W** | Status must be Advised or Scheduled | Sets `status=Scheduled`, `scheduled_at` | Updated `VisitTest` |
| `setTestWorkflowStatus` | `tests:setWorkflowStatus` | **R+W** | Current status (gates Complete/Cancel) | Sets `Completed` or `Cancelled`; then **billing sync** | `{ test, sync, billing }` |
| `uploadTestReport` | `tests:uploadReport` | **R+W** + **File** | Test must be Completed or Result received | OS pick → copy to `test-reports/`; update report columns; set `status=Result received`; delete previous report file | Updated test or `null` if cancelled dialog |
| `openTestReport` | `tests:openReport` | **R** + **File** | `report_file_name` | Opens file with OS (`shell.openPath`) — no DB write | `true` |

Catalog masters (price list):

| `api.*` | Channel | Mode | What it reads | What it writes | Returns |
|---------|---------|------|---------------|----------------|---------|
| `listTests` | `tests:list` | **R** | `tests` catalog | — | `TestItem[]` |
| `upsertTest` | `tests:upsert` | **W** | — | Insert or update catalog `tests` | `TestItem` |
| `listProcedures` | `procedures:list` | **R** | `procedures` | — | `ProcedureItem[]` |
| `upsertProcedure` | `procedures:upsert` | **W** | — | Insert or update `procedures` | `ProcedureItem` |

---

### Symptoms & Rx options

| `api.*` | Channel | Mode | What it reads | What it writes | Returns |
|---------|---------|------|---------------|----------------|---------|
| `searchSymptoms` | `symptoms:search` | **R** | `symptoms` | — | Name matches |
| `listOptions` | `options:list` | **R** | `custom_options` by category | — | Options list |
| `addOption` | `options:add` | **W** | — | Insert option | Created row |
| `updateOption` | `options:update` | **W** | — | Rename option | Updated row |
| `deleteOption` | `options:delete` | **W** | — | Delete option | Result |

---

### Medicines

| `api.*` | Channel | Mode | What it reads | What it writes | Returns |
|---------|---------|------|---------------|----------------|---------|
| `searchMedicines` | `medicines:search` | **R** | Active medicines by query | — | Short list for autocomplete |
| `listMedicines` | `medicines:list` | **R** | Medicines catalog | — | Full/filtered list |
| `createMedicine` | `medicines:create` | **R+W** | Existing by unique key | Insert if missing (get-or-create) | `Medicine` |
| `updateMedicine` | `medicines:update` | **W** | — | Update catalog fields | `Medicine` |
| `deactivateMedicine` | `medicines:deactivate` | **W** | — | Soft-deactivate (`is_active=0`) | Result |

---

### Prescriptions

| `api.*` | Channel | Mode | What it reads | What it writes | Returns |
|---------|---------|------|---------------|----------------|---------|
| `listPrescriptions` | `prescriptions:list` | **R** | Prescriptions + patient/visit | — | List rows |
| `getPrescriptionByVisit` | `prescriptions:getByVisit` | **R** | Rx for visit + `prescription_medicines` | — | Rx with medicines or null |
| `savePrescription` | `prescriptions:save` | **R+W** | Existing Rx if updating | Upsert `prescriptions`; replace medicine lines (snapshots) | Rx + medicines |
| `printPrescription` | `prescriptions:print` | **R** | Rx, meds, patient, visit, active letterhead | Print dialog (no DB write) | `true` |
| `pdfPrescription` | `prescriptions:pdf` | **R** + **File** | Same as print | Writes PDF under `prescriptions/` | File path |

---

### Bills, payments, invoices

| `api.*` | Channel | Mode | What it reads | What it writes | Returns |
|---------|---------|------|---------------|----------------|---------|
| `listBills` | `bills:list` | **R** | Bills + patient | — | `BillListItem[]` |
| `listBillsForVisit` | `bills:getByVisit` | **R** | Non-cancelled bills for visit | — | `Bill[]` |
| `getBill` | `bills:get` | **R** | Bill + `bill_items` | — | Bill with `items` or null |
| `saveBill` | `bills:save` | **R+W** | Existing bill if edit; settings for tax | Insert/update `bills`; replace `bill_items`; recalc totals / payment fields | Bill with `items` |
| `cancelBill` | `bills:cancel` | **W** | — | Marks bill cancelled | Result |
| `recordPayment` | `bills:pay` | **R+W** | Bill outstanding; next invoice code | Insert `payments`; insert `invoices`; refresh bill `amount_paid` / `outstanding` / `payment_status` | Payment (+ invoice linkage) |
| `listPayments` | `payments:list` | **R** | Payments + bill/patient | — | Payment list |
| `listInvoicesForBill` | `invoices:listByBill` | **R** | `invoices` for bill | — | `Invoice[]` |
| `getInvoice` | `invoices:get` | **R** | One invoice | — | `Invoice` or null |
| `printBill` / `pdfBill` | `bills:print` / `bills:pdf` | **R** (+ **File** for PDF) | Bill, items, patient, templates | Print UI or write PDF under `bills/` | `true` / path |
| `printInvoice` / `pdfInvoice` | `invoices:print` / `invoices:pdf` | **R** (+ **File** for PDF) | Invoice, payment, bill, patient | Print UI or write PDF under `bills/` | `true` / path |

---

### Backup & app utilities

| `api.*` | Channel | Mode | What it reads | What it writes | Returns |
|---------|---------|------|---------------|----------------|---------|
| `createBackup` | `backup:create` | **R** + **File** | Live `clinic.db` (+ optional folders) | Copies into `backups/` (WAL checkpoint first) | Backup path |
| `restoreBackup` | `backup:restore` | **R+W** + **File** | Chosen backup file | Safety copy of current DB; replace `clinic.db`; re-init schema | Success |
| `getPaths` | `app:paths` | **R** | Resolved data directories | Ensures dirs exist | `AppPaths` |
| `openPath` | `app:openPath` | — | — | Reveals path in OS file manager | — |
| `getAppInfo` | `app:info` | **R** | App version / packaged flag | — | Info object |
| `changeDataDir` | `app:changeDataDir` | **W** + **File** | Folder dialog | Updates `config.json` `dataDir`; relaunches app | Result |

---

### First-run setup (main window only)

| Channel | Mode | What it reads | What it writes | Returns |
|---------|------|---------------|----------------|---------|
| `setup:browse` | **R** | OS folder dialog | — | Chosen directory or null |
| `setup:confirm` | **W** | — | Saves `dataDir` in `config.json`; resolves setup promise | — |

### Print preview window (internal)

| Channel | Mode | What it reads | What it writes |
|---------|------|---------------|----------------|
| `preview:print` | — | — | Triggers system print on preview window |
| `preview:pdf` | **File** | HTML in preview | Saves PDF to suggested path under data dirs |

### Push (main → UI)

| Channel | Direction | Data |
|---------|-----------|------|
| `splash:progress` | main → splash UI | `{ percent, label }` while DB/init runs |

---

## Worked examples

### A. List patients (pure read)

```
PatientsPage
  → api.listPatients(q)
  → patients:list
  → SELECT from patients
  → rows[] → setState
```

### B. Create patient (read counter + write row)

```
PatientFormPage
  → api.createPatient(payload)
  → READ counters → WRITE patients + bump counter
  → new Patient → navigate to detail
```

### C. Save visit tests + billing (multi-write)

```
TestsModal save
  → visits:setTests
  → WRITE visit_tests (Advised only editable)
  → READ bills/items
  → WRITE drop cancelled test lines / adjust payments
  → WRITE ensure clinic test bill lines
  → { tests, sync, billing } → toast / open Collect Payment
```

### D. Collect payment (bill + payment + invoice)

```
PaymentModal
  → bills:pay
  → READ bill outstanding
  → WRITE payments + invoices
  → WRITE bills payment_status / amounts
  → UI reloads bill view
```

### E. Upload lab report (file + status)

```
Upload Report
  → tests:uploadReport
  → READ status gate
  → FILE copy → test-reports/
  → WRITE visit_tests report_* + status=Result received
  → View → tests:openReport opens file (read file only)
```

---

## Database & files

### Data folder

```
{dataDir}/
├── clinic.db
├── backups/
├── prescriptions/
├── bills/
├── exports/
├── letterheads/
├── bill-templates/
├── test-reports/
└── logs/app.log
```

Configured in Electron `userData/config.json` → `{ dataDir }`.

### Engine

- **better-sqlite3**, WAL, foreign keys  
- Schema/migrations: `electron/db/database.ts`  
- Domain R/W: `electron/db/repos.ts`  
- Shared shapes: `shared/types.ts`  

### Migrations (applied once each)

`001_init` → `009_test_schedule_report` (abnormal flag, patient fields, print templates, invoices, test source, schedule/report columns).

---

## Error handling

| Layer | Behavior |
|-------|----------|
| Repository | `throw new Error('…')` |
| IPC `handle` | Log + rethrow message |
| `api.invoke` | Promise rejects |
| Page | `toast(err.message, 'error')` |

---

## What the UI must not do

- Import `better-sqlite3`, `fs`, or `electron` in renderer code  
- Build SQL in the browser  
- Call raw channel strings outside `api.ts`  

---

## Debugging

1. Reproduce the UI action.  
2. Check `{dataDir}/logs/app.log` for `IPC … failed`.  
3. Confirm the channel in `electron/ipc.ts`.  
4. Inspect `clinic.db` for the expected row.  
5. Restart Electron after main-process changes.  

---

## Quick diagram

```
UI event
  └─ api.method()
       └─ window.clinic.invoke('domain:action', payload)
            └─ ipcMain.handle
                 ├─ READ  → SELECT / get file
                 ├─ WRITE → INSERT/UPDATE/DELETE / copy file
                 └─ return value | Error
                      └─ React state + toast
```
