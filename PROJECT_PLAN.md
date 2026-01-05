# Master-Projektplan: Migräne Tracker PWA (Enhanced)

Dieser Plan dient als zentrale Steuerungsdatei für KI-Agenten. Er enthält detaillierte technische Spezifikationen, Architektur-Entscheidungen und konkrete Arbeitspakete.

## 0. Projekt-Entscheidungen (Festgelegt)

Diese Entscheidungen definieren den Scope und die technische Ausrichtung:

- **Scope:** MVP (Minimum Viable Product) - Fokus auf Kern-Features
- **Garmin Daten:** Maximal (Sleep, Stress, HR, HRV, Body Battery, Steps, Hydration, Respiration)
- **Security:** Medium (Master-PIN + lokale DB-Verschlüsselung via `dexie-encrypted`)
- **Analytics:** Einfache Korrelationen (z.B. "An Tagen mit <6h Schlaf: 60% mehr Episoden")
- **Testing:** Comprehensive (Unit + Integration + E2E) + **MCP Server für Testing-Tools**
- **UI/UX:** Functional First (TailwindCSS + ShadCN defaults, Light Mode only)
- **Sprache:** Deutsch only (hardcoded strings)
- **Sync:** Auto-Sync bei App-Start (wenn letzter Sync >24h) - synct alle fehlenden Daten
- **Retention:** Rolling Window (2 Jahre Auto-Archivierung)
- **Onboarding:** Direct Start mit Dummy-Daten
- **Distribution:** Privat (APK Build)

---

## 1. Analyse & Technische Anforderungen

Nach Analyse wurden folgende technische Aspekte definiert:

1.  **State Management:** `dexie-react-hooks` (`useLiveQuery`) für DB-Sync, `zustand` für globalen UI-State.
2.  **Verschlüsselung:**
    - Lokale DB: `dexie-encrypted` (AES-256)
    - Backup Export: WebCrypto API (AES-GCM)
    - Master-PIN: Hashed in `@capacitor/preferences` (SHA-256)
3.  **Garmin Session Management:** Session-Cookies in `@capacitor/preferences`, Auto-Relogin bei 401/403.
4.  **Formular-Validierung:** `react-hook-form` + `zod`.
5.  **Error Handling:** Debug-Log in Settings mit Copy-Funktion.
6.  **MCP Server:** Testing-Tools als MCP Server für automatisierte Tests und DB-Inspektion.

---

## 2. Technische Architektur

### Core Stack

#### Vite + React + TypeScript

- **Setup:** `npm create vite@latest` → React + TypeScript Template
- **Vite Config:** Automatische HMR, Path Aliases (`@/*`), Proxy für Dev Server
- **TypeScript:** Strict Mode aktiviert, Path Mapping in `tsconfig.json`
- **Build:** `npm run build` → Optimiertes Production Bundle
- **Dev Server:** `npm run dev` → Schneller Hot Module Replacement

#### Dexie.js (IndexedDB Wrapper)

- **Installation:** `npm i dexie dexie-react-hooks dexie-encrypted`
- **Schema Definition:** Indizes mit `++id` (auto-increment), `*triggers` (multi-entry)
- **Verschlüsselung:** `dexie-encrypted` mit PBKDF2 Key Derivation
- **React Integration:** `useLiveQuery()` Hook für reaktive DB Queries
- **Transactions:** Automatisch, explizit via `db.transaction()`
- **Best Practices:**
  - Indizes nur für häufig abgefragte Felder
  - `bulkAdd()` / `bulkPut()` für Batch Operations
  - `where().anyOf()` für Queries mit mehreren Werten

#### Zustand (State Management)

- **Setup:** Einfach mit `create()` Store definieren
- **TypeScript:** Vollständige Type Safety
- **DevTools:** Redux DevTools Support via Middleware
- **Patterns:**
  - Slice Pattern für Feature-basierte Stores
  - Shallow Compare für Performance
  - Persist Middleware für LocalStorage Sync
  - Immer für komplexe State Updates

#### React Hook Form + Zod

- **Installation:** `npm i react-hook-form zod @hookform/resolvers`
- **Integration:** `useForm()` mit `zodResolver(schema)`
- **Validation:** Schema-basiert, TypeScript Inferenz
- **Performance:** Uncontrolled Components, minimales Re-Rendering
- **Features:**
  - `register()` für native Input Binding
  - `Controller` für Custom Components (ShadCN)
  - `formState.errors` für Error Handling
  - `watch()` für Field Watching

- **Framework:** React 18+ (Vite), TypeScript, ESLint + Prettier
- **Build Target:** Android (via Capacitor), Web (PWA Fallback)

#### TailwindCSS + ShadCN UI

- **TailwindCSS Setup:**
  - Installation: `npm install tailwindcss @tailwindcss/vite`
  - Vite Plugin: `import tailwindcss from '@tailwindcss/vite'`
  - Config: `@import "tailwindcss"` in `src/index.css`
- **ShadCN UI:**
  - Init: `npx shadcn@latest init` → Konfiguriert `components.json`
  - Komponenten: `npx shadcn@latest add button card input...`
  - Struktur: Komponenten in `src/components/ui/`
  - Customization: Tailwind Klassen direkt editierbar
  - Theme: CSS Variables für Dark/Light Mode (Light Mode only für MVP)
- **Best Practices:**
  - Composable Components (Button Variants via `cva`)
  - Accessibility: ARIA Labels, Keyboard Navigation
  - Responsive: Mobile-First mit `sm:`, `md:`, `lg:` Breakpoints

#### date-fns (Date Handling)

- **Installation:** `npm install date-fns`
- **Features:**
  - Immutable & Pure Functions
  - TypeScript Support
  - Tree-shakeable (nur benötigte Funktionen importieren)
- **Wichtige Funktionen:**
  - `format(date, 'yyyy-MM-dd')` → Datum formatieren
  - `subYears(date, 2)` → Datum subtrahieren (für Archivierung)
  - `differenceInDays(dateLeft, dateRight)` → Tage zwischen Daten
  - `startOfDay()`, `endOfDay()` → Tag-Grenzen für Queries

#### Recharts (Data Visualization)

- **Installation:** `npm install recharts`
- **Features:**
  - React-basierte Chart Library
  - Responsive Charts
  - Composable Components
- **Verwendete Charts:**
  - `<BarChart>` → Episoden pro Monat, Intensität pro Wochentag
  - `<PieChart>` → Trigger-Häufigkeit
  - `<LineChart>` → Garmin-Metriken Timeline (Multi-Line)
- **Best Practices:**
  - `ResponsiveContainer` für Mobile-Anpassung
  - Tooltip für Detailanzeige
  - Farbschema via TailwindCSS Colors

#### Lucide React (Icons)

- **Installation:** `npm install lucide-react`
- **Features:**
  - 1000+ optimierte SVG Icons
  - Tree-shakeable
  - Konsistentes Design
- **Verwendung:**
  - `<Plus />` → Floating Action Button
  - `<Calendar />`, `<Clock />` → DateTime Picker
  - `<TrendingUp />`, `<AlertCircle />` → Analytics
  - Individuell importierbar: `import { Plus, Calendar } from 'lucide-react'`

#### Utility Libraries

- **clsx:** `npm install clsx`
  - Conditional className Construction
  - `clsx('base', { 'active': isActive, 'disabled': isDisabled })`
- **tailwind-merge:** `npm install tailwind-merge`
  - Merge TailwindCSS Classes ohne Konflikte
  - `twMerge('px-2 py-1', 'px-3')` → `'px-3 py-1'`
  - Wichtig für ShadCN Component Variants

### Security

#### Verschlüsselungsstrategie

- **Lokale Datenbank:**
  - Technologie: `dexie-encrypted` (AES-256)
  - Key Derivation: PBKDF2 mit 100.000 Iterationen aus Master-PIN
  - Automatische Transparent Encryption/Decryption
  - DB wird nur bei korrektem PIN entsperrt

- **PIN Management:**
  - Storage: SHA-256 Hash in `@capacitor/preferences`
  - Salt: Zufällig generiert, zusammen mit Hash gespeichert
  - Validierung: Vergleich von Hash(eingegebener PIN + Salt) mit gespeichertem Hash
  - Mindestlänge: 6 Ziffern
  - Fehlversuch-Limit: 3 Versuche → Reset-Option

- **Backup-Verschlüsselung:**
  - Technologie: WebCrypto API (AES-GCM)
  - Separates Passwort (unabhängig vom Master-PIN)
  - Passwort-Stärke-Validierung vor Export
  - Format: JSON mit IV, verschlüsselten Daten, Algorithmus-Info

- **Token Storage (Garmin):**
  - OAuth1/OAuth2 Tokens in `@capacitor/preferences`
  - Automatische Bereinigung bei Logout
  - Session Timeout: 24 Stunden

