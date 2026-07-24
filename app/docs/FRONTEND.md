# Frontend Guide

Documentation for the React renderer of **AK Heart & Diabetics Care Center** — the offline clinic desktop app.

---

## Overview

The frontend is a **React 19** single-page application that runs inside an Electron `BrowserWindow`. It never talks to a remote server. All data access goes through a secure preload bridge (`window.clinic`) to the Electron main process.

| Concern | Choice |
|---------|--------|
| UI library | React 19 + React DOM |
| Language | TypeScript |
| Bundler | Vite 6 |
| Routing | React Router 7 (`HashRouter`) |
| Styling | Single global stylesheet (`src/styles.css`) |
| Desktop shell | Electron 33 (renderer process) |

Hash routing is used so navigation works correctly under Electron’s `file://` / packaged load paths.

---

## Directory layout

```
src/
├── main.tsx                 # React bootstrap + HashRouter
├── App.tsx                  # Route table + providers
├── styles.css               # App-wide design system
├── vite-env.d.ts            # window.clinic typings
├── lib/
│   ├── api.ts               # Typed IPC wrappers (all backend calls)
│   └── format.ts            # money, dates, age/gender helpers
├── components/
│   ├── Shell.tsx            # Sidebar, topbar, global search
│   ├── ui.tsx               # Field, Modal, Badge, Toast, SettingsProvider
│   ├── TestWorkflow.tsx     # Test status actions (schedule / complete / report)
│   ├── RowMenu.tsx          # Context menus for table rows
│   ├── charts.tsx           # Dashboard / report charts
│   └── icons.tsx            # Inline SVG icon set + ILeafLogo
└── pages/                   # One module per screen
```

Shared TypeScript types live outside the renderer in `shared/types.ts` and are imported as `@shared/types`.

---

## Application shell

`Shell` wraps every page:

- **Sidebar** — clinic brand (logo + name), primary navigation, offline banner, app version  
- **Top bar** — global search (`Ctrl/Cmd+K`), notifications affordance, doctor profile  
- **Content** — routed page content  

Providers (outer → inner):

1. `SettingsProvider` — loads clinic settings once and shares them  
2. `ToastProvider` — transient success / error messages  
3. `Shell` — chrome around `<Routes>`  

---

## Routes

Defined in `src/App.tsx`:

| Path | Page | Purpose |
|------|------|---------|
| `/` | `DashboardPage` | Today’s overview, quick stats |
| `/patients` | `PatientsPage` | Patient list + filters |
| `/patients/new` | `PatientFormPage` | Register patient |
| `/patients/:id` | `PatientDetailPage` | Profile, visits, billing snapshot |
| `/patients/:id/edit` | `PatientFormPage` | Edit patient |
| `/visits` | `VisitsPage` | All visits |
| `/visits/new` | `VisitFormPage` | Create visit |
| `/patients/:patientId/visits/new` | `VisitFormPage` | Create visit for a patient |
| `/visits/:visitId` | `VisitDetailPage` | Visit note, vitals, tests, Rx, billing |
| `/visits/:visitId/edit` | `VisitFormPage` | Edit visit |
| `/visits/:visitId/billing` | `VisitBillingPage` | Combined bills for a visit |
| `/visits/:visitId/prescription` | `PrescriptionFormPage` | Write / edit prescription |
| `/prescriptions` | `PrescriptionsPage` | Prescription list |
| `/tests` | `TestsPage` | Cross-visit test tracking & reports |
| `/billing` | `BillingPage` | Bill list |
| `/bills/new` | `BillFormPage` | Create bill |
| `/bills/:billId` | `BillViewPage` | View bill, collect payment |
| `/bills/:billId/edit` | `BillFormPage` | Edit draft bill |
| `/reports` | `ReportsPage` | Analytics + Excel export |
| `/catalog` · `/medicines` | `CatalogPage` | Medicines, tests, procedures masters |
| `/print-template` | `PrintTemplatePage` | Letterhead & bill stationery |
| `/settings` | `SettingsPage` | Clinic config, backup, data folder |

---

## Calling the backend from the UI

Pages **do not** import Electron or SQLite. They call `api` helpers:

```ts
import { api } from '../lib/api'

const patients = await api.listPatients(query)
await api.createPatient(payload)
```

`src/lib/api.ts` wraps:

```ts
window.clinic.invoke('patients:list', query)
```

If the UI is opened outside Electron, `window.clinic` is missing and calls reject with a clear error.

### Common UI patterns

| Pattern | Where |
|---------|--------|
| Load on mount | `useEffect` + `useCallback` loaders |
| Toasts | `useToast()` after save / error |
| Settings | `useSettings()` for fees, doctor name, prefixes |
| Modals | `Modal` from `ui.tsx` for forms and confirmations |
| Tables | `.tbl` + optional `RowMenu` actions |
| Money / dates | `money()`, `fmtDate()`, `fmtTime()` from `format.ts` |

---

## Feature UI highlights

### Patients & visits

- Patient registration with duplicate checks  
- Visit form with vitals, complaints, and layout that stacks on narrower widths  
- Visit detail aggregates prescription, tests, and billing actions  

### Test workflow UI

`TestWorkflowActions` drives status without free-form status editing after order:

1. **Advised** — Schedule or Cancel  
2. **Scheduled** — Reschedule, Complete, or Cancel  
3. **Completed** — Upload report  
4. **Result received** — View / replace report  

Tests past **Advised** are **locked** in the “Edit Tests” modal (name, source, charge, remove).

### Billing UI

- Billing list → bill view (back button returns to Billing when opened from there)  
- Collect payment modal creates an invoice per payment  
- Visit billing page shows combined lines across visit bills  

### Print & templates

- Print Template page manages letterheads and bill backgrounds  
- Prescription / bill / invoice print & PDF actions call main-process builders  

---

## Styling & responsiveness

- Design tokens as CSS variables (greens, muted text, radius, shadows)  
- Layout primitives: `.card`, `.form-grid`, `.g2` / `.g3` / `.g4`, `.page-head`  
- **Container queries** on `.card` (`panel`) so forms and person headers respond to content width, not only viewport (important with a fixed sidebar)  
- Person header (`.person-card`) stacks meta fields early to avoid clipping  

Avoid introducing a second CSS framework; extend `styles.css` and existing class names.

---

## Components reference

| Component | Role |
|-----------|------|
| `Shell` | App chrome + nav + search |
| `Field` | Label + control wrapper |
| `Modal` | Dialog with optional footer / `wide` |
| `Badge` | Status chips (`green` / `amber` / `blue` / `gray` / `red`) |
| `Avatar` | Initials avatar |
| `StatCard` | Dashboard / list summary tiles |
| `Loading` | Full-page loading state |
| `TestWorkflowActions` | Test status machine controls |
| `RowMenu` | Floating row action menu |
| Icons (`I*`) | Consistent stroke icons |

---

## Conventions for new screens

1. Add a page under `src/pages/` and a route in `App.tsx`.  
2. Add a nav item in `Shell.tsx` if it is top-level.  
3. Add `api.*` methods in `lib/api.ts` that match new IPC channels.  
4. Reuse `@shared/types` — do not redefine domain types in the page.  
5. Prefer existing layout classes; keep forms `min-width: 0` aware for overflow.  
6. Surface errors with `toast(..., 'error')`.  

---

## Local UI development

```bash
cd app
npm run dev          # Vite + Electron together
# or after build:
npm run build && npm start
```

The renderer hot-reloads under Vite; main-process changes usually need a full Electron restart.
