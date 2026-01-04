# Migräne Tracker PWA - KI Kontext

## 📋 Projekt-Übersicht

**Typ:** Progressive Web App (PWA) für Migräne-Tracking mit Garmin-Integration  
**Status:** In Entwicklung (MVP Phase)  
**Sprache:** Deutsch (hardcoded)  
**Zielplattform:** Android (Capacitor) + Web

> **Wichtig:** Vollständige Spezifikationen in [PROJECT_PLAN.md](../PROJECT_PLAN.md)

---

## 🛠 Tech Stack

### Core

- **Framework:** React 18 + TypeScript (Vite)
- **UI:** TailwindCSS + ShadCN UI (Light Mode only)
- **Database:** Dexie.js (IndexedDB) + `dexie-encrypted` (AES-256)
- **State:** Zustand (global) + `dexie-react-hooks` (DB reactive)
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React
- **Charts:** Recharts
- **Dates:** date-fns

### Native Features

- **Mobile:** Capacitor (Android)
- **Storage:** `@capacitor/preferences` (Tokens, Settings)
- **HTTP:** `@capacitor-community/http` (CORS bypass für Garmin API)
- **Filesystem:** `@capacitor/filesystem` (Backups)

### Testing

- **Unit/Integration:** Vitest + Testing Library
- **E2E:** Playwright
- **MCP Server:** Custom Tools für DB-Inspektion, Garmin Mocks

---

## 🔐 Security Architecture

1. **Master-PIN:** 6-stellig, SHA-256 Hash in Preferences
2. **DB Encryption:** `dexie-encrypted` mit PBKDF2 Key Derivation (100k iterations)
3. **Backup Encryption:** WebCrypto API (AES-GCM, separates Passwort)
4. **Garmin Tokens:** OAuth1/OAuth2 in `@capacitor/preferences`

---

## 📊 Datenmodell

### Haupttabellen

```typescript
episodes: '++id, startTime, endTime, intensity, *triggers, *medicines';
garminData: 'date, sleepScore, stressLevel, restingHR, hrv, bodyBattery, steps';
logs: '++id, timestamp, level, message';
settings: 'key';
archivedEpisodes: '++id, startTime, endTime'; // 2-Jahre Retention
```

### Garmin Metriken (Maximal)

- Sleep (Score, Stages: deep/light/rem/awake)
- Stress (Average, Max)
- Heart Rate (Resting, Max, Zones)
- HRV (Last Night, Weekly Average)
- Body Battery (Charged, Drained, Current)
- Steps, Hydration, Respiration, SpO2

---

## 🏗 Projektstruktur

```
src/
├── components/ui/          # ShadCN Komponenten
├── features/               # Feature-Module
│   ├── episodes/          # Episode CRUD + Forms
│   ├── garmin/            # API Client + Sync Service
│   ├── analytics/         # Charts + Korrelationen
│   ├── auth/              # PIN Management
│   └── backup/            # Export/Import
├── lib/                   # Core Libraries
│   ├── db.ts             # Dexie Schema
│   ├── encryption.ts     # Crypto Utils
│   └── garmin/           # Garmin API Client
├── hooks/                 # Custom React Hooks
├── pages/                 # Route Components
├── store/                 # Zustand Stores
└── utils/                 # Helpers

tests/
├── unit/                  # Vitest Tests
├── e2e/                   # Playwright Tests
└── fixtures/              # Test Data

mcp-server/                # MCP Testing Tools
```

---

## 🎯 Code-Standards

### TypeScript

- **Strict Mode:** Aktiviert
- **Path Aliases:** `@/*` → `./src/*`
- **No Any:** Immer explizite Typen
- **Interfaces:** Für Datenstrukturen, Types für Unions

### React Patterns

- **Hooks:** Functional Components only
- **Props:** Destructuring mit TypeScript Interface
- **State:** Zustand für global, useState für lokal
- **Effects:** useEffect mit Dependency Array
- **Queries:** `useLiveQuery` für Dexie DB

### File Naming

- **Components:** PascalCase (z.B. `EpisodeForm.tsx`)
- **Utils:** kebab-case (z.B. `encryption-utils.ts`)
- **Tests:** `*.test.ts` oder `*.spec.ts`
- **Hooks:** `use-` Prefix (z.B. `use-episodes.ts`)

### Commit Messages

