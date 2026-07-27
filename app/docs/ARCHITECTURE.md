# Project Architecture & Product Overview

**AK Heart & Diabetics Care Center** — offline clinic management desktop application (`clinic-desktop`).

---

## About the project

This product is a **fully offline** desktop system for a cardiology / diabetes-focused clinic. It helps front-desk and clinical staff manage patients, visits, prescriptions, lab tests, billing, and reports **without depending on the internet**.

All records stay on the clinic computer (or a folder the clinic chooses). That supports:

- Unreliable or unavailable connectivity  
- Privacy-sensitive medical and billing data kept on-premises  
- Predictable performance with a local database  
- Simple backup: copy the data folder or use in-app backup/restore  

**Product name:** AK Heart & Diabetics Care Center  
**App id:** `com.akclinic.desktop`  
**Version:** 1.0.0 (see `package.json`)

---

## Why it was built

| Need | How this app addresses it |
|------|---------------------------|
| Run without cloud SaaS | Local SQLite + Electron; no remote API |
| One place for clinical + billing workflow | Visits link prescriptions, tests, bills, invoices |
| Print-ready prescriptions and bills | Local HTML → print / PDF with letterhead templates |
| Lab test tracking end-to-end | Advise → schedule → complete → upload report → view |
| Own the data | Configurable data directory + backup/restore |

---

## How it was built (technique)

### Offline-first desktop stack

| Layer | Technology | Role |
|-------|------------|------|
| Desktop runtime | **Electron 33** | Windows / macOS / Linux shell |
| UI | **React 19** + **TypeScript** | Screens and forms |
| Bundling | **Vite 6** + vite-plugin-electron | Fast dev; builds renderer + main |
| Routing | **React Router 7** (HashRouter) | In-window navigation |
| Database | **SQLite** via **better-sqlite3** | Local relational store |
| Validation / shared utils | **Zod** + `shared/` | Shared types and helpers |
| Packaging | **electron-builder** | DMG / NSIS / AppImage installers |

### Offline technique (important)

1. **No network backend** — business logic runs in the Electron main process.  
2. **Single SQLite file** (`clinic.db`) holds patients, visits, Rx, tests, bills, payments, invoices, settings.  
3. **First-run setup** asks where to store data (default under Documents). Path saved in `config.json`.  
4. **File sidecars** for PDFs, letterheads, uploaded lab reports, exports, and logs.  
5. **Backup / restore** copies the database (and related folders) without uploading anywhere.  
6. **Print / PDF** uses a hidden Electron window and writes files locally.  

The UI always shows that the clinic is working in **Offline Mode**.

### Process architecture

```
┌──────────────────┐     preload      ┌──────────────────────┐
│  Renderer        │ ◄──────────────► │  Main process        │
│  React pages     │  clinic.invoke   │  IPC + repos + PDF   │
└──────────────────┘                  └──────────┬───────────┘
                                                 │
                                      ┌──────────▼───────────┐
                                      │  Data directory      │
                                      │  SQLite + files      │
                                      └──────────────────────┘
```

See also:

- [FRONTEND.md](./FRONTEND.md) — UI structure  
- [DATA-FLOW.md](./DATA-FLOW.md) — request lifecycle  

---

## Repository layout

```
app/
├── src/                 # React frontend
├── electron/            # Main process (IPC, DB, PDF, backup)
│   ├── main.ts
│   ├── preload.ts
│   ├── ipc.ts
│   ├── db/              # database.ts, repos.ts
│   ├── pdf.ts
│   ├── backup.ts
│   ├── paths.ts
│   ├── letterheads.ts
│   └── test-reports.ts
├── shared/              # Types & helpers shared by both processes
├── build/               # App icons for packaging
├── public/              # Static assets (favicon)
├── docs/                # This documentation
├── dist/                # Built renderer
├── dist-electron/       # Built main + preload
└── release/             # Installers after dist:*
```

---

## Current features (integrated)

### Core clinical

- **Dashboard** — daily snapshot and navigation into work queues  
- **Patients** — register, edit, archive, duplicate detection, patient dashboard  
- **Visits** — create/edit with visit type, complaints, examination notes  
- **Vitals** — temperature, BP, pulse, SpO₂, weight, BMI, blood sugar, etc.  
- **Prescriptions** — medicine lines with dosage/frequency/timing; draft vs finalized; print & PDF  
- **Global search** — find patients / visits quickly from the top bar  

### Laboratory tests

- Order tests on a visit (**clinic** billed vs **outside** referral)  
- Status workflow:  
  **Advised → Scheduled → Completed → Result received** (or **Cancelled**)  
