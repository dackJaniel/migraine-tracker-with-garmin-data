# 📚 Migräne Tracker PWA - Dokumentationsübersicht

**Letzte Aktualisierung:** 2026-01-05  
**Status:** ✅ MVP funktionsfähig auf Android installiert

---

## 🎯 Schnellnavigation

| Thema                      | Dokumentation                                                                              | Status            |
| -------------------------- | ------------------------------------------------------------------------------------------ | ----------------- |
| **Projekt-Setup**          | [PAKET_1_Setup_Infrastruktur_2026-01-05.md](PAKET_1_Setup_Infrastruktur_2026-01-05.md)     | ✅ Abgeschlossen  |
| **Datenbank & Encryption** | [PAKET_2_Datenbank_Encryption_2026-01-05.md](PAKET_2_Datenbank_Encryption_2026-01-05.md)   | ✅ Abgeschlossen  |
| **UI Core & PIN**          | [PAKET_3_UI_Core_2026-01-05.md](PAKET_3_UI_Core_2026-01-05.md)                             | ✅ Abgeschlossen  |
| **Garmin API**             | [PAKET_4_Garmin_API_2026-01-05.md](PAKET_4_Garmin_API_2026-01-05.md)                       | ✅ MVP (Stubs)    |
| **Analytics & Backup**     | [PAKET_5_Analytics_Backup_2026-01-05.md](PAKET_5_Analytics_Backup_2026-01-05.md)           | ✅ Abgeschlossen  |
| **MCP Server & Testing**   | [PAKET_6_MCP_Server_Testing_2026-01-05.md](PAKET_6_MCP_Server_Testing_2026-01-05.md)       | ✅ Abgeschlossen  |
| **Erweiterte Symptome**    | [PAKET_8_Erweiterte_Symptome_2026-01-05.md](PAKET_8_Erweiterte_Symptome_2026-01-05.md)     | ✅ Abgeschlossen  |
| **Intensitäts-Verlauf**    | [PAKET_9_Intensity_History_2026-01-05.md](PAKET_9_Intensity_History_2026-01-05.md)         | ✅ Abgeschlossen  |
| **Night-Onset Tracking**   | [PAKET_10_Night_Onset_2026-01-05.md](PAKET_10_Night_Onset_2026-01-05.md)                   | ✅ Abgeschlossen  |
| **Backup-Konsolidierung**  | [PAKET_11_Backup_Consolidation_2026-01-05.md](PAKET_11_Backup_Consolidation_2026-01-05.md) | ✅ Abgeschlossen  |
| **Wetter-Integration**     | [PAKET_12_Weather_Integration_2026-01-05.md](PAKET_12_Weather_Integration_2026-01-05.md)   | ✅ Abgeschlossen  |
| **Episode Form**           | [Episode_Form_Implementation_2026-01-05.md](Episode_Form_Implementation_2026-01-05.md)     | ✅ Abgeschlossen  |
| **Android Build & Deploy** | [ANDROID_BUILD_DEPLOYMENT.md](ANDROID_BUILD_DEPLOYMENT.md)                                 | ✅ Funktionsfähig |
| **Multi-Agent Strategie**  | [MULTI_AGENT_STRATEGY_2026-01-04.md](MULTI_AGENT_STRATEGY_2026-01-04.md)                   | 📖 Referenz       |

---

## 📱 Aktueller Deployment Status

### ✅ Android Build & Installation erfolgreich

- **Build-Tool:** Android Studio (Local Build)
- **Installation:** Via ADB auf physischem Android Gerät
- **Capacitor Sync:** `npx cap sync android`
- **APK Output:** `android/app/build/outputs/apk/debug/app-debug.apk`

### Build-Befehle

```bash
# 1. Web-Assets bauen
npm run build

# 2. Capacitor synchronisieren
npx cap sync android

# 3. Android Studio öffnen
npx cap open android

# 4. In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
# Oder: Run → Run 'app' (bei verbundenem Gerät)
```

### ADB Installation

```bash
# APK installieren
adb install android/app/build/outputs/apk/debug/app-debug.apk

# App starten
adb shell am start -n com.example.migrainetracker/.MainActivity
```

---

## 🏗️ Projektstruktur

