---
phase: 09-dropbox-export
plan: 01
subsystem: backup
tags: [dropbox, oauth2, pkce, encryption, capacitor]

# Dependency graph
requires:
  - phase: features/backup
    provides: BackupData interface and encryption pattern
provides:
  - Dropbox OAuth2 PKCE authentication service
  - Encrypted backup upload to Dropbox
  - DropboxClient singleton for connection management
affects: [dropbox-settings-ui, auto-export]

# Tech tracking
tech-stack:
  added: [dropbox@10.34.0, @capacitor-community/generic-oauth2@7.0.0]
  patterns: [OAuth2 PKCE flow, Preferences-based token storage, Web Crypto API encryption]

key-files:
  created:
    - src/lib/dropbox/types.ts
    - src/lib/dropbox/constants.ts
    - src/lib/dropbox/auth.ts
    - src/lib/dropbox/client.ts
    - src/lib/dropbox/index.ts
  modified:
    - package.json
    - android/app/src/main/AndroidManifest.xml

key-decisions:
  - "Used @capacitor-community/generic-oauth2 for cross-platform OAuth support"
  - "PKCE flow enabled for mobile app security"
  - "Timestamp-based backup filenames to prevent overwrites"

patterns-established:
  - "Dropbox service follows same structure as Garmin service (auth.ts + client.ts)"
  - "Token storage via Capacitor Preferences with dropbox_tokens key"

issues-created: []

# Metrics
duration: 6 min
completed: 2026-01-13
---

# Phase 9 Plan 01: Dropbox Service Setup Summary

**Dropbox OAuth2 PKCE auth with encrypted backup upload using official SDK**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-13T18:58:08Z
- **Completed:** 2026-01-13T19:04:07Z
- **Tasks:** 3/3
- **Files modified:** 7

## Accomplishments

- Installed Dropbox SDK and OAuth2 plugin for Capacitor
- Created Dropbox service layer following existing Garmin auth patterns
- OAuth2 PKCE authentication with token refresh support
- Encrypted backup export using AES-GCM (same as local backups)
- Android deep link handling for OAuth callback

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create service structure** - `a3eff67` (feat)
2. **Task 2: Implement OAuth2 PKCE authentication** - `cb525f9` (feat)
3. **Task 3: Implement Dropbox client with encrypted upload** - `a1cbb03` (feat)

## Files Created/Modified

- `src/lib/dropbox/types.ts` - DropboxTokens, DropboxExportResult, DropboxConnectionStatus interfaces
- `src/lib/dropbox/constants.ts` - App key placeholder, OAuth URLs, backup path
- `src/lib/dropbox/auth.ts` - OAuth2 PKCE authentication with token refresh
- `src/lib/dropbox/client.ts` - DropboxClient class with encrypted upload
- `src/lib/dropbox/index.ts` - Barrel export
- `package.json` - Added dropbox, @capacitor-community/generic-oauth2
- `android/app/src/main/AndroidManifest.xml` - OAuth callback intent-filter

## Decisions Made

- Used @capacitor-community/generic-oauth2 for cross-platform OAuth (works on Android + web)
- PKCE flow for mobile security (no client secret needed)
- Backup files named with timestamp (backup-2026-01-13_14-30.enc) to prevent overwrites
- Token storage follows Garmin pattern (Capacitor Preferences)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added --legacy-peer-deps flag for npm install**
- **Found during:** Task 1 (dependency installation)
- **Issue:** Peer dependency conflict: dexie-encrypted requires dexie@^3.0.0, project has dexie@4.2.1
- **Fix:** Used `npm install --legacy-peer-deps` to proceed
- **Verification:** Dependencies installed, build passes

---

**Total deviations:** 1 auto-fixed (blocking), 0 deferred
**Impact on plan:** Minor workaround for peer dependency, no functional impact.

## Issues Encountered

None - plan executed as specified.

## Next Phase Readiness

- Dropbox service layer complete and ready for UI integration
- Next plan should create Settings UI for Dropbox connection
- User needs to create Dropbox app and configure DROPBOX_APP_KEY

---
*Phase: 09-dropbox-export*
*Completed: 2026-01-13*