- Schedule with date/time; upload and view report files  
- Order fields lock after status moves past Advised  
- Cancelling a clinic test **syncs bills and payments**  

### Billing & payments

- Bills with line items (consultation, tests, procedures, …)  
- Draft / finalized / cancelled  
- Discounts and optional tax from settings  
- **Payment → Invoice** (one payment creates one invoice; multiple invoices per bill)  
- Collect payment UI; print/PDF bill and invoice  
- Visit-level billing summary across all bills for that visit  
- Auto bill creation/update for unbilled clinic tests  

### Catalog & configuration

- Medicines, tests, and procedures masters  
- Custom options (dosage form, frequency, timing)  
- Clinic & doctor profile, fee defaults, code prefixes  
- Print templates (letterhead) and bill stationery / layout  
- Change data directory; backup and restore  

### Reports

- Date-range operational summaries  
- Excel export for patients, visits, prescriptions, bills, payments, tests  

### Packaging & branding

- Desktop icon from clinic leaf/cross logo  
- Installers: macOS DMG, Windows NSIS, Linux AppImage  

---

## Domain relationships (simplified)

```
Patient
  └── Visit
        ├── Vitals
        ├── Prescription (+ medicine lines)
        ├── Visit tests (status, schedule, report file)
        ├── Visit procedures
        └── Bill(s)
              ├── Bill items
              └── Payment(s) → Invoice(s)
```

Identifiers use yearly counters, e.g. `PAT-2026-000001`, `VIS-…`, `BILL-…`, `INV-…` (prefixes configurable).

---

## Build & run

```bash
cd app
npm install
npm run dev              # development (Vite + Electron)
npm run build && npm start

npm run dist:mac         # macOS DMGs (arm64 + x64) → release/
npm run dist:win         # Windows x64 NSIS Setup.exe → release/
npm run dist:linux       # Linux x64 AppImage → release/
```

Share only the `.dmg` / Setup `.exe` from `release/` (not unpacked folders). Packaging uses `scripts/pack.js` to install the correct `better-sqlite3` binary per OS/arch so installers work on other machines.

**macOS:** Unsigned downloads may need `xattr -cr "/Applications/AK Heart & Diabetics Care Center.app"` once.  
**Windows:** SmartScreen may require More info → Run anyway.

---

## Design principles

1. **Offline by default** — never require a network call for core workflows.  
2. **One visit is the hub** — Rx, tests, and bills hang off the visit.  
3. **Main process owns persistence** — UI is presentation + validation UX only.  
4. **Shared types** — `shared/types.ts` keeps IPC payloads honest.  
5. **Safe destructive actions** — cancel test / cancel bill / restore backup with confirms and logging.  
6. **Print fidelity** — templates and paper settings live with the clinic, not in the cloud.  

---

## Future integrations (roadmap ideas)

These are **not** implemented yet; useful next steps for a clinic product:

| Area | Possible integration |
|------|----------------------|
| **Cloud sync / multi-device** | Optional encrypted sync of the data folder or row-level sync for multiple clinic PCs |
| **SMS / WhatsApp** | Appointment and report-ready notifications via local gateway or provider API (when online) |
| **Lab machine / LIS** | Import analyzer results into visit tests instead of manual upload |
| **Accounting export** | Tally / QuickBooks / GST-ready exports beyond Excel |
| **e-Prescription standards** | Regional eRx formats or QR verification |
| **Role-based access** | Reception vs doctor vs billing user accounts with permissions |
| **Audit trail** | Immutable log of who changed clinical or billing records |
| **Appointments calendar** | Scheduling queue separate from walk-in visits |
| **Inventory** | Medicine stock, batch, expiry linked to prescriptions |
| **Teleconsult add-on** | Optional online visit notes when connectivity exists |
| **Auto-update** | electron-updater channel for installers |
| **Biometrics / hardware** | Token or fingerprint unlock for the clinic PC |

Any online feature should remain **optional** so the core offline promise stays intact.

---

## Documentation index

| Document | Contents |
|----------|----------|
| [FRONTEND.md](./FRONTEND.md) | React structure, routes, components, UI conventions |
| [DATA-FLOW.md](./DATA-FLOW.md) | IPC bridge, repos, SQLite, end-to-end examples |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | This file — product, stack, features, roadmap |

---

## Summary

AK Heart & Diabetics Care Center is an **Electron + React + SQLite** clinic system designed for **offline reliability**. The UI talks to a locked-down main process through IPC; the main process owns the database and files. Current modules cover the full loop from patient registration through visit documentation, prescriptions, lab workflow, billing, and reporting — with a clear path to optional online and hardware integrations later without abandoning the local-first core.