```
/home/daniel/Desktop/garmin/
├── 📁 src/                          # Quellcode
│   ├── 📁 components/               # UI Komponenten
│   │   ├── 📁 ui/                   # ShadCN UI Komponenten
│   │   ├── ErrorBoundary.tsx        # Error Handling
│   │   ├── Layout.tsx               # App Layout
│   │   └── ProtectedRoute.tsx       # Route Guard (PIN)
│   ├── 📁 features/                 # Feature Module
│   │   ├── 📁 analytics/            # Charts & Korrelationen
│   │   ├── 📁 auth/                 # PIN Service
│   │   ├── 📁 backup/               # Export/Import
│   │   ├── 📁 episodes/             # Episode Management
│   │   └── 📁 weather/              # Wetterdaten
│   ├── 📁 hooks/                    # Custom React Hooks
│   ├── 📁 lib/                      # Core Libraries
│   │   ├── 📁 garmin/               # Garmin API Client
│   │   ├── 📁 weather/              # Weather API Client
│   │   ├── db.ts                    # Dexie Database
│   │   ├── encryption.ts            # Crypto Utils
│   │   └── seed.ts                  # Test Data Generator
│   ├── 📁 pages/                    # Route Pages
│   │   ├── Analytics.tsx            # Statistiken & Charts
│   │   ├── Dashboard.tsx            # Hauptansicht
│   │   ├── GarminDataView.tsx       # Garmin Daten
│   │   ├── GarminSettings.tsx       # Garmin Einstellungen
│   │   ├── PinSetup.tsx             # Erstmalige PIN Einrichtung
│   │   ├── PinUnlock.tsx            # PIN Entsperrung
│   │   └── Settings.tsx             # App Einstellungen
│   └── 📁 store/                    # Zustand Stores
├── 📁 tests/                        # Tests
│   ├── 📁 unit/                     # Vitest Unit Tests
│   ├── 📁 e2e/                      # Playwright E2E Tests
│   └── 📁 fixtures/                 # Test Fixtures
├── 📁 mcp-server/                   # MCP Testing Server
│   ├── 📁 src/
│   │   ├── 📁 tools/                # MCP Tools
│   │   ├── 📁 generators/           # Mock Data Generators
│   │   └── 📁 mocks/                # Garmin API Mock
│   └── README.md                    # MCP Server Doku
├── 📁 android/                      # Capacitor Android Projekt
├── 📁 docu/                         # Diese Dokumentation
├── PROJECT_PLAN.md                  # Master-Projektplan
└── package.json
```

---

## 🔧 Technologie-Stack

| Kategorie      | Technologie             | Version    |
| -------------- | ----------------------- | ---------- |
| **Framework**  | React                   | 19.2.0     |
| **Build**      | Vite                    | 7.3.0      |
| **Sprache**    | TypeScript              | 5.8.3      |
| **UI**         | TailwindCSS + ShadCN UI | v4 / 3.6.2 |
| **Database**   | Dexie.js (IndexedDB)    | 4.2.1      |
| **Encryption** | dexie-encrypted         | 2.0.0      |
| **State**      | Zustand                 | Latest     |
| **Forms**      | React Hook Form + Zod   | Latest     |
| **Charts**     | Recharts                | Latest     |
| **Native**     | Capacitor               | 7.3.0      |
| **Testing**    | Vitest + Playwright     | Latest     |

---

## 📊 Feature-Übersicht

### ✅ Implementiert (MVP)

- [x] **PIN-Authentifizierung** - 6-stelliger PIN mit Fehlversuch-Limit
- [x] **Episode Tracking** - Erfassung von Migräne-Episoden
- [x] **Intensitäts-Slider** - 1-10 Skala mit Emoji-Feedback
- [x] **Trigger & Medikamente** - Multi-Select mit Custom Einträgen
- [x] **Erweiterte Symptome** - 13 vordefinierte + Custom Symptome
- [x] **Intensitäts-Verlauf** - Änderung während Episode dokumentieren
- [x] **Nacht-Tracking** - Erfassung ob Migräne nachts begann
- [x] **Garmin Integration** - API Client (MVP: Stubs)
- [x] **Wetter-Integration** - Open-Meteo API mit Korrelationen
- [x] **Analytics** - Charts, Statistiken, Korrelationen
- [x] **Backup/Export** - Verschlüsselter JSON Export
- [x] **MCP Server** - 21 Testing Tools

### 🔜 Geplant (Post-MVP)

- [ ] Echte Garmin API Synchronisation (PAKET 7)
- [ ] Biometrische Authentifizierung
- [ ] Push Notifications
- [ ] Dark Mode

---

## 🧪 Tests ausführen

```bash
# Unit Tests
npm test

# Unit Tests mit UI
npm run test:ui

# Coverage Report
npm run test:coverage

# E2E Tests
npm run test:e2e

# MCP Server starten (für Testing Tools)
cd mcp-server && npm start
```

### Test-Status

