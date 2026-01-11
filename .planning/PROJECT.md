# Migraine Tracker - Garmin Data Fix

**Created:** 2026-01-11
**Status:** Active

## Problem Statement

The Migraine Tracker Android app successfully authenticates with Garmin Connect (login + 2FA working), but fails to fetch actual health data. API calls return HTML error pages instead of JSON data.

**Root Cause Identified:**
- TypeScript implementation uses wrong API base URL
- Current: `https://connect.garmin.com/modern/proxy/wellness-service/...`
- Should be: `https://connectapi.garmin.com/wellness-service/...`
- The `/modern/proxy/` path requires browser session cookies, not OAuth2 Bearer tokens
- Reference implementation (garth Python library) confirms correct approach

## Core Goal

**Must work in v1:** Garmin health data reliably synced to IndexedDB
- Sleep data (score, duration, stages)
- Stress data (average, max, readings)
- Heart rate (resting HR)
- HRV (heart rate variability)
- Body battery (charged, drained, levels)
- Steps and activities

## Approach

**Options to explore:**
1. Fix TypeScript implementation - change API endpoints to use `connectapi.garmin.com`
2. Python integration - use garth library via backend service if TypeScript fix insufficient

**Preferred:** Start with TypeScript fix (smallest change). Fall back to Python if needed.

## Scope

### In Scope (v1)
- Fix Garmin API endpoint URLs
- Ensure OAuth2 Bearer token authentication works with correct endpoints
- Reliable daily sync of health metrics
- Detailed error logging for debugging

### Out of Scope (v1)
- iOS support (Android only)
- Real-time/background sync (manual sync sufficient)
- Multiple Garmin accounts (single account only)
- New features beyond fixing existing data fetch

## Constraints

- Python backend acceptable if needed
- Keep detailed logging for debugging
- Must work on Android via Capacitor
- Maintain existing app architecture where possible

## Technical Context

**Current Stack:**
- React 19.2.0 + TypeScript 5.9.3
- Vite 7.2.4
- Capacitor 8.0.0 (Android)
- Dexie (IndexedDB)

**Key Files:**
- `src/lib/garmin/constants.ts` - API endpoint definitions (needs fix)
- `src/lib/garmin/http-client.ts` - HTTP client with OAuth2
- `src/lib/garmin/endpoints/*.ts` - Individual data fetchers
- `src/lib/garmin/auth.ts` - OAuth flow (working)

**Reference Implementation:**
- `/ref/garth/` - Python library showing correct API usage
- Uses `connectapi.garmin.com` subdomain
- OAuth2 Bearer token in Authorization header

## Success Criteria

1. Garmin sync button fetches real data (not HTML error pages)
2. Health metrics appear in IndexedDB `garminData` table
3. Data displays correctly on GarminPage
4. Sync works consistently on Android device

## Error Logs Reference

See `/fehler.md` for detailed error logs showing:
- HTML responses instead of JSON
- 404 errors on `/modern/proxy/` endpoints
- OAuth2 token present but not accepted by endpoints

---

*Project initialized: 2026-01-11*
