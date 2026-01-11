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
- [x] **Phase 2: Validation & Testing** - Verify data flows correctly on Android
- [x] **Phase 3: Python Fallback** - SKIPPED (TypeScript fix sufficient)

## Phase Details

### Phase 1: API Endpoint Fix
**Goal**: Change API base URL from `connect.garmin.com/modern/proxy/` to `connectapi.garmin.com/` and update all endpoint paths to match garth reference implementation
**Depends on**: Nothing (first phase)
**Research**: Complete (verified paths from garth library)
**Plans**: 1 plan

Plans:
- [x] 01-01: Fix constants.ts endpoints + add vite proxy

### Phase 2: Validation & Testing
**Goal**: Fix Sleep Score, HRV, SpO2, and Hydration parsing/endpoints based on garth reference. Verify all metrics sync correctly on Android.
**Depends on**: Phase 1
**Research**: Complete (analyzed garth response structures)
**Plans**: 2 plans

Plans:
- [x] 02-01: Fix Sleep Score, SpO2, HRV parsing (response structure mismatch)
- [x] 02-02: Fix Hydration endpoint + Android verification

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
| 2. Validation & Testing | 2/2 | Complete | 2026-01-11 |
| 3. Python Fallback | - | Skipped | 2026-01-11 |