- **Format:** Conventional Commits
- **Types:** `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `style:`, `chore:`
- **Beispiel:** `feat(garmin): implement OAuth2 token refresh logic`

---

## 🔄 Garmin API Integration

**Basis:** `python-garminconnect` Patterns (SSO via garth)

### Authentication

- **OAuth:** OAuth1 + OAuth2 Token Flow
- **Session:** 24h Lifetime, Auto-Relogin bei 401/403
- **MFA:** Two-Phase Login Support
- **Storage:** Tokens in `@capacitor/preferences`

### API Endpoints

- **Base URL:** `https://connect.garmin.com/modern/proxy/`
- **CORS:** WICHTIG: `@capacitor-community/http` verwenden (nicht `fetch`)
- **Rate Limit:** ~120 requests/minute
- **Date Format:** YYYY-MM-DD (ISO 8601)

### Sync Strategy

- **Auto-Sync:** Bei App-Start wenn letzter Sync >24h
- **Range:** Von letzter DB-Entry bis heute
- **Error Handling:** 400 = Feature nicht verfügbar (graceful degradation)
- **Retry:** Max 1x bei Authentication Failures

---

## 🧪 Testing Guidelines

### Unit Tests (Vitest)

- **Coverage:** 80%+ für Services/Utils
- **Mocking:** `vi.mock()` für External Dependencies
- **DB:** In-Memory Dexie mit temporärer DB

### E2E Tests (Playwright)

- **Focus:** Critical User Journeys
- **Page Object Model:** Wiederverwendbare Locators
- **Data:** Seed-Script für Dummy-Daten

### MCP Server Tools

- `db-inspect`: IndexedDB auslesen
- `db-seed`: Test-Daten generieren
- `garmin-mock`: Garmin API simulieren

---

## 📝 Wichtige Konventionen

### Fehlerbehandlung

- **User-Facing:** Toast Notifications (ShadCN Toast)
- **Debug:** Log in `logs` Tabelle + Settings Debug View
- **Garmin Errors:** Graceful Degradation bei 400 (Feature unavailable)

### Formulare

- **Validation:** Zod Schema vor Submit
- **Feedback:** Inline Errors + Success Toast
- **Autosave:** Nicht im MVP, manuell speichern

### Dates

- **Storage:** ISO 8601 String in DB
- **Display:** `format(date, 'dd.MM.yyyy HH:mm')` (deutsch)
- **Timezone:** Local Time (keine UTC Conversion)

### Styling

- **Mobile First:** TailwindCSS Breakpoints (`sm:`, `md:`, `lg:`)
- **Spacing:** Konsistent mit TailwindCSS Scale (4, 8, 16, 24, 32px)
- **Colors:** Nutze ShadCN Theme Variables

---

## 🚀 Arbeitspakete (Siehe PROJECT_PLAN.md)

1. **PAKET 1:** Setup & Infrastruktur
2. **PAKET 2:** Datenbank & Encryption
3. **PAKET 3:** UI Core & PIN Setup
4. **PAKET 4:** Garmin API Client & Sync
5. **PAKET 5:** Analytics & Backup
6. **PAKET 6:** MCP Server & Testing Tools

**Aktueller Status:** Prüfe PROJECT_PLAN.md für abgeschlossene Todos

---

## ⚠️ Häufige Pitfalls

1. **CORS:** Niemals `fetch()` für Garmin API → Immer `@capacitor-community/http`
2. **Encryption:** Key Derivation aus PIN, nicht PIN direkt verwenden
3. **Dexie Queries:** Indizes erforderlich für `where()` Performance
4. **React Hook Form:** `Controller` für ShadCN Components (nicht `register()`)
5. **Date Handling:** Sekunden → Minuten Konversion bei Garmin Sleep Data
6. **TypeScript:** Strict Null Checks → Immer `?.` für optional fields

---

## 🆘 Bei Unklarheiten

1. **Check:** [PROJECT_PLAN.md](../PROJECT_PLAN.md) → Vollständige Spezifikation
2. **Garmin API:** Siehe Sektion 2 (python-garminconnect Dokumentation)
3. **Encryption:** Siehe Sektion 5 (Encryption Details)
4. **Architecture:** Siehe Sektion 2 (Technische Architektur)
5. **Multi-Agent Orchestration:** Siehe Sektion 8 (Parallelisierung & Sub-Agents)

**Entscheidungen treffen:**

- Präsentiere 3 Optionen mit Vor-/Nachteilen
- Gib klare Empfehlung basierend auf Projekt-Entscheidungen (Sektion 0)
- Dokumentiere Entscheidung in `/docu` Ordner

**Multi-Agent Execution:**

- Nutze `runSubagent` für parallele, unabhängige Tasks
- Beachte Task-Tags: `[PARALLEL]`, `[SEQUENTIAL]`, `[DEPENDS: X]`
- Koordiniere Sub-Agents über Sync Points
- Main Agent merged und reviewt alle Sub-Agent Results

---

**Letzte Aktualisierung:** 2026-01-04
