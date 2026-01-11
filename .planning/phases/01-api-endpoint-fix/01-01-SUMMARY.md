---
phase: 01-api-endpoint-fix
plan: 01
subsystem: api
tags: [garmin, oauth2, connectapi, vite-proxy]

requires:
  - phase: none
    provides: First phase, no dependencies

provides:
  - Correct API endpoint URLs using connectapi.garmin.com
  - Vite proxy for development targeting connectapi subdomain

affects: [02-validation-testing]

tech-stack:
  added: []
  patterns:
    - API data requests use GARMIN_API_URL (connectapi.garmin.com)
    - SSO requests use separate GARMIN_SSO_URL (sso.garmin.com)

key-files:
  created: []
  modified:
    - src/lib/garmin/constants.ts
    - vite.config.ts
    - src/lib/garmin/auth.ts

key-decisions:
  - "Development proxy path /api/connectapi for API requests (separate from /api/garmin for SSO)"

patterns-established:
  - "GARMIN_API_URL for all data API endpoints (wellness, HRV, training)"
  - "GARMIN_BASE_URL reserved for web UI references only"

issues-created: []

duration: 3min
completed: 2026-01-11
---

# Phase 1 Plan 1: Fix API Endpoint Constants Summary

**Changed GARMIN_API_URL from connect.garmin.com to connectapi.garmin.com, added /api/connectapi Vite proxy for development**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-11T17:06:56Z
- **Completed:** 2026-01-11T17:10:11Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Updated GARMIN_API_URL to use `/api/connectapi` in dev mode and `https://connectapi.garmin.com` in production
- Replaced all endpoint function references from GARMIN_MODERN_PROXY to GARMIN_API_URL
- Added new `/api/connectapi` Vite proxy configuration targeting connectapi.garmin.com
- Fixed blocking TypeScript error (unused import)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix API endpoint constants** - `3909f2f` (fix)
2. **Task 2: Add connectapi proxy** - `a5fe7c4` (feat)

**Deviation fix:** `7c90f06` (fix: remove unused GARMIN_BASE_URL import)

**Plan metadata:** (pending)

## Files Created/Modified

- `src/lib/garmin/constants.ts` - Updated GARMIN_API_URL and all endpoint URL functions
- `vite.config.ts` - Added /api/connectapi proxy entry
- `src/lib/garmin/auth.ts` - Removed unused import (blocking fix)

## Decisions Made

- Development uses `/api/connectapi` proxy path (not `/api/garmin` which is for SSO)
- Production uses direct `https://connectapi.garmin.com` URL
- Removed legacy GARMIN_MODERN_PROXY constant entirely

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed unused GARMIN_BASE_URL import**
- **Found during:** Verification (npm run build)
- **Issue:** GARMIN_BASE_URL was imported in auth.ts but never used, causing TypeScript error
- **Fix:** Removed the unused import from the import statement
- **Files modified:** src/lib/garmin/auth.ts
- **Verification:** Build succeeds
- **Committed in:** 7c90f06

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Pre-existing unused import, essential fix for build to succeed. No scope creep.

## Issues Encountered

None - plan executed as specified.

## Next Phase Readiness

- API endpoints now correctly target connectapi.garmin.com
- Ready for Phase 2 validation testing on Android device
- OAuth2 Bearer token should now be accepted by endpoints

---
*Phase: 01-api-endpoint-fix*
*Completed: 2026-01-11*
