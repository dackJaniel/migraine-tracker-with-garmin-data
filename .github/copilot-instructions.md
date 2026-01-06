## Copilot Instructions (dieses Repo)

Diese App ist eine deutschsprachige PWA (React + Vite) mit lokaler Dexie/IndexedDB, Garmin-Connect-Sync (OAuth1/OAuth2) und Wetterdaten. Wenn du Änderungen machst: halte den Scope klein (MVP), Light-Mode-only und nutze bestehende Patterns.

### Architektur & Datenflüsse
- Routing/Flows: [src/App.tsx](../src/App.tsx) nutzt react-router; „geschützte“ Routen laufen über PIN-Check in [src/components/ProtectedRoute.tsx](../src/components/ProtectedRoute.tsx) (redirect zu `/pin-setup` bzw. `/pin-unlock`).
- Persistenz: Schema/Migrationen + Helper in [src/lib/db.ts](../src/lib/db.ts). In DB werden Zeiten als ISO-Strings gespeichert (`startTime`, `createdAt`, `syncedAt`), Garmin/Weather als `yyyy-MM-dd` Keys.
- Logging: Persistente Debug-Logs laufen über `db.logs` (`addLog()` in [src/lib/db.ts](../src/lib/db.ts)); Garmin HTTP/Auth/Sync schreibt dort aktiv rein (wichtig fürs Debugging).

### Garmin-Integration (kritisch)
- Einstiegspunkt/Facade: [src/lib/garmin/client.ts](../src/lib/garmin/client.ts) → `auth.ts` + `http-client.ts` + `sync-service.ts`.
- Auf Android: Requests laufen über `CapacitorHttp` (CORS-Bypass) in [src/lib/garmin/http-client.ts](../src/lib/garmin/http-client.ts).
- In Web-Dev: Garmin-Aufrufe laufen über Vite-Proxies (`/api/garmin-sso`, `/api/garmin`, `/api/oauth-consumer`) in [vite.config.ts](../vite.config.ts) → keine direkten Cross-Origin Calls.
- Konvention: Garmin-Endpunkte nicht „raw“ ansprechen (kein direktes `fetch` auf Garmin Domains); verwende `garminClient`/`garminHttp` (OAuth-Signatur, Rate-Limit, Retry, Logging nach `db.logs`).

### Wetter-Integration
- Sync/Status werden über Settings/DB-Helper gespeichert: [src/lib/weather/sync-service.ts](../src/lib/weather/sync-service.ts) nutzt `getSetting/setSetting` und schreibt nach `db.weatherData`.

### UI-Konventionen
- UI: ShadCN-Komponenten in `src/components/ui/*`, Tailwind via Theme Tokens (keine neuen Hardcode-Farben/Themes). Toasts laufen über `sonner` (Toaster in [src/main.tsx](../src/main.tsx)).
- Strings: Deutsch hardcoded (kein i18n Layer).

### Dev-Workflows
- Dev/Build: `npm run dev`, `npm run build`, `npm run preview` (Scripts in [package.json](../package.json)).
- Tests: `npm test` (Vitest, `fake-indexeddb` Setup in [tests/setup.ts](../tests/setup.ts)), E2E: `npm run test:e2e` (Playwright, startet Dev-Server automatisch: [playwright.config.ts](../playwright.config.ts)).
- Debugging: Logs/Seed/Clear in Settings UI (siehe [src/pages/Settings.tsx](../src/pages/Settings.tsx)); Garmin-Sync UI in [src/pages/GarminSettings.tsx](../src/pages/GarminSettings.tsx).
- Autonomous Debug (VS Code): Projekt unterstützt einen vollautomatischen Debug-Loop (siehe [README.md](../README.md)).
- MCP-Tools (optional): eigenes Tooling in [mcp-server/README.md](../mcp-server/README.md) (DB-Inspect/Seed/Clear, Garmin-Mock, Test-Runner).
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

1. **PAKET 1:** Setup & Infrastruktur ✅
2. **PAKET 2:** Datenbank & Encryption ✅
3. **PAKET 3:** UI Core & PIN Setup ✅
4. **PAKET 4:** Garmin API Client & Sync ✅
5. **PAKET 5:** Analytics & Backup ✅
6. **PAKET 6:** MCP Server & Testing Tools ✅
7. **PAKET 7:** Garmin Real API ✅
8. **PAKET 8:** Erweiterte Symptome ✅
9. **PAKET 9:** Intensitätsverlauf ✅
10. **PAKET 10:** Nacht-Onset Tracking ✅
11. **PAKET 11:** Backup Konsolidierung ✅
12. **PAKET 12:** Wetter-Integration ✅
13. **PAKET 13:** Smart Correlations & Warnsystem 🔜

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
