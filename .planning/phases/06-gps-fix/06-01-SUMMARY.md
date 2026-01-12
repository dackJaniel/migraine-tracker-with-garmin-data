---
phase: 06-gps-fix
plan: 01
subsystem: infra
tags: [capacitor, geolocation, android, permissions]

# Dependency graph
requires:
  - phase: 05-ui-mobile-polish
    provides: UI ready for testing
provides:
  - Capacitor Geolocation plugin integration
  - Android location permissions
  - Native GPS detection on Android
affects: [07-auto-sync, weather]

# Tech tracking
tech-stack:
  added: [@capacitor/geolocation]
  patterns: [platform-detection with Capacitor.isNativePlatform()]

key-files:
  created: []
  modified: [src/lib/weather/location-service.ts, android/app/src/main/AndroidManifest.xml, package.json]

key-decisions:
  - "Use Capacitor.isNativePlatform() to detect environment and choose API"
  - "Fall back to browser API on web for dev mode compatibility"

patterns-established:
  - "Platform detection: Capacitor.isNativePlatform() for native vs web behavior"

issues-created: []

# Metrics
duration: 3min
completed: 2026-01-12
---

# Phase 6 Plan 01: GPS Fix Summary

**Capacitor Geolocation plugin with Android permissions for native GPS detection**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-12T08:19:55Z
- **Completed:** 2026-01-12T08:23:04Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 3

## Accomplishments

- Installed @capacitor/geolocation plugin for native location access
- Added Android permissions (ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION)
- Updated location-service.ts to use Capacitor Geolocation on native platforms
- Verified GPS works on Android device with permission dialog

## Task Commits

Each task was committed atomically:

1. **Task 1: Install plugin + permissions** - `fa53b6e` (feat)
2. **Task 2: Update location-service.ts** - `86f0f58` (feat)
3. **Task 3: Human verification** - Approved (no commit)

**Plan metadata:** (this commit)

## Files Created/Modified

- `package.json` - Added @capacitor/geolocation dependency
- `android/app/src/main/AndroidManifest.xml` - Added location permissions
- `src/lib/weather/location-service.ts` - Use Capacitor Geolocation on native

## Decisions Made

- Use `Capacitor.isNativePlatform()` to detect environment
- Fall back to browser `navigator.geolocation` API on web for dev mode
- Request permissions before getting position on native platforms

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- npm peer dependency conflict with dexie-encrypted - resolved with `--legacy-peer-deps`

## Next Phase Readiness

- GPS location detection working on Android
- Ready for Phase 7: Auto Sync

---
*Phase: 06-gps-fix*
*Completed: 2026-01-12*
