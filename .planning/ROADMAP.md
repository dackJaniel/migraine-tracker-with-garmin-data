# Roadmap: Migraine Tracker - Garmin Data Fix

## Overview

Fix Garmin Connect API integration so health data (sleep, stress, HRV, body battery) syncs reliably to IndexedDB. The app currently authenticates successfully but API calls return HTML instead of JSON due to wrong endpoint URLs. Primary approach is fixing TypeScript endpoints; Python/garth integration available as fallback.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: API Endpoint Fix** - Update endpoints to use connectapi.garmin.com
- [ ] **Phase 2: Validation & Testing** - Verify data flows correctly on Android
- [ ] **Phase 3: Python Fallback** - Integrate garth library if TypeScript fix insufficient

## Phase Details

### Phase 1: API Endpoint Fix
**Goal**: Change API base URL from `connect.garmin.com/modern/proxy/` to `connectapi.garmin.com/` and update all endpoint paths to match garth reference implementation
**Depends on**: Nothing (first phase)
**Research**: Complete (verified paths from garth library)
**Plans**: 1 plan

Plans:
- [x] 01-01: Fix constants.ts endpoints + add vite proxy

### Phase 2: Validation & Testing
**Goal**: Test the fixed endpoints on Android device, verify all health metrics sync to IndexedDB correctly
**Depends on**: Phase 1
**Research**: Unlikely (testing existing functionality)
**Plans**: TBD

Plans:
- [ ] 02-01: Build, deploy to Android, test sync

### Phase 3: Python Fallback
**Goal**: If TypeScript fix doesn't work, integrate garth Python library as a backend service for reliable Garmin data fetching
**Depends on**: Phase 2 (only if TypeScript fix fails)
**Research**: Likely (Python/Capacitor integration patterns)
**Research topics**: Running Python in Capacitor app, garth library API, inter-process communication options
**Plans**: TBD

Plans:
- [ ] 03-01: Evaluate Python integration approach
- [ ] 03-02: Implement garth integration (if needed)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. API Endpoint Fix | 1/1 | Complete | 2026-01-11 |
| 2. Validation & Testing | 0/1 | Not started | - |
| 3. Python Fallback | 0/2 | Not started | - |
