# Roadmap: Migraine Tracker

## Milestones

- ✅ **v1.0 Garmin Data Fix** - Phases 1-3 (shipped 2026-01-11)
- 🚧 **v1.1 UX & Features** - Phases 4-9 (in progress)

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

<details>
<summary>✅ v1.0 Garmin Data Fix (Phases 1-3) - SHIPPED 2026-01-11</summary>

### Phase 1: API Endpoint Fix
**Goal**: Change API base URL from `connect.garmin.com/modern/proxy/` to `connectapi.garmin.com/`
**Plans**: 1 plan

Plans:
- [x] 01-01: Fix constants.ts endpoints + add vite proxy

### Phase 2: Validation & Testing
**Goal**: Fix Sleep Score, HRV, SpO2, and Hydration parsing/endpoints
**Plans**: 2 plans

Plans:
- [x] 02-01: Fix Sleep Score, SpO2, HRV parsing
- [x] 02-02: Fix Hydration endpoint + Android verification

### Phase 3: Python Fallback
**Goal**: Integrate garth Python library if TypeScript fix insufficient
**Status**: SKIPPED (TypeScript fix sufficient)

</details>

### 🚧 v1.1 UX & Features (In Progress)

**Milestone Goal:** Improve UX, add auto-sync, analytics, and Dropbox export

- [x] **Phase 4: Settings Consolidation** - Alle Einstellungen unter Settings vereinen
- [x] **Phase 5: UI Mobile Polish** - Mobile-Optimierung, Overflow-Fixes
- [x] **Phase 6: GPS Fix** - Android Standort-Problem beheben
- [x] **Phase 7: Auto Sync** - Automatischer Garmin & Wetter Sync beim App-Start
- [x] **Phase 8: Analytics Enhancement** - Korrelationen verbessern (UI + Logik)
- [ ] **Phase 9: Dropbox Export** - Verschlüsselter Auto-Export zu Dropbox

## Phase Details

### Phase 4: Settings Consolidation ✅
**Goal**: Alle Einstellungen, Sync-Optionen und Logins zentral unter Settings sammeln
**Depends on**: Nothing (first phase of v1.1)
**Status**: Complete
**Plans**: 2 plans

Scope:
- Settings/Sync/Login alle unter Einstellungen verschieben
- Garmin Connect: E-Mail statt Nummer anzeigen
- Garmin-Verbindung nur noch unter Einstellungen
- Manueller Re-Sync Button in Einstellungen

Plans:
- [x] 04-01: Create GarminSettings component, integrate into Settings
- [x] 04-02: Simplify GarminPage to pure data viewer

### Phase 5: UI Mobile Polish ✅
**Goal**: Mobile-First Optimierung, Overflow-Probleme beheben
**Depends on**: Phase 4
**Status**: Complete
**Plans**: 1 plan

Scope:
- Icons/Schriften die über Box-Ränder ragen fixen
- Responsive Design für Handy optimieren
- Konsistente Spacing/Padding

Plans:
- [x] 05-01: Fix mobile layouts for CorrelationInsights, Dashboard, EpisodeForm

### Phase 6: GPS Fix ✅
**Goal**: Android Standort-Fehler beheben ("Standort konnte nicht erstellt werden")
**Depends on**: Phase 5 (UI ready)
**Status**: Complete
**Plans**: 1 plan

Scope:
- GPS-Fehler auf Android diagnostizieren
- Capacitor Geolocation korrekt implementieren
- Android Permissions richtig handhaben

Plans:
- [x] 06-01: Install Capacitor Geolocation + update location-service.ts

### Phase 7: Auto Sync ✅
**Goal**: Automatischer Sync von Garmin & Wetter Daten beim App-Start
**Depends on**: Phase 6
**Status**: Complete
**Plans**: 1 plan

Scope:
- Auto-Sync Service für App-Start
- Settings UI mit Toggle und Status
- Toast-Benachrichtigung bei erfolgreichem Sync

Plans:
- [x] 07-01: Auto-sync service + Settings UI + App integration

### Phase 8: Analytics Enhancement ✅
**Goal**: Korrelationen verbessern - UI prominenter, Logik robuster
**Depends on**: Phase 7
**Status**: Complete
**Plans**: 1 plan

Scope:
- Korrelationen in Übersicht nach vorne
- Mehr Korrelationen abdecken
- Keine Korrelationen bei 0-Werten bilden
- Genauere Darstellung der Korrelationen

Plans:
- [x] 08-01: 0-value filtering, new correlations, TopInsights component, confidence badges

### Phase 9: Dropbox Export
**Goal**: Verschlüsselter Auto-Export der Daten zu Dropbox
**Depends on**: Phase 8
**Research**: Likely (Dropbox API + Encryption)
**Research topics**: Dropbox API v2, OAuth2 für Dropbox, Client-side Encryption (Web Crypto API)
**Plans**: TBD

Scope:
- Dropbox OAuth2 Integration
- Daten verschlüsselt exportieren
- Auto-Export Funktion
- Export-Einstellungen in Settings

Plans:
- [ ] 09-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 4 → 5 → 6 → 7 → 8 → 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. API Endpoint Fix | v1.0 | 1/1 | Complete | 2026-01-11 |
| 2. Validation & Testing | v1.0 | 2/2 | Complete | 2026-01-11 |
| 3. Python Fallback | v1.0 | - | Skipped | 2026-01-11 |
| 4. Settings Consolidation | v1.1 | 2/2 | Complete | 2026-01-11 |
| 5. UI Mobile Polish | v1.1 | 1/1 | Complete | 2026-01-12 |
| 6. GPS Fix | v1.1 | 1/1 | Complete | 2026-01-12 |
| 7. Auto Sync | v1.1 | 1/1 | Complete | 2026-01-12 |
| 8. Analytics Enhancement | v1.1 | 1/1 | Complete | 2026-01-12 |
| 9. Dropbox Export | v1.1 | 0/? | Not started | - |