**Detaillierte Implementierung siehe [Sektion 5: Encryption Details](#encryption-details)**

### Native Features (Capacitor)

#### Capacitor Setup & Core APIs

- **Installation:**
  ```bash
  npm i @capacitor/core @capacitor/cli @capacitor/android
  npx cap init MigraineTracker com.example.migrainetracker
  npx cap add android
  ```
- **Sync:** `npx cap sync` → Kopiert Web Assets zu Native Projekt
- **Config:** `capacitor.config.ts` mit webDir, bundledWebRuntime

#### @capacitor/preferences

- **Use Cases:** Key-Value Storage (PIN Hash, Settings, Tokens)
- **API:**
  - `Preferences.set({ key, value })` → Speichert String
  - `Preferences.get({ key })` → Liest Wert
  - `Preferences.remove({ key })` → Löscht Entry
- **JSON Support:** `JSON.stringify/parse` für Objekte
- **Platform:** UserDefaults (iOS), SharedPreferences (Android)
- **Security:** Daten bleiben bei App-Deinstallation nicht erhalten

#### @capacitor/filesystem

- **Backup Export/Import:**
  - `Filesystem.writeFile()` → Speichert verschlüsselte Backups
  - `Filesystem.readFile()` → Liest Backup Files
  - Encoding: Base64 für Binary Data
- **Directories:** `Directory.Documents` für User-Dateien

#### @capacitor-community/http

- **CORS Umgehung:** Native HTTP Requests (kein Browser CORS)
- **Wichtig:** Für Garmin API anstatt `fetch()` verwenden
- **API:** `CapacitorHttp.request({ url, method, headers })`

### Testing Infrastructure

#### Vitest (Unit & Integration Tests)

- **Setup:**
  ```bash
  npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
  ```
- **Config:** `vitest.config.ts` oder in `vite.config.ts` unter `test` Property
- **Features:**
  - Native ESM Support
  - Watch Mode mit HMR
  - UI Mode: `vitest --ui`
  - Coverage: `vitest run --coverage`
- **Test Patterns:**
  - Files: `*.test.ts`, `*.spec.ts`
  - Globals: `import { test, expect } from 'vitest'`
  - Mocking: `vi.mock()`, `vi.fn()`
- **Environment:** `jsdom` für DOM Simulation

#### Playwright (E2E Tests)

- **Setup:**
  ```bash
  npm i -D @playwright/test
  npx playwright install --with-deps
  ```
- **Config:** `playwright.config.ts` mit Projects (chromium, firefox, webkit)
- **Features:**
  - Auto-waiting für Elements
  - Screenshots & Videos bei Failures
  - Trace Viewer für Debugging
  - Parallel Execution
  - Component Testing (Experimental)
- **Best Practices:**
  - Page Object Model für Wiederverwendbarkeit
  - `test.describe()` für Test Gruppen
  - `test.beforeEach()` für Setup
  - Locators: `page.getByRole()`, `page.getByTestId()`

### Garmin API (python-garminconnect)

**Repository:** https://github.com/cyberjunky/python-garminconnect

#### Authentication Flow

- **SSO (Single Sign-On):** Verwendet `garth` Library für OAuth-Flow
- **Token-basiert:** OAuth1 + OAuth2 Tokens für API-Zugriff
- **MFA Support:** Multi-Factor Authentication mit Two-Phase Login
- **Session Management:**
  - Token Lifetime: ~24 Stunden
  - Auto-Relogin bei 401/403 Errors
  - Token Storage: `@capacitor/preferences` (OAuth1 + OAuth2)
  - Legacy Cookie: JSESSIONID (nicht mehr primär verwendet)

#### API Endpoints (105+ Methoden)

- **Base URL:** `https://connect.garmin.com`
- **API Paths:**
  - Modern Proxy: `/modern/proxy/` (empfohlen)
  - Connect API: `/connectapi/`
  - Service-spezifisch: `/wellness-service/`, `/hrv-service/`, `/usersummary-service/`

**Verfügbare Metriken:**

1. **Schlaf:**
   - `get_sleep_data(date)` → `/wellness-service/wellness/dailySleepData/{date}`
   - Sleep Score, Sleep Stages (deep, light, rem, awake in Sekunden)
   - Umrechnung: Sekunden → Minuten für UI

2. **Stress:**
   - `get_stress_data(date)` → `/wellness-service/wellness/dailyStress/{date}`
   - `get_all_day_stress(date)` → Kontinuierliche Messungen
   - Average & Max Stress (0-100)

3. **Herzfrequenz:**
   - `get_heart_rates(date)` → `/wellness-service/wellness/dailyHeartRate/{date}`
   - `get_rhr_day(date)` → Resting Heart Rate
   - Resting HR, Max HR, HR Zones

4. **HRV (Heart Rate Variability):**
   - `get_hrv_data(date)` → `/hrv-service/hrv/{date}`
   - HRV Status, Last Night Average, Weekly Average

5. **Body Battery:**
   - `get_body_battery(start, end)` → `/wellness-service/wellness/bodyBattery/reports/daily`
   - Charged, Drained, Current Value (0-100)

6. **Aktivität:**
   - `get_steps_data(date)` → `/wellness-service/wellness/dailySummaryChart/{date}`
   - `get_daily_steps(start, end)` → Historische Steps
   - Step Count, Goal, Distance

7. **Hydration:**
   - `get_hydration_data(date)` → `/usersummary-service/hydration/allData/{date}`
   - Value in ML, Goal in ML

8. **Atmung:**
   - `get_respiration_data(date)` → `/wellness-service/wellness/daily/respiration/{date}`
   - Average Sleep Respiration, Waking Respiration

9. **Weitere:**
   - SpO2: `get_spo2_data(date)` → Sauerstoffsättigung
   - Training Readiness: `get_training_readiness(date)`
   - User Summary: `get_user_summary(date)` → Steps, Calories, Distance, Floors, Active Minutes
   - VO2 Max, Fitness Age, Lactate Threshold, Intensity Minutes

#### Rate Limits & Error Handling

- **Rate Limit:** ~120 requests/minute
- **Date Format:** YYYY-MM-DD (ISO 8601)
- **Error Codes:**
  - `400`: Bad Request → Feature nicht aktiviert/verfügbar (graceful degradation)
  - `401`: Unauthorized → Token expired, Re-Login erforderlich
  - `403`: Forbidden → Zugriff verweigert, Re-Login
  - `429`: Too Many Requests → Rate Limit, exponential backoff

#### Implementierungs-Details

- **CORS:** Nutze `@capacitor-community/http` statt Browser `fetch`
- **MFA Flow:** Two-Phase Login mit `return_on_mfa=True`
- **Retry Logic:** Max 1x bei Authentication Failures
- **Unit System:** Metric/Imperial aus User Settings
- **Testing:** VCR (Video Cassette Recorder) Pattern für API Mocks

**Datenstruktur Beispiele:**

```typescript
// Sleep Data Response
{
  "dailySleepDTO": {
    "sleepTimeSeconds": 28800,  // Total sleep
    "deepSleepSeconds": 7200,   // Deep sleep
    "lightSleepSeconds": 14400, // Light sleep
    "remSleepSeconds": 5400,    // REM sleep
    "awakeSleepSeconds": 1800   // Awake time
  }
}

// Stress Data Response
{
  "stressValuesArray": [...],
  "avgStressLevel": 45,
  "maxStressLevel": 78
}

// Body Battery Response
{
  "charged": 85,
  "drained": 45,
  "currentValue": 65
}
```

**Sync Strategy:**

- Auto-Sync bei App-Start (wenn letzter Sync >24h)
- Synct alle fehlenden Tage (Date-Range: Von letzter DB-Entry bis heute)
- Progress Tracking mit Toast Notifications
- Error Handling: Bei Fehler einzelner Tage weitermachen

**Referenz-Implementierungen:**

- `example.py`: Basic Authentication + Token Storage
- `demo.py`: 105+ API Methods in 12 Kategorien
- `garminconnect/__init__.py`: Garmin Class mit allen Endpoints

---

## 3. Arbeitspakete & KI-Prompts

Jedes Paket ist so formuliert, dass es direkt von einer KI bearbeitet werden kann.

### 📦 PAKET 1: [AGENT: ARCHITECT] - Projekt-Setup & Infrastruktur

**Ziel:** Ein lauffähiges "Hello World" mit allen Libraries, Capacitor, Testing und UI-Framework.

**🏷️ Execution Mode:** `[🏗️ SEQUENTIAL - BLOCKING]` (Keine Parallelisierung möglich)

**Todo-Liste:**

- [x] `[🏗️ SEQ]` Vite Projekt mit React & TypeScript initialisieren: `npm create vite@latest migraine-tracker -- --template react-ts`.
- [x] `[🏗️ SEQ]` ESLint + Prettier konfigurieren.
- [x] `[🏗️ SEQ]` TailwindCSS & PostCSS konfigurieren: `npm install tailwindcss @tailwindcss/vite postcss autoprefixer`.
- [x] `[🏗️ SEQ]` `tsconfig.json` Paths alias `@/*` auf `./src/*` setzen.
- [x] `[🏗️ SEQ]` ShadCN UI initialisieren: `npx shadcn@latest init`.
- [x] `[🏗️ SEQ]` ShadCN Komponenten installieren: `npx shadcn@latest add button card input label select textarea dialog calendar popover switch slider tabs toast alert-dialog`.
- [x] `[🏗️ SEQ]` Core Libraries installieren: `dexie`, `dexie-react-hooks`, `dexie-encrypted`, `zustand`, `date-fns`, `react-hook-form`, `zod`, `lucide-react`, `recharts`, `clsx`, `tailwind-merge`.
- [x] `[🏗️ SEQ]` Testing Setup:
  - [x] `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
  - [x] `playwright` für E2E Tests
  - [x] `vitest.config.ts` erstellen
  - [x] `playwright.config.ts` erstellen
- [x] `[🏗️ SEQ]` Capacitor Setup: `npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/preferences @capacitor/filesystem @capacitor/local-notifications @capacitor/app`.
- [x] `[🏗️ SEQ]` `@capacitor-community/http` installieren.
- [x] `[🏗️ SEQ]` Capacitor Init: `npx cap init MigraineTracker com.example.migrainetracker`.
- [x] `[🏗️ SEQ]` Android Platform hinzufügen: `npx cap add android`.
- [x] `[🏗️ PARALLEL]` Ordnerstruktur anlegen:
  - `src/components/ui` (ShadCN)
  - `src/features` (episodes, garmin, analytics, auth)
  - `src/lib` (utils, db.ts, garmin-client.ts, encryption.ts)
  - `src/hooks`
  - `src/pages`
  - `src/store` (zustand stores)
  - `tests/unit`, `tests/e2e`, `tests/fixtures`
- [x] `[🏗️ SEQ]` React Router (`react-router-dom`) einrichten mit Layout.
- [x] `[🏗️ SEQ]` Basic Error Boundary Component erstellen.

**🤖 Sub-Agent Strategy:** NONE (Foundation zu kritisch)

---

### 📦 PAKET 2: [AGENT: DATABASE] - Datenmodell & Services

**Ziel:** Funktionierende, verschlüsselte Datenbank-Schicht mit Typisierung und Tests.

**🏷️ Execution Mode:** `[💾 SEQUENTIAL - BLOCKING]` (UI/Garmin benötigen DB)

**🤖 Sub-Agent Strategy:**

- `subagent-tests` → Unit Tests parallel zur Main Implementation

**Todo-Liste:**

- [ ] `[💾 SEQ]` `src/lib/db.ts` erstellen.
- [ ] `[💾 SEQ]` `dexie-encrypted` einrichten mit Master-Key.
- [ ] `[💾 SEQ]` Dexie Klasse `MigraineDB` definieren.
- [ ] `[💾 SEQ]` Schema definieren:
  ```typescript
  episodes: '++id, startTime, endTime, intensity, *triggers, *medicines';
  garminData: 'date, sleepScore, sleepStages, stressLevel, restingHR, hrv, bodyBattery, steps, hydration, respirationRate';
  logs: '++id, timestamp, level, message'; // Debugging
  settings: 'key'; // Key-Value für App-Settings
  archivedEpisodes: '++id, startTime, endTime'; // Für 2-Jahre Retention
  ```
- [x] `[💾 SEQ]` TypeScript Interfaces für alle Tabellen exportieren.
- [x] `[💾 SEQ]` `src/lib/encryption.ts` erstellen:
  - [x] `generateEncryptionKey(pin: string)` → Derives key from PIN
  - [x] `hashPin(pin: string)` → SHA-256 für Verifikation
  - [x] `encryptBackup(data, password)` → WebCrypto AES-GCM
  - [x] `decryptBackup(blob, password)` → Decrypt
- [x] `[💾 SEQ - DEPENDS: encryption.ts]` `src/features/auth/pin-service.ts` erstellen:
  - [x] `setupPin(pin)` → Erstmalig PIN setzen
  - [x] `verifyPin(pin)` → PIN Check
  - [x] `changePin(oldPin, newPin)` → PIN ändern
- [x] `[💾 PARALLEL - DEPENDS: db.ts]` Custom Hooks:
  - [x] `useEpisodes(filter)` mit `useLiveQuery`
  - [x] `useGarminData(dateRange)` mit `useLiveQuery`
  - [x] `useStats()` → Aggregierte Statistiken
- [x] `[💾 PARALLEL - DEPENDS: db.ts]` Data Archivierung Service:
  - [x] `archiveOldData()` → Verschiebt Episoden >2 Jahre in `archivedEpisodes`
  - [x] Automatisch bei App-Start aufrufen
- [x] `[💾 PARALLEL - DEPENDS: db.ts]` Seed-Script `src/lib/seed.ts`:
  - [x] Generiert 30 Tage Dummy-Episoden
  - [x] Generiert 30 Tage Garmin-Daten
  - [x] Optional: Import via ENV-Flag
- [x] `[🧪 PARALLEL]` **SUB-AGENT: Unit Tests** (parallel zur Implementation):
  - [x] `db.test.ts` → CRUD Operations
  - [x] `encryption.test.ts` → Encrypt/Decrypt
  - [x] `pin-service.test.ts` → PIN Logic (via encryption tests)

---

### 📦 PAKET 3: [AGENT: UI-CORE] - Haupt-Flows & PIN-Setup

**Ziel:** Der User kann PIN setzen, Episoden erfassen und sehen.

**🏷️ Execution Mode:** `[🎨 PARALLEL]` (Kann parallel zu PAKET 4 laufen)

**🤖 Sub-Agent Strategy:**

- `subagent-pin-flow` → PIN Setup + Unlock Screen
- `subagent-episode-form` → Episode Form + Validation
- `subagent-dashboard` → Dashboard + List View
- **Sync Point:** Alle 3 Sub-Agents müssen fertig sein vor Merge

**Todo-Liste:**

- [x] `[🎨 PARALLEL]` **SUB-AGENT 1: PIN Setup Flow** (eigenständiges Feature):
  - [x] `src/pages/PinSetup.tsx` → Erstmaliges PIN setzen (6-stellig)
  - [x] PIN Eingabe Component mit Dots (●●●●●●)
  - [x] PIN Bestätigung (zweimal eingeben)
  - [x] Validierung: Min. 6 Ziffern
  - [x] Speichern via `pin-service.ts`
- [x] `[🎨 PARALLEL]` **SUB-AGENT 1: PIN Unlock Screen**:
  - [x] `src/pages/PinUnlock.tsx` → App-Start Sperre
  - [x] Fehlversuch Counter (3x falsch → Reset-Option zeigen)
  - [x] Biometric später erweitern (TODO für v2)
- [ ] `[🎨 PARALLEL]` **SUB-AGENT 2: Episode Form** (eigenständiges Feature - ✅ IMPLEMENTIERT):
  - [x] `src/features/episodes/EpisodeForm.tsx`
  - [x] Nutzung von `react-hook-form` und `zod`
  - [x] Felder:
    - [x] Startzeit (DateTime Picker)
    - [x] Endzeit (optional, "Noch aktiv" Checkbox)
    - [x] Intensität (Slider 1-10 mit Emoji-Feedback)
    - [x] Trigger Auswahl (Multi-Select, "Add Custom" Button)
    - [x] Medikamente (Multi-Select, Freitext möglich)
    - [x] Symptome (Checkboxen: Übelkeit, Lichtempfindlichkeit, Aura, Phonophobie)
    - [x] Notizen (Textarea, optional)
  - [x] Trigger/Meds persistent speichern für Autocomplete
- [x] `[🎨 PARALLEL]` **SUB-AGENT 3: Dashboard** (eigenständiges Feature):
  - [x] **Dashboard Page:**
    - [x] Anzeige "Tage seit letzter Migräne" (große Zahl)
    - [x] Mini-Chart: Episoden der letzten 7 Tage (Stats Cards stattdessen)
    - [x] Liste der letzten 5 Einträge (Card-Layout) (10 Einträge)
    - [x] Floating Action Button "+" zum Loggen (✅ aktiviert)
  - [x] **Episode List View:**
    - [x] Gruppiert nach Monat (Chronologisch sortiert)
    - [x] Edit/Delete Actions
    - [ ] Swipe-to-Delete (optional - v2)
- [x] `[🎨 SEQ]` **Toast Notifications** bei Erfolg/Fehler einbauen (alle Features brauchen das).
- [x] `[🎨 PARALLEL]` **Settings Page (Basic)**:
  - [x] PIN ändern Button
  - [x] Debug Log anzeigen (mit Copy-Button)
  - [x] Log löschen
- [ ] `[🧪 PARALLEL]` Unit Tests:
  - [ ] `PinSetup.test.tsx` → PIN Validation (verschoben)
  - [ ] `EpisodeForm.test.tsx` → Form Submission (verschoben - Episode Form noch nicht implementiert)

---

### 📦 PAKET 4: [AGENT: GARMIN] - API Client & Sync (Maximal)

**Ziel:** Login bei Garmin und Abruf aller relevanten Gesundheitsdaten mit Auto-Sync.

**🏷️ Execution Mode:** `[🔗 PARALLEL]` (Kann parallel zu PAKET 3 laufen)

**🤖 Sub-Agent Strategy:**

- `subagent-auth` → Login + Token Management (SEQUENTIAL)
- `subagent-endpoints` → API Endpoints (PARALLEL nach Auth)
  - `worker-sleep` → Sleep Endpoints
  - `worker-stress` → Stress + Heart Rate Endpoints
  - `worker-activity` → Steps, Body Battery, Hydration
  - `worker-misc` → Respiration, SpO2, Training Readiness
- `subagent-sync` → Sync Service (nach Endpoints)
- **Sync Point:** Auth → Endpoints → Sync Service

**Siehe [Sektion 2: Garmin API (python-garminconnect)](#garmin-api-python-garminconnect) für detaillierte API-Dokumentation.**

**Todo-Liste:**

- [x] `[🔗 SEQ]` **SUB-AGENT 1: Garmin API Client** `src/lib/garmin/client.ts`
  - [x] Implementierung basierend auf `python-garminconnect` SSO Flow (MVP: Simplified)
  - [x] `login(email, password)` → OAuth1/OAuth2 Token Flow, speichert Tokens (MVP: Mock Tokens)
  - [x] `resumeLogin(clientState, mfaCode)` → MFA Support (MVP: Stub)
  - [x] `isSessionValid()` → Prüft ob OAuth Tokens noch gültig
  - [x] `refreshSession()` → Re-Login mit gespeicherten Credentials
  - [x] Token-Management via `@capacitor/preferences` (OAuth1 + OAuth2 Tokens)
  - [x] Nutzung von `@capacitor-community/http` (WICHTIG: nicht `fetch` wegen CORS) - MVP: Vorbereitet
  - [x] Base URL: `https://connect.garmin.com/modern/proxy/`
- [x] `[🔗 PARALLEL - DEPENDS: client.ts]` **SUB-AGENT 2: API Endpoints implementieren** (nach python-garminconnect Pattern):
  - [x] `[🔗 PARALLEL]` **WORKER 1: Sleep Endpoints**
    - [x] `getSleepData(date)` → API: `/wellness-service/wellness/dailySleepData/{date}` (MVP: Stub)
      - Sleep Score, Sleep Stages in Sekunden (deep, light, rem, awake)
      - Umrechnung: Sekunden → Minuten für UI
  - [x] `[🔗 PARALLEL]` **WORKER 2: Stress & Heart Rate Endpoints**
    - [x] `getStressData(date)` → API: `/wellness-service/wellness/dailyStress/{date}` (MVP: Stub)
      - Stress Values Array, Average (0-100), Max (0-100)
    - [x] `getAllDayStress(date)` → API für kontinuierliche Stress-Messungen (MVP: Stub)
    - [x] `getHeartRates(date)` → API: `/wellness-service/wellness/dailyHeartRate/{date}` (MVP: Stub)
      - Resting HR, Max HR, HR Zones
    - [x] `getRhrDay(date)` → Speziell für Resting Heart Rate (MVP: Stub)
    - [x] `getHRVData(date)` → API: `/hrv-service/hrv/{date}` (MVP: Stub)
      - HRV Status, Last Night Average, Weekly Average
  - [x] `[🔗 PARALLEL]` **WORKER 3: Activity & Body Battery Endpoints**
    - [x] `getBodyBattery(startDate, endDate)` → API: `/wellness-service/wellness/bodyBattery/reports/daily` (MVP: Stub)
      - Charged, Drained, Current Value (0-100)
    - [x] `getStepsData(date)` → API: `/wellness-service/wellness/dailySummaryChart/{date}` (MVP: Stub)
      - Step Count, Goal, Distance
    - [x] `getDailySteps(startDate, endDate)` → Historische Steps (MVP: Stub)
    - [x] `getHydrationData(date)` → API: `/usersummary-service/hydration/allData/{date}` (MVP: Stub)
      - Value in ML, Goal in ML
  - [x] `[🔗 PARALLEL]` **WORKER 4: Misc Health Metrics**
    - [x] `getRespirationData(date)` → API: `/wellness-service/wellness/daily/respiration/{date}` (MVP: Stub)
      - Average Sleep Respiration, Waking Respiration
    - [x] `getSpo2Data(date)` → SpO2 Messwerte (falls verfügbar) (MVP: Stub)
    - [x] `getTrainingReadiness(date)` → Training Readiness Score (MVP: Stub)
    - [x] `getUserSummary(date)` → Comprehensive Daily Summary (MVP: Stub)
      - Steps, Calories, Distance, Floors, Active Minutes
    - [x] Error Handling: 400 → Feature nicht verfügbar (graceful degradation)
- [x] `[🔗 SEQ - DEPENDS: endpoints]` **SUB-AGENT 3: Sync Service** `src/lib/garmin/sync-service.ts`
  - [x] `syncAllMissingData()` → Ermittelt Lücken in `garminData`, synct alles (MVP: Stub)
  - [x] Date-Range Logik: Von letzter DB-Entry bis heute (MVP: Stub)
  - [x] Progress Tracking (z.B. "12/30 Tage synchronisiert") (MVP: Stub)
  - [x] Error Handling: Bei Fehler einzelner Tage weitermachen
  - [x] Auto-Retry bei 401/403 (max. 1x)
- [x] `[🔗 PARALLEL - DEPENDS: sync-service]` **Auto-Sync Logic** `src/hooks/use-garmin-sync.ts`
  - [x] Prüft bei App-Start: Letzter Sync >24h?
  - [x] Triggered Sync automatisch
  - [x] Zeigt Sync-Status via Toast
- [x] `[🔗 PARALLEL - DEPENDS: client.ts]` **UI für Garmin Connect** `src/pages/GarminSettings.tsx`
  - [x] Login-Formular (Email, Passwort)
  - [x] "Verbunden als: [email]" Anzeige
  - [x] Button "Jetzt synchronisieren"
  - [x] Sync-Status: "Letzter Sync: vor 2 Stunden"
  - [x] Sync-Progress Bar während Sync
  - [x] Button "Verbindung trennen"
- [x] `[🔗 PARALLEL - DEPENDS: sync-service]` **Garmin Data Viewer** `src/pages/GarminDataView.tsx`
  - [x] Liste aller synchronisierten Tage
  - [x] Detail-Ansicht pro Tag (alle Metriken)
  - [x] Manuelles Re-Sync einzelner Tage
- [x] `[🧪 PARALLEL]` Unit Tests:
  - [x] `garmin-client.test.ts` → API Mocking
  - [x] `sync-service.test.ts` → Date-Range Logic (angepasst für Stubs)
- [ ] `[🧪 PARALLEL]` Integration Tests:
  - [ ] `garmin-sync.integration.test.ts` → Full Sync Flow (Post-MVP)

---

### 📦 PAKET 5: [AGENT: ANALYTICS] - Charts, Korrelationen & Export ✅ COMPLETED

**Ziel:** Visualisierung mit Korrelations-Insights und verschlüsselte Datensicherung.

**🏷️ Execution Mode:** `[📊 SEQUENTIAL - DEPENDS: PAKET 2,3,4]` (Benötigt DB + UI + Garmin)

**🤖 Sub-Agent Strategy:**

- `subagent-charts` → Recharts Implementation (PARALLEL)
- `subagent-correlations` → Statistical Analysis (PARALLEL)
- `subagent-backup` → Export/Import (PARALLEL)
- **Sync Point:** Alle 3 Sub-Agents können parallel laufen

**Todo-Liste:**

- [x] `[📊 SEQ]` **Stats Page:** `src/pages/Analytics.tsx`
  - [x] Tab-Navigation: "Übersicht", "Trigger", "Korrelationen", "Export"
- [x] `[📊 PARALLEL]` **SUB-AGENT 1: Charts (Recharts):**
  - [x] Anzahl Episoden pro Monat (BarChart)
  - [x] Durchschnittliche Intensität pro Wochentag (BarChart)
  - [x] Trigger Häufigkeit (PieChart, Top 10)
  - [x] Medikamenten-Wirksamkeit (Success Rate)
  - [x] Garmin-Metriken Timeline (Line Chart mit Multiple Lines)
- [x] `[📊 PARALLEL]` **SUB-AGENT 2: Korrelations-Engine:** `src/features/analytics/correlation-service.ts`
  - [x] `analyzeSleptCorrelation()` → "Bei <6h Schlaf: X% mehr Episoden"
  - [x] `analyzeStressCorrelation()` → "Hoher Stress (>70): X% mehr Episoden"
  - [x] `analyzeHRVCorrelation()` → "Niedriger HRV: X% mehr Episoden"
  - [x] `analyzeTriggerPatterns()` → "Trigger X führt in Y% der Fälle zu Episoden"
  - [x] Statistical Significance Check (Chi-Square Test, p-value)
- [x] `[📊 PARALLEL - DEPENDS: correlation-service]` **Korrelations-Anzeige:** `src/features/analytics/CorrelationInsights.tsx`
  - [x] Card-basierte Insights
  - [x] "🔍 Muster erkannt" Badge bei signifikanten Korrelationen
  - [x] Detail-Modal mit Erklärung
  - [x] Beispiel: "An Tagen mit <6h Schlaf hattest du 3x häufiger Migräne (15 von 20 Tagen)"
- [x] `[📊 PARALLEL]` **SUB-AGENT 3: Backup Service:** `src/features/backup/backup-service.ts`
  - [x] `exportData(password)`:
    - [x] Holt alle Daten aus DB
    - [x] Serialisiert zu JSON
    - [x] Verschlüsselt mit AES-GCM (WebCrypto)
    - [x] Speichert als `migraine-backup-[DATUM].enc` via Filesystem API
    - [x] Nutzt Share API für Export
  - [x] `importData(fileUri, password)`:
    - [x] Liest Datei
    - [x] Entschlüsselt
    - [x] Validiert JSON Schema
    - [x] Merged/Replaces DB (User-Auswahl)
    - [x] Zeigt Diff vor Import
- [x] `[📊 PARALLEL - DEPENDS: backup-service]` **Backup UI:** `src/features/backup/BackupManager.tsx`
  - [x] Button "Backup erstellen"
  - [x] Password-Input mit Stärke-Anzeige
  - [x] Button "Backup wiederherstellen"
  - [x] File-Picker
  - [x] Import-Vorschau: "X Episoden, Y Garmin-Einträge"
- [x] `[🧪 PARALLEL]` Unit Tests:
  - [x] `correlation-service.test.ts` → Statistical Logic
  - [x] `backup-service.test.ts` → Encrypt/Decrypt Roundtrip
- [ ] `[🧪 PARALLEL]` E2E Tests:
  - [ ] `analytics.e2e.test.ts` → Chart Rendering
  - [ ] `backup.e2e.test.ts` → Export/Import Flow

---

### 📦 PAKET 6: [AGENT: MCP-SERVER] - Testing Infrastructure & Tools

**Ziel:** MCP Server für automatisierte Tests, DB-Inspektion und Mocking.

**🏷️ Execution Mode:** `[🧪 PARALLEL - NON-BLOCKING]` (Kann parallel zu allen anderen laufen)

**🤖 Sub-Agent Strategy:**

- `subagent-tools` → MCP Tools Implementation (PARALLEL)
- `subagent-mocks` → Mock Data Generators (PARALLEL)
- **Sync Point:** Beide Sub-Agents unabhängig voneinander

#### MCP Server Aktivierung & Setup

**Verfügbare MCP Server für dieses Projekt:**

1. **Playwright MCP Server** (bereits verfügbar)
   - E2E Testing der PWA
   - Browser Automation & Screenshots
   - Visual Regression Tests
   - Network & Console Monitoring

2. **Python/Pylance MCP Server** (empfohlen für Garmin API)
   - Code Execution: `pylanceRunCodeSnippet` → Python Code direkt ausführen
   - Syntax Validation: `pylanceFileSyntaxErrors`, `pylanceSyntaxErrors`
   - Import Analysis: `pylanceImports`, `pylanceInstalledTopLevelModules`
   - Environment Management: `pylancePythonEnvironments`, `pylanceUpdatePythonEnvironment`
   - **Use Case:** `python-garminconnect` testen, API Prototyping, Datenstruktur-Analyse

3. **Container MCP Server** (optional)
   - Container/Image Management
   - Nützlich für Garmin API Mock Server in Docker

**Aktivierung in Claude Desktop:**

MCP Server werden in der Claude Desktop Config registriert:

**Config Location:**

- Linux: `~/.config/Claude/claude_desktop_config.json`
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Beispiel Config für Custom MCP Server:**

```json
{
  "mcpServers": {
    "migraine-tracker-db": {
      "command": "node",
      "args": ["/home/daniel/Desktop/garmin/mcp-server/dist/db-inspector.js"]
    },
    "garmin-api-mock": {
      "command": "node",
      "args": ["/home/daniel/Desktop/garmin/mcp-server/dist/garmin-mock.js"]
    },
    "migraine-test-tools": {
      "command": "node",
      "args": ["/home/daniel/Desktop/garmin/mcp-server/dist/test-tools.js"]
    }
  }
}
```

**Aktivierung während der Entwicklung:**

Custom MCP Server Tools müssen während der Chat-Session aktiviert werden (nicht per Config):

- Automatische Aktivierung bei Bedarf
- Manuell via spezifische Tool-Aufrufe
- Beispiel: Python Tools wurden bereits aktiviert für Garmin API Testing

**Todo-Liste:**

- [x] **MCP Server Setup:** `mcp-server/` (separates Verzeichnis)
  - [x] Node.js/TypeScript Project initialisieren
  - [x] `@modelcontextprotocol/sdk` installieren
  - [x] MCP Server starten via Stdio Transport
- [x] **MCP Tools implementieren:**
  - [x] `db-inspect` → Liest IndexedDB aus, gibt JSON zurück
  - [x] `db-seed` → Generiert Test-Daten (Episoden, Garmin)
  - [x] `db-clear` → Löscht alle Daten (für Test-Reset)
  - [x] `garmin-mock` → Startet Mock-Server für Garmin API
  - [x] `run-tests` → Triggert Vitest/Playwright Runs
  - [x] `check-coverage` → Coverage Report ausgeben
- [x] **Integration in VS Code:**
  - [x] MCP Server als Task definieren
  - [x] Dokumentation für Nutzung mit Claude Desktop
- [x] **Mock Data Generator:** `mcp-server/generators/`
  - [x] `generateEpisodes(count, dateRange)` → Realistic Episodes
  - [x] `generateGarminData(dateRange)` → Realistic Health Metrics
  - [x] Nutzt `@faker-js/faker` für Varianz
- [x] **Garmin API Mock:** `mcp-server/mocks/garmin-api-mock.ts`
  - [x] Express Server auf localhost:3001
  - [x] Simuliert alle Garmin Endpoints
  - [x] Konfigurierbare Responses (Success, Error, Delay)
- [ ] **CI/CD Vorbereitung:**
  - [ ] GitHub Actions Workflow (optional)
  - [ ] Pre-commit Hook für Tests
- [x] Unit Tests für MCP Server:
  - [x] Mock Data Generators getestet via Sub-Agent

---

### 📦 PAKET 7: [AGENT: GARMIN-REAL] - Echte Garmin API Synchronisation

**Ziel:** Implementierung der echten Garmin Connect API Synchronisation (Stubs → Real API).

**🏷️ Execution Mode:** `[🔗 SEQUENTIAL - DEPENDS: PAKET 4]` (Baut auf bestehenden Stubs auf)

**🤖 Sub-Agent Strategy:**

- `subagent-auth-real` → Echte OAuth Implementierung
- `subagent-endpoints-real` → Echte API Calls (PARALLEL)
- `subagent-sync-real` → Sync Logic mit Error Handling
- **Sync Point:** Auth → Endpoints → Sync

**Referenz:** python-garminconnect Library (garth für OAuth)

**Todo-Liste:**

- [x] `[🔗 SEQ]` **Echte OAuth Implementierung** `src/lib/garmin/auth.ts`
  - [x] SSO Login Flow basierend auf `garth` Library Pattern
  - [x] OAuth1 + OAuth2 Token Handling
  - [x] Token Storage in `@capacitor/preferences`
  - [x] Token Refresh Logic (24h Lifetime)
  - [x] MFA Support (Two-Phase Login)
- [x] `[🔗 SEQ]` **HTTP Client Wrapper** `src/lib/garmin/http-client.ts`
  - [x] Nutze `@capacitor-community/http` (CORS Bypass)
  - [x] Auto-Retry bei 401/403 (max 1x)
  - [x] Rate Limiting (120 req/min)
  - [x] Request/Response Logging für Debug
- [x] `[🔗 PARALLEL - DEPENDS: auth.ts]` **Echte API Endpoints** (Stubs ersetzen):
  - [x] `getSleepData(date)` → Real API Call
  - [x] `getStressData(date)` → Real API Call
  - [x] `getHeartRates(date)` → Real API Call
  - [x] `getHRVData(date)` → Real API Call
  - [x] `getBodyBattery(start, end)` → Real API Call
  - [x] `getStepsData(date)` → Real API Call
  - [x] `getHydrationData(date)` → Real API Call
  - [x] `getRespirationData(date)` → Real API Call
  - [x] `getSpo2Data(date)` → Real API Call
  - [x] `getUserSummary(date)` → Real API Call
- [x] `[🔗 SEQ - DEPENDS: endpoints]` **Sync Service Update** `src/lib/garmin/sync-service.ts`
  - [x] Replace Mock Data mit echten API Calls
  - [x] Batch Sync für Date Ranges
  - [x] Progress Tracking mit Callback
  - [x] Error Recovery (einzelne Tage fehlschlagen → weitermachen)
  - [x] Partial Sync (nur fehlende Metriken)
- [ ] `[🔗 SEQ]` **Auto-Sync Verbesserungen** `src/hooks/use-garmin-sync.ts`
  - [ ] Background Sync (wenn App im Hintergrund)
  - [ ] Sync Queue für offline gesammelte Requests
  - [x] Sync Status Persistenz (letzter erfolgreicher Sync)
- [x] `[🧪 SEQ]` **Unit Tests:**
  - [x] `garmin-client.test.ts` → Client Tests
  - [x] `garmin-endpoints.test.ts` → Endpoint Tests
- [ ] `[🧪 SEQ]` **Integration Tests:**
  - [ ] `garmin-real-api.integration.test.ts` → VCR Pattern (recorded responses)
  - [ ] Mock Server Fallback für CI/CD

---

### 📦 PAKET 8: [AGENT: SYMPTOMS] - Erweiterte Symptom-Erfassung

**Ziel:** Mehr vordefinierte Symptome + benutzerdefinierte Symptome hinzufügen.

**🏷️ Execution Mode:** `[🎨 PARALLEL]` (Unabhängig von anderen Paketen)

**🤖 Sub-Agent Strategy:**

- `subagent-schema` → DB Schema Migration
- `subagent-ui` → Form Updates
- **Sync Point:** Schema → UI

**Todo-Liste:**

- [ ] `[💾 SEQ]` **DB Schema erweitern** `src/lib/db.ts`
  - [ ] Neues `symptoms` Interface:
    ```typescript
    symptoms: {
      // Vordefiniert
      nausea: boolean;           // Übelkeit
      photophobia: boolean;      // Lichtempfindlichkeit
      phonophobia: boolean;      // Lärmempfindlichkeit
      aura: boolean;             // Aura
      vomiting: boolean;         // Erbrechen
      vertigo: boolean;          // Schwindel
      neckPain: boolean;         // Nackenschmerzen
      fatigue: boolean;          // Müdigkeit
      concentration: boolean;    // Konzentrationsprobleme
      visualDisturbance: boolean; // Sehstörungen
      tinglingNumbness: boolean; // Kribbeln/Taubheit
      speechDifficulty: boolean; // Sprachschwierigkeiten
      // Benutzerdefiniert
      custom: string[];          // ["Augenflimmern", "Ohrensausen"]
    }
    ```
  - [ ] DB Migration Version 2 mit Upgrade-Logik
- [ ] `[🎨 PARALLEL - DEPENDS: schema]` **EpisodeForm erweitern** `src/features/episodes/EpisodeForm.tsx`
  - [ ] Gruppierte Symptom-Checkboxen (kategorisiert)
  - [ ] "Weitere Symptome hinzufügen" Button
  - [ ] Custom Symptom Input mit Autocomplete (aus vorherigen)
  - [ ] Custom Symptom Tags mit Remove-Button
- [ ] `[💾 SEQ]` **Custom Symptoms Service** `src/features/episodes/symptom-service.ts`
  - [ ] `getAllCustomSymptoms()` → Alle jemals verwendeten
  - [ ] `getCommonCustomSymptoms()` → Top 5 häufigste
  - [ ] Persistierung in Settings Tabelle
- [ ] `[🎨 PARALLEL]` **Symptom-Kategorien UI:**
  - [ ] Kategorie "Schmerz": Nackenschmerzen
  - [ ] Kategorie "Sensorisch": Licht, Lärm, Aura, Sehstörungen
  - [ ] Kategorie "Neurologisch": Kribbeln, Sprache, Konzentration
  - [ ] Kategorie "Allgemein": Übelkeit, Erbrechen, Müdigkeit, Schwindel
  - [ ] Kategorie "Eigene": Custom Symptoms
- [ ] `[📊 PARALLEL]` **Analytics Update:**
  - [ ] Symptom-Häufigkeit Chart erweitern
  - [ ] Korrelationen für neue Symptome
- [ ] `[🧪 PARALLEL]` Unit Tests:
  - [ ] `symptom-service.test.ts` → Custom Symptom Logic
  - [ ] `episode-form.test.ts` → Form Validation mit neuen Symptomen

---

### 📦 PAKET 9: [AGENT: INTENSITY-HISTORY] - Intensitäts-Verlauf

**Ziel:** Intensität einer Episode über die Zeit ändern (Verlauf dokumentieren).

**🏷️ Execution Mode:** `[🎨 SEQUENTIAL - DEPENDS: PAKET 3]` (Erweitert Episode Schema)

**🤖 Sub-Agent Strategy:**

- `subagent-schema` → DB Schema für Intensity History
- `subagent-ui` → Timeline UI Component
- **Sync Point:** Schema → UI

**Todo-Liste:**

- [ ] `[💾 SEQ]` **DB Schema erweitern** `src/lib/db.ts`
  - [ ] Neues `IntensityEntry` Interface:

    ```typescript
    interface IntensityEntry {
      timestamp: string; // ISO 8601
      intensity: number; // 1-10
      note?: string; // Optional: "Nach Medikament besser"
    }

    interface Episode {
      // ... bestehende Felder
      intensity: number; // Aktuelle/letzte Intensität
      intensityHistory: IntensityEntry[]; // Verlauf
    }
    ```

  - [ ] DB Migration Version 3
  - [ ] Default: `intensityHistory = [{ timestamp: startTime, intensity: initialIntensity }]`

- [ ] `[🎨 PARALLEL - DEPENDS: schema]` **Intensity Timeline Component** `src/features/episodes/IntensityTimeline.tsx`
  - [ ] Zeitleiste mit Punkten für jeden Eintrag
  - [ ] Line Chart (x: Zeit, y: Intensität 1-10)
  - [ ] Emoji-Anzeige bei jedem Punkt
  - [ ] Notizen als Tooltip
- [ ] `[🎨 PARALLEL]` **Intensity Update UI:**
  - [ ] "Intensität aktualisieren" Button in Episode Detail
  - [ ] Quick-Update Slider mit "Jetzt speichern"
  - [ ] Optional: Notiz hinzufügen ("Wurde besser nach Ibu")
- [ ] `[🎨 PARALLEL]` **Episode Detail View erweitern** `src/features/episodes/EpisodeDetail.tsx`
  - [ ] Intensity Timeline anzeigen
  - [ ] Durchschnittliche Intensität berechnen
  - [ ] Peak Intensität anzeigen
  - [ ] Dauer auf Peak
- [ ] `[📊 PARALLEL]` **Analytics Update:**
  - [ ] Chart: Typischer Intensitätsverlauf (aggregiert)
  - [ ] Korrelation: "Medikament X senkt Intensität um Y% in Z Minuten"
- [ ] `[🧪 PARALLEL]` Unit Tests:
  - [ ] `intensity-history.test.ts` → Timeline Logic
  - [ ] `episode-detail.test.ts` → View Rendering

---

### 📦 PAKET 10: [AGENT: NIGHT-ONSET] - Nacht-Beginn Tracking

**Ziel:** Erfassen ob Migräne in der Nacht begonnen oder geendet hat.

**🏷️ Execution Mode:** `[🎨 PARALLEL]` (Einfache Schema-Erweiterung)

**🤖 Sub-Agent Strategy:**

- Kein Sub-Agent nötig (kleine Änderungen)

**Todo-Liste:**

- [ ] `[💾 SEQ]` **DB Schema erweitern** `src/lib/db.ts`
  - [ ] Neue Felder in Episode:
    ```typescript
    interface Episode {
      // ... bestehende Felder
      nightOnset: boolean; // Beginn während Schlaf (22:00-06:00)
      nightEnd: boolean; // Ende während Schlaf
      wokeUpWithMigraine: boolean; // Aufgewacht mit Migräne
      sleepQualityBefore?: number; // 1-5 Schlafqualität vor Episode
    }
    ```
  - [ ] DB Migration Version 4
- [ ] `[🎨 SEQ - DEPENDS: schema]` **EpisodeForm erweitern:**
  - [ ] Checkbox: "Während der Nacht begonnen (22-06 Uhr)"
  - [ ] Checkbox: "Mit Migräne aufgewacht"
  - [ ] Auto-Detect: Wenn startTime zwischen 22:00-06:00 → Vorschlag
  - [ ] Optional: Schlafqualität Slider (1-5 Sterne)
- [ ] `[📊 PARALLEL]` **Analytics Update:**
  - [ ] Statistik: "X% deiner Migränen beginnen nachts"
  - [ ] Korrelation: Nacht-Migräne vs. Garmin Sleep Score
  - [ ] Chart: Verteilung nach Tageszeit (Nacht/Morgen/Tag/Abend)
- [ ] `[🧪 PARALLEL]` Unit Tests:
  - [ ] `night-onset.test.ts` → Auto-Detection Logic

---

### 📦 PAKET 11: [AGENT: BACKUP-CONSOLIDATION] - Export/Import Konsolidierung ✅ COMPLETED

**Ziel:** Export/Import nur an einer Stelle (Settings entfernen, nur in Analytics).

**🏷️ Execution Mode:** `[🎨 PARALLEL]` (UI Refactoring)

**🤖 Sub-Agent Strategy:**

- Kein Sub-Agent nötig (UI Cleanup)

**Todo-Liste:**

- [x] `[🎨 SEQ]` **Settings Page bereinigen** `src/pages/Settings.tsx`
  - [x] Export-Button entfernen (falls vorhanden)
  - [x] Stattdessen: Link zu "Analyse & Statistiken > Export"
  - [x] Hinweis: "Datensicherung findest du unter Analyse"
- [x] `[🎨 SEQ]` **Navigation Update:**
  - [x] Breadcrumb in BackupManager: "Einstellungen > Datensicherung" → nur "Analyse > Export"
  - [x] Deep Link Support: `/analytics?tab=export`
- [x] `[🎨 SEQ]` **BackupManager verbessern** `src/features/backup/BackupManager.tsx`
  - [x] Klarere UI mit Schritt-für-Schritt Anleitung
  - [x] Export: Vorschau was exportiert wird (X Episoden, Y Tage Garmin)
  - [x] Import: Merge-Strategie auswählen (Ersetzen/Zusammenführen)
  - [x] Import: Schritt-für-Schritt Fortschrittsanzeige
- [ ] `[🧪 PARALLEL]` E2E Tests:
  - [ ] `backup-flow.e2e.test.ts` → Vollständiger Export/Import Zyklus

---

### 📦 PAKET 12: [AGENT: WEATHER] - Wetterdaten Integration

**Ziel:** Tägliche Wetterdaten abrufen und für Korrelationsanalyse speichern.

**🏷️ Execution Mode:** `[🌤️ SEQUENTIAL]` (Neue Feature-Schicht)

**🤖 Sub-Agent Strategy:**

- `subagent-api` → Weather API Client
- `subagent-sync` → Daily Sync Service
- `subagent-analytics` → Korrelationen
- **Sync Point:** API → Sync → Analytics

**API Empfehlung:** Open-Meteo (kostenlos, keine API Key nötig)

**Todo-Liste:**

- [ ] `[💾 SEQ]` **DB Schema erweitern** `src/lib/db.ts`
  - [ ] Neue Tabelle `weatherData`:
    ```typescript
    interface WeatherData {
      date: string; // YYYY-MM-DD (Primary Key)
      location?: {
        lat: number;
        lon: number;
        name: string;
      };
      temperature: {
        min: number; // °C
        max: number;
        avg: number;
      };
      humidity: number; // %
      pressure: number; // hPa (Luftdruck - wichtig für Migräne!)
      pressureChange?: number; // hPa Änderung zum Vortag
      precipitation: number; // mm
      cloudCover: number; // %
      windSpeed: number; // km/h
      uvIndex?: number;
      weatherCode: number; // WMO Weather Code
      weatherDescription: string; // "Sonnig", "Bewölkt", etc.
      syncedAt: string;
    }
    ```
  - [ ] DB Migration Version 5
  - [ ] Index auf `date` und `pressure`
- [ ] `[🌤️ SEQ]` **Weather API Client** `src/lib/weather/client.ts`
  - [ ] Open-Meteo API Integration (https://open-meteo.com/)
  - [ ] `getWeatherForDate(date, lat, lon)` → Historical Data
  - [ ] `getWeatherForecast(lat, lon)` → 7-Day Forecast
  - [ ] Mapping: WMO Weather Code → Deutsche Beschreibung
  - [ ] Kein API Key erforderlich (Rate Limit: 10.000/day)
- [ ] `[🌤️ SEQ]` **Location Service** `src/lib/weather/location-service.ts`
  - [ ] `@capacitor/geolocation` für aktuelle Position
  - [ ] Standort in Settings speichern (einmalige Abfrage)
  - [ ] Fallback: Manuelle Stadt-Eingabe
  - [ ] Geocoding: Stadt → Koordinaten
- [ ] `[🌤️ SEQ - DEPENDS: client]` **Weather Sync Service** `src/lib/weather/sync-service.ts`
  - [ ] `syncTodayWeather()` → Heutiges Wetter abrufen
  - [ ] `syncMissingWeather(dateRange)` → Historische Daten nachholen
  - [ ] Auto-Sync: Täglich 1x (morgens oder bei App-Start)
  - [ ] Luftdruck-Änderung berechnen (delta zum Vortag)
- [ ] `[🌤️ PARALLEL]` **Weather Display** `src/features/weather/WeatherCard.tsx`
  - [ ] Aktuelle Wetterdaten auf Dashboard
  - [ ] Wetter-Icon basierend auf Code
  - [ ] Luftdruck-Trend Anzeige (↑ steigend, ↓ fallend)
  - [ ] "Migräne-Wetter-Warnung" bei Druckabfall >10hPa
- [ ] `[📊 PARALLEL - DEPENDS: sync]` **Korrelations-Engine erweitern** `src/features/analytics/correlation-service.ts`
  - [ ] `analyzePressureCorrelation()` → "Bei Druckabfall >10hPa: X% mehr Episoden"
  - [ ] `analyzeTemperatureCorrelation()` → "Bei >30°C: X% mehr Episoden"
  - [ ] `analyzeHumidityCorrelation()` → "Bei >80% Luftfeuchtigkeit..."
  - [ ] `analyzeWeatherCodeCorrelation()` → "Bei Gewitter: X% mehr Episoden"
  - [ ] Multi-Faktor Analyse: Kombinierte Wetter-Bedingungen
- [ ] `[📊 PARALLEL]` **Weather Charts** `src/features/analytics/WeatherCharts.tsx`
  - [ ] Luftdruck-Timeline mit Episode-Markern
  - [ ] Wetter-Trigger Pie Chart
  - [ ] Temperatur-Episode Scatter Plot
- [ ] `[🎨 PARALLEL]` **Settings erweitern:**
  - [ ] Standort festlegen
  - [ ] Wetter-Sync ein/aus
  - [ ] "Wetterdaten löschen" Button
- [ ] `[🧪 PARALLEL]` Unit Tests:
  - [ ] `weather-client.test.ts` → API Mocking
  - [ ] `weather-correlation.test.ts` → Statistical Logic
- [ ] `[🧪 PARALLEL]` Integration Tests:
  - [ ] `weather-sync.integration.test.ts` → Full Sync Flow

---

## 4. Ausführungs-Reihenfolge

**Phase 1: Foundation (Sequenziell)**

1.  **PAKET 1 (Architect)** → Setup & Infrastruktur
2.  **PAKET 2 (Database)** → Datenbank & Encryption

**Phase 2: Core Features (Parallel)** 3. **PAKET 3 (UI-Core)** & **PAKET 4 (Garmin)** → Parallel möglich 4. **PAKET 5 (Analytics)** → Nach 2, 3, 4 5. **PAKET 6 (MCP-Server)** → Parallel zu allem, aber Tests erst nach Core-Features

**Phase 3: Enhanced Features (Nach Phase 2)** 6. **PAKET 7 (Garmin-Real)** → Echte Garmin API (nach PAKET 4) 7. **PAKET 8 (Symptoms)** & **PAKET 9 (Intensity-History)** & **PAKET 10 (Night-Onset)** → Parallel möglich 8. **PAKET 11 (Backup-Consolidation)** → UI Cleanup (nach PAKET 5) 9. **PAKET 12 (Weather)** → Neue Feature-Schicht (nach PAKET 5)

---

## 5. Technische Details & Best Practices

### Datenbank Schema (Vollständig)

```typescript
// src/lib/db.ts
export interface Episode {
  id?: number;
  startTime: Date;
  endTime?: Date;
  intensity: number; // 1-10
  triggers: string[]; // ["stress", "weather", "caffeine"]
  medicines: string[]; // ["ibuprofen 400mg", "sumatriptan"]
  symptoms: {
    nausea: boolean;
    photophobia: boolean;
    phonophobia: boolean;
    aura: boolean;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GarminData {
  date: string; // YYYY-MM-DD (Primary Key)
  sleepScore?: number;
  sleepStages?: {
    deep: number; // minutes
    light: number;
    rem: number;
    awake: number;
  };
  stressLevel?: {
    average: number; // 0-100
    max: number;
  };
  restingHR?: number;
  maxHR?: number;
  hrv?: number;
  bodyBattery?: {
    charged: number;
    drained: number;
    current: number;
  };
  steps?: number;
  hydration?: number; // ml
  respirationRate?: number; // breaths per minute
  syncedAt: Date;
}

export interface Log {
  id?: number;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: any; // JSON
}

export interface Setting {
  key: string; // Primary Key
  value: any; // JSON
}
```

### Encryption Details

- **DB Encryption:** `dexie-encrypted` nutzt Web Crypto API
- **Key Derivation:** PBKDF2 mit 100.000 Iterationen
- **PIN Hash:** SHA-256, Salt stored in Preferences
- **Backup Format:**
  ```json
  {
    "version": "1.0.0",
    "encrypted": true,
    "algorithm": "AES-GCM",
    "iv": "base64...",
    "data": "base64..."
  }
  ```

### Garmin API Notes (python-garminconnect Details)

- **Base URL:** `https://connect.garmin.com`
- **API Paths:**
  - Modern Proxy: `/modern/proxy/` (empfohlen)
  - Connect API: `/connectapi/`
  - Service-spezifisch: `/wellness-service/`, `/hrv-service/`, `/usersummary-service/`
- **Auth:** OAuth1 + OAuth2 Token Flow (via garth Library)
  - Token Storage: JSON mit oauth1_token und oauth2_token
  - Session Cookie: JSESSIONID (Legacy, nicht mehr primär)
  - Profile Daten: displayName, fullName aus `/userprofile-service/userprofile`
- **Rate Limits:** ~120 requests/minute
- **Session Lifetime:** ~24 Stunden (Token Refresh erforderlich)
- **CORS:** Nutze `@capacitor-community/http` statt Browser `fetch`
- **Error Codes:**
  - 400: Bad Request → Feature nicht aktiviert/verfügbar
  - 401: Unauthorized → Token expired, Re-Login
  - 403: Forbidden → Zugriff verweigert, Re-Login
  - 429: Too Many Requests → Rate Limit, exponential backoff
- **Date Format:** YYYY-MM-DD (ISO 8601)
- **Unit System:** Metric/Imperial aus User Settings
- **MFA Support:** Two-Phase Login mit `return_on_mfa=True`
- **Testing:** VCR (Video Cassette Recorder) Pattern für API Mocks
- **Referenz-Implementierungen:**
  - `example.py`: Basic Authentication + Token Storage
  - `demo.py`: 105+ API Methods in 12 Kategorien
  - `garminconnect/__init__.py`: Garmin Class mit allen Endpoints

### Testing Strategy

- **Unit Tests:** Core Logic, Services, Utils (80%+ Coverage)
- **Integration Tests:** DB + Garmin Sync Flows
- **E2E Tests:** Critical User Journeys (Login, Episode Entry, Sync)
- **Visual Regression:** Optional mit Playwright Screenshots

---

## 6. Daten-Retention & Archivierung

```typescript
// src/lib/archive-service.ts
export async function archiveOldData() {
  const twoYearsAgo = subYears(new Date(), 2);
  const oldEpisodes = await db.episodes
    .where('startTime')
    .below(twoYearsAgo)
    .toArray();

  await db.archivedEpisodes.bulkAdd(oldEpisodes);
  await db.episodes.where('startTime').below(twoYearsAgo).delete();
}
```

Wird automatisch bei App-Start im `App.tsx` `useEffect` aufgerufen.

---

## 7. Anweisung an die KI

Wenn du dieses Projekt umsetzt:

1. Arbeite Paket für Paket ab (siehe Ausführungs-Reihenfolge & Multi-Agent Strategy).
2. Markiere erledigte Todos in dieser Datei mit `[x]`.
3. Erstelle nach jedem Paket einen kurzen Status-Report.
4. **Dokumentation:** Erstelle nach jedem Arbeitsschritt eine Dokumentation im Ordner `/docu`:
   - Dateiname: `PAKET_X_[Name]_[Datum].md` (z.B. `PAKET_1_Setup_2026-01-04.md`)
   - Inhalt: Was wurde gemacht, welche Files erstellt/geändert, bekannte Issues, nächste Schritte
   - Code-Beispiele und wichtige Entscheidungen dokumentieren
5. **Automatisierte Commits:** Erstelle nach jedem abgeschlossenen Arbeitsschritt automatisch einen Git-Commit:
   - Format: Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, etc.)
   - Beispiel: `feat(database): implement encrypted dexie schema with migrations`
   - Nutze `run_in_terminal` für: `git add . && git commit -m "..."`
6. **Entscheidungsfragen:** Bei Unklarheiten oder Entscheidungspunkten:
   - Präsentiere immer **3 Lösungsoptionen** mit Vor-/Nachteilen
   - Gib eine **klare Empfehlung** basierend auf den Projekt-Entscheidungen
   - Beispiel: "Für DB-Verschlüsselung gibt es 3 Optionen: A) dexie-encrypted (empfohlen), B) CryptoJS, C) Native Keychain. Empfehlung: A, weil..."
7. Nutze MCP Server Tools für Testing & Debugging.
8. Code-Style: ESLint + Prettier, TypeScript strict mode.
9. **Multi-Agent Orchestration:** Nutze `runSubagent` für parallele Tasks (siehe Sektion 8).

---

## 8. Multi-Agent Orchestration Strategy

### 🎯 Orchestration Prinzipien

**Koordination:**

- **Main Agent (Orchestrator):** Koordiniert alle Sub-Agents, verwaltet Dependencies, merged Results
- **Sub-Agents (Workers):** Spezialisiert auf spezifische Tasks, unabhängig von anderen Agents
- **Sync Points:** Nach jedem Paket erfolgt ein Merge und Review durch Main Agent

**Parallelisierung:**

- Tasks mit `[PARALLEL]` können gleichzeitig von mehreren Agents bearbeitet werden
- Tasks mit `[SEQUENTIAL]` müssen nacheinander abgearbeitet werden
- Tasks mit `[DEPENDS: X]` benötigen Completion von Task X

**Agent Types:**

- 🏗️ **ARCHITECT:** Setup, Infrastruktur, Config
- 💾 **DATABASE:** Datenmodell, Schema, Services
- 🎨 **UI-CORE:** Components, Pages, User Flows
- 🔗 **GARMIN:** API Integration, Sync Logic
- 📊 **ANALYTICS:** Charts, Korrelationen, Statistics
- 🧪 **MCP-SERVER:** Testing Tools, Mocks, CI/CD

---

### 📋 Dependency Graph

```
PAKET 1 (ARCHITECT) [SEQUENTIAL - Blocking]
         ↓
PAKET 2 (DATABASE) [SEQUENTIAL - Blocking]
         ↓
    ┌────┴────┐
PAKET 3     PAKET 4     PAKET 6
(UI-CORE)   (GARMIN)    (MCP-SERVER)
[PARALLEL]  [PARALLEL]  [PARALLEL - Non-Blocking]
    └────┬────┘
         ↓
PAKET 5 (ANALYTICS) [SEQUENTIAL - Requires 2,3,4]
```

---

### 🚀 Multi-Agent Execution Plan

#### Phase 1: Foundation (Sequenziell)

**Main Agent:** ARCHITECT

- **Goal:** Lauffähiges Basis-Setup
- **Sub-Agents:** KEINE (zu kritisch für Parallelisierung)
- **Duration:** ~2-3h
- **Blocking:** Ja (alles wartet auf Completion)

#### Phase 2: Core Infrastructure (Sequenziell)

**Main Agent:** DATABASE

- **Goal:** DB Schema, Encryption, Core Services
- **Sub-Agents:**
  - `subagent-tests` → Unit Tests parallel zur Implementierung
- **Duration:** ~3-4h
- **Blocking:** Ja (UI/Garmin benötigen DB)

#### Phase 3: Features (Parallel)

**Main Agents:** UI-CORE, GARMIN, MCP-SERVER (gleichzeitig)

- **Sub-Agent Strategy:**

  **UI-CORE Agent:**
  - `subagent-pin-flow` → PIN Setup + Unlock (parallel)
  - `subagent-episode-form` → Episode Form + Validation (parallel)
  - `subagent-dashboard` → Dashboard + List View (parallel)
  - Sync Point: Alle 3 Sub-Agents müssen fertig sein

  **GARMIN Agent:**
  - `subagent-auth` → Login + Token Management
  - `subagent-endpoints` → API Endpoints (parallel nach Auth)
    - `worker-sleep` → Sleep Endpoints
    - `worker-stress` → Stress Endpoints
    - `worker-hr` → Heart Rate Endpoints
    - `worker-misc` → Hydration, Respiration, SpO2
  - `subagent-sync` → Sync Service (nach Endpoints)

  **MCP-SERVER Agent:**
  - Läuft komplett parallel, kein Blocking
  - `subagent-tools` → MCP Tools Implementation
  - `subagent-mocks` → Mock Data Generators

- **Duration:** ~6-8h (parallel, nicht sequenziell)
- **Blocking:** Nur für Phase 4

#### Phase 4: Analytics (Sequenziell)

**Main Agent:** ANALYTICS

- **Goal:** Charts, Korrelationen, Backup
- **Sub-Agents:**
  - `subagent-charts` → Recharts Implementation (parallel)
  - `subagent-correlations` → Statistical Analysis (parallel)
  - `subagent-backup` → Export/Import (parallel)
- **Duration:** ~4-5h
- **Blocking:** Nein (Projekt-Ende)

---

### 🏷️ Task Tagging System

**Format:** `[TYPE] [PARALLEL/SEQUENTIAL] [DEPENDS: X,Y]`

**Beispiele:**

- `[🏗️ SEQUENTIAL]` → Muss nacheinander, keine Parallelisierung
- `[🎨 PARALLEL]` → Kann parallel bearbeitet werden
- `[💾 PARALLEL - DEPENDS: db.ts]` → Parallel, aber nach db.ts
- `[🧪 NON-BLOCKING]` → Kann jederzeit parallel laufen

---

### 🤖 Sub-Agent Invocation Pattern

**Wann Sub-Agent verwenden:**

1. **File Independence:** Task erstellt/editiert unterschiedliche Files
2. **No Shared State:** Keine Race Conditions möglich
3. **Clear Interface:** Eindeutige Input/Output Definition
4. **Completion Criteria:** Klare Definition von "Done"

**Wann NICHT:**

1. Shared Files (z.B. beide editieren `db.ts`)
2. Komplexe Dependencies (A benötigt Output von B)
3. State Management (Zustand muss synchron sein)

**Sub-Agent Prompt Template:**

```markdown
## Sub-Agent Task: [Name]

**Goal:** [Einzeiliges Ziel]

**Scope:**

- Create Files: [Liste]
- Edit Files: [Liste]
- Dependencies: [Was muss existieren]

**Acceptance Criteria:**

1. [Kriterium 1]
2. [Kriterium 2]

**Output Format:**

- Return: [Was zurückgeben]
- Commit: [Commit Message Format]
- Tests: [Test Coverage]

**Context:**
[Relevante Infos aus PROJECT_PLAN]
```

**Main Agent Merge Process:**

1. Warte auf alle Sub-Agents
2. Review Code via `read_file`
3. Check for Conflicts (gleiche Files editiert?)
4. Run Tests: `npm test`
5. Merge Commits oder Cherry-Pick
6. Status Update an User

---

### 📊 Parallelization Matrix

| Paket     | Phase                | Parallele Tasks                   | Sub-Agents | Duration (Solo) | Duration (Parallel) |
| --------- | -------------------- | --------------------------------- | ---------- | --------------- | ------------------- |
| 1         | Foundation           | 0                                 | 0          | 2-3h            | 2-3h                |
| 2         | Core                 | 1 (Tests)                         | 1          | 3-4h            | 3-4h                |
| 3         | Features (UI)        | 3 (PIN, Form, Dashboard)          | 3          | 4-5h            | 2-3h                |
| 4         | Features (Garmin)    | 5 (Auth, 4 Endpoint Groups, Sync) | 5          | 6-8h            | 3-4h                |
| 5         | Analytics            | 3 (Charts, Corr, Backup)          | 3          | 4-5h            | 2-3h                |
| 6         | MCP                  | 2 (Tools, Mocks)                  | 2          | 2-3h            | 1-2h                |
| 7         | Garmin Real API      | 3 (Auth, Endpoints, Sync)         | 3          | 5-7h            | 3-4h                |
| 8         | Symptoms             | 2 (Schema, UI)                    | 2          | 3-4h            | 2-3h                |
| 9         | Intensity History    | 2 (Schema, UI)                    | 2          | 2-3h            | 1-2h                |
| 10        | Night Onset          | 0                                 | 0          | 1-2h            | 1-2h                |
| 11        | Backup Consolidation | 0                                 | 0          | 1-2h            | 1-2h                |
| 12        | Weather              | 3 (API, Sync, Analytics)          | 3          | 5-6h            | 3-4h                |
| **Total** | -                    | **24**                            | **24**     | **38-53h**      | **24-34h**          |

**Speedup:** ~35-40% durch Parallelisierung

---

### 🔄 Automated Multi-Agent Workflow

**Main Agent Script Pseudocode:**

```typescript
async function executePackage3() {
  // Launch parallel sub-agents
  const agents = [
    runSubagent(
      'Implement PIN Setup Flow (PinSetup.tsx, PinUnlock.tsx)',
      'pin-flow'
    ),
    runSubagent('Implement Episode Form with react-hook-form', 'episode-form'),
    runSubagent('Implement Dashboard with Charts', 'dashboard'),
  ];

  // Wait for all
  const results = await Promise.all(agents);

  // Merge & Review
  await reviewCode(results);
  await runTests();
  await commitMerge(
    'feat(ui): implement PIN flow, episode form, and dashboard'
  );

  // Status Report
  reportStatus('PAKET 3 Complete', results);
}
```

---

### ⚠️ Conflict Resolution

**Conflict Types:**

1. **File Conflicts:** Zwei Agents editieren gleiche Datei
   - **Prevention:** Assign Files exklusiv
   - **Resolution:** Manual Merge via Main Agent
2. **Dependency Conflicts:** Agent B braucht Output von Agent A
   - **Prevention:** Dependency Graph einhalten
   - **Resolution:** Sequential Execution

3. **Schema Conflicts:** DB Schema Änderungen
   - **Prevention:** PAKET 2 muss komplett fertig sein
   - **Resolution:** Migration Script

**Best Practices:**

- Jeder Sub-Agent commitet auf eigenen Branch: `agent/pin-flow`, `agent/episode-form`
- Main Agent merged in `main`
- Bei Konflikt: Main Agent entscheidet

---

### 🎯 Success Metrics

**KPIs für Multi-Agent Execution:**

- **Parallelization Rate:** Anzahl parallel laufender Agents / Gesamt-Agents
- **Conflict Rate:** Anzahl Merge Conflicts / Gesamt Merges
- **Speedup Factor:** Solo Duration / Parallel Duration
- **Test Pass Rate:** % Tests die nach Merge grün sind

**Target:**

- Parallelization: >50%
- Conflict Rate: <10%
- Speedup: >30%
- Test Pass: >95%
