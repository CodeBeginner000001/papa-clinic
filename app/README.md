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

## Package (shareable installers)

```bash
npm run dist:mac    # macOS DMGs: Intel (x64) + Apple Silicon (arm64)
npm run dist:win    # Windows x64 Setup .exe  (works from Mac via prebuilds)
npm run dist:linux  # Linux x64 AppImage
```

Installers are written to `release/`. Packaging downloads the correct `better-sqlite3` binary for each OS so the app runs on other computers without Node/npm installed.

**What to share**

| Recipient | File |
|-----------|------|
| Windows PC (normal) | `AK Heart & Diabetics Care Center Setup 1.0.0.exe` |
| Mac (Apple Silicon / M1–M4) | `AK Heart & Diabetics Care Center-1.0.0-arm64.dmg` |
| Mac (Intel) | `AK Heart & Diabetics Care Center-1.0.0.dmg` |

Share only the `.exe` / `.dmg` — not `win-unpacked` or `mac-*` folders.

**Windows:** SmartScreen may say “Unknown publisher”. Click **More info → Run anyway**.

**macOS:** If the app says it’s damaged after download, run:
```bash
xattr -cr "/Applications/AK Heart & Diabetics Care Center.app"
```
Then open it once via Right-click → Open.