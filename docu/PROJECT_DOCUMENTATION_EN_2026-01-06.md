# Migraine Tracker PWA — Project Documentation (English)

**Date:** 2026-01-06

## 1) What this project is

Migraine Tracker is a German-language Progressive Web App (PWA) to record migraine episodes and correlate them with:

- Garmin Connect health metrics (intended: Sleep, Stress, HR/HRV, Body Battery, Steps, Hydration, Respiration, SpO2)
- Weather data (Open-Meteo)

It is built as a local-first app: data is stored in IndexedDB (Dexie), with a PIN-gated UI and additional encryption utilities.

## 2) Current status (important)

- Core tracking features (episodes, symptoms, intensity history, night-onset, analytics, backup) are implemented.
- Weather integration is implemented.
- **Garmin integration is not reliable yet**:
  - There are still issues in Garmin authentication and data fetching.
  - **At the moment, the app is practically usable with demo/fake data only** (seeded Garmin data).

See the existing debug notes in the documentation folder:

- [docu/GARMIN_AUTH_FIX_2026-01-05.md](docu/GARMIN_AUTH_FIX_2026-01-05.md)
- [docu/GARMIN_SYNC_FIX_2026-01-05.md](docu/GARMIN_SYNC_FIX_2026-01-05.md)
- [docu/DEV_MODE_AUTH_FIX_2026-01-05.md](docu/DEV_MODE_AUTH_FIX_2026-01-05.md)

## 3) Architecture overview

### Routing and app flow

- Router entry: [src/App.tsx](src/App.tsx)
- Protected routes and PIN gate: [src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx)

### Storage

- Dexie database schema + migrations + settings/log helpers: [src/lib/db.ts](src/lib/db.ts)
- Times are stored as ISO strings.
- Debug logs are persisted into the database and surfaced in the Settings UI.

### Garmin

- Facade client: [src/lib/garmin/client.ts](src/lib/garmin/client.ts)
- HTTP wrapper (Capacitor HTTP on native, fetch in web dev): [src/lib/garmin/http-client.ts](src/lib/garmin/http-client.ts)

Important design constraint (to avoid CORS and to keep signing/logging consistent): do not call Garmin domains directly from UI code; route through the Garmin client/HTTP layer.

### Weather

- Weather sync service: [src/lib/weather/sync-service.ts](src/lib/weather/sync-service.ts)

### UI

- ShadCN UI components live under [src/components/ui/](src/components/ui/)
- Toasts are provided by `sonner` and mounted in [src/main.tsx](src/main.tsx)

## 4) How to run

### Development

- `npm install`
- `npm run dev`

### Build

- `npm run build`

### Tests

- `npm test`
- `npm run test:e2e`

### Android (Capacitor)

See: [docu/ANDROID_BUILD_DEPLOYMENT.md](docu/ANDROID_BUILD_DEPLOYMENT.md)

## 5) Documentation index (German)

A detailed, chronological implementation log exists in the documentation folder:

- [docu/README.md](docu/README.md)

This includes package-level docs such as:

- [docu/PAKET_1_Setup_Infrastruktur_2026-01-05.md](docu/PAKET_1_Setup_Infrastruktur_2026-01-05.md)
- [docu/PAKET_2_Datenbank_Encryption_2026-01-05.md](docu/PAKET_2_Datenbank_Encryption_2026-01-05.md)
- [docu/PAKET_4_Garmin_API_2026-01-05.md](docu/PAKET_4_Garmin_API_2026-01-05.md)
- [docu/PAKET_12_Weather_Integration_2026-01-05.md](docu/PAKET_12_Weather_Integration_2026-01-05.md)

## 6) AI-generated code notice

This repository (including documentation) was generated with extensive assistance from AI tools. Review and validate any behavior (especially authentication/sync) before relying on it.

## 7) Disclaimer

- Anyone may use, modify, and share this project under the MIT License.
- This project is provided for general use and experimentation.
- It is **not** medical advice and **not** a certified medical device.
- The software is provided **“as is”**, without any warranty.
- No guarantee is given that it works, fits a purpose, is secure, or is safe.
- Use at your own risk. You are responsible for verifying correctness and suitability.

## 8) License

Licensed under the MIT License — see [LICENSE](LICENSE).

## 9) References

Internal references:

- [PROJECT_PLAN.md](PROJECT_PLAN.md)
- [docu/README.md](docu/README.md)

External references:

- Vite: https://vite.dev/
- React: https://react.dev/
- Dexie (IndexedDB): https://dexie.org/
- Capacitor: https://capacitorjs.com/
- Open-Meteo: https://open-meteo.com/
- Garmin OAuth context (community reference): https://github.com/matin/garth
- Garmin Connect client reference: https://github.com/cyberjunky/python-garminconnect
- OAuth 1.0 (RFC 5849): https://www.rfc-editor.org/rfc/rfc5849
