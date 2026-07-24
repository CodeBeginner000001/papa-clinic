# Clinic Desktop (Offline)

Electron + React + TypeScript + SQLite desktop app for a single doctor or small clinic. Works fully offline after install.

## Features (MVP)

- Patient registration, search, duplicate warning, patient dashboard
- Multiple visits with vitals, diagnosis, follow-up
- Prescriptions with medicine autocomplete and normalized duplicate prevention
- Save / Print / PDF for prescriptions and bills
- Tests & procedures masters linked to visits and billing
- Bills with discounts, finalize, full/partial payments, outstanding balance
- Dashboard analytics and basic collection/outstanding reports
- Clinic/doctor settings
- Manual backup and restore of the local SQLite database

## Develop

```bash
npm install
npm run dev
```

If Electron fails to start inside Cursor/VS Code terminals, use:

```bash
npm start
```

(`ELECTRON_RUN_AS_NODE` must not be set — the npm scripts clear it.)

## Package

```bash
npm run dist:mac
npm run dist:win
npm run dist:linux
```

Installers are written to `release/`.

## Data location

The app stores data under the OS app data directory (Electron `userData`), including:

- `clinic.db`
- `backups/`
- `prescriptions/`
- `bills/`
- `exports/`
- `logs/`