| Test Suite                    | Tests   | Status |
| ----------------------------- | ------- | ------ |
| `encryption.test.ts`          | 10      | ✅     |
| `db.test.ts`                  | 5       | ✅     |
| `symptom-service.test.ts`     | 14      | ✅     |
| `intensity-history.test.ts`   | 15      | ✅     |
| `night-onset.test.ts`         | 18      | ✅     |
| `garmin-client.test.ts`       | 7       | ✅     |
| `garmin-endpoints.test.ts`    | 7       | ✅     |
| `garmin-sync.test.ts`         | 7       | ✅     |
| `weather-client.test.ts`      | 11      | ✅     |
| `weather-correlation.test.ts` | 10      | ✅     |
| `correlation-service.test.ts` | 16      | ✅     |
| `backup-service.test.ts`      | 8       | ✅     |
| **Gesamt**                    | **128** | ✅     |

---

## 🔗 Wichtige Dateien für KI-Agenten

### Einstiegspunkte

| Datei                                                                 | Beschreibung                                |
| --------------------------------------------------------------------- | ------------------------------------------- |
| [PROJECT_PLAN.md](../PROJECT_PLAN.md)                                 | Master-Projektplan mit allen Arbeitspaketen |
| [.github/copilot-instructions.md](../.github/copilot-instructions.md) | KI-Kontext für Copilot                      |

### Core Libraries

| Datei                                                     | Beschreibung          |
| --------------------------------------------------------- | --------------------- |
| [src/lib/db.ts](../src/lib/db.ts)                         | Dexie Database Schema |
| [src/lib/encryption.ts](../src/lib/encryption.ts)         | Crypto Utilities      |
| [src/lib/garmin/client.ts](../src/lib/garmin/client.ts)   | Garmin API Client     |
| [src/lib/weather/client.ts](../src/lib/weather/client.ts) | Weather API Client    |

### Feature Services

| Datei                                                                                             | Beschreibung        |
| ------------------------------------------------------------------------------------------------- | ------------------- |
| [src/features/auth/pin-service.ts](../src/features/auth/pin-service.ts)                           | PIN Management      |
| [src/features/episodes/episode-service.ts](../src/features/episodes/episode-service.ts)           | Episode CRUD        |
| [src/features/episodes/symptom-service.ts](../src/features/episodes/symptom-service.ts)           | Custom Symptome     |
| [src/features/analytics/correlation-service.ts](../src/features/analytics/correlation-service.ts) | Korrelations-Engine |
| [src/features/backup/backup-service.ts](../src/features/backup/backup-service.ts)                 | Export/Import       |

### UI Components

| Datei                                                                                         | Beschreibung        |
| --------------------------------------------------------------------------------------------- | ------------------- |
| [src/features/episodes/EpisodeForm.tsx](../src/features/episodes/EpisodeForm.tsx)             | Episode Formular    |
| [src/features/episodes/SymptomSelector.tsx](../src/features/episodes/SymptomSelector.tsx)     | Symptom Auswahl     |
| [src/features/episodes/IntensityTimeline.tsx](../src/features/episodes/IntensityTimeline.tsx) | Intensitäts-Verlauf |
| [src/features/weather/WeatherCard.tsx](../src/features/weather/WeatherCard.tsx)               | Wetter Widget       |
| [src/features/weather/WeatherCharts.tsx](../src/features/weather/WeatherCharts.tsx)           | Wetter Charts       |

---

## 📝 Bekannte Issues & Workarounds

### 1. dexie-encrypted Kompatibilität

**Problem:** `dexie-encrypted@2.0.0` erwartet `dexie@^3.0.0`, aber wir nutzen `dexie@4.2.1`

**Workaround:** Installation mit `--legacy-peer-deps`

```bash
npm install dexie-encrypted --legacy-peer-deps
```

### 2. Capacitor Geolocation Plugin

**Problem:** Dependency-Konflikt mit dexie-encrypted

**Lösung:** Browser Geolocation API statt `@capacitor/geolocation` verwendet

### 3. Garmin API CORS

**Problem:** Browser blockiert Cross-Origin Requests zu Garmin Connect

**Lösung:** `@capacitor-community/http` nutzen (native HTTP ohne CORS)

---

## 🚀 Deployment Workflow

1. **Development**

   ```bash
   npm run dev
   ```

2. **Build**

   ```bash
   npm run build
   ```

3. **Android Sync**

   ```bash
   npx cap sync android
   ```

4. **Android Studio Build**
   - `npx cap open android`
   - Build → Build APK

5. **Installation**
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

---

## 📞 Support & Weiterentwicklung

Bei Fragen oder zur Weiterentwicklung:

1. **Projektplan prüfen:** [PROJECT_PLAN.md](../PROJECT_PLAN.md)
2. **KI-Kontext laden:** [.github/copilot-instructions.md](../.github/copilot-instructions.md)
3. **Paket-Dokumentation lesen:** Entsprechende `PAKET_X_*.md` Datei

---

_Diese Dokumentation wird automatisch bei Änderungen aktualisiert._
