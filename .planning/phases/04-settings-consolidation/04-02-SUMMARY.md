---
phase: 04-settings-consolidation
plan: 02
subsystem: ui
tags: [garmin, refactor, simplification, ux]

requires:
  - phase: 04-settings-consolidation/04-01
    provides: GarminSettings component for connection management

provides:
  - Simplified GarminPage as pure data viewer
  - Clear separation: Settings for connection, GarminPage for data
  - Navigation from GarminPage to Settings when not connected

affects: [05-ui-mobile-polish]

tech-stack:
  added: []
  patterns:
    - Data pages show data or direct to Settings
    - Connection management centralized in Settings

key-files:
  created: []
  modified:
    - src/pages/GarminPage.tsx

key-decisions:
  - "Keep single-day resync on GarminPage (data-focused action)"
  - "Direct to /settings (not specific tab) for simplicity"
---

# Phase 4 Plan 2: GarminPage Simplification Summary

**Simplified GarminPage from 577 to 191 lines - now a pure data viewer.**

## Accomplishments

- Removed all login/MFA state and handlers
- Removed all sync control state and handlers (now in GarminSettings)
- Removed SyncControls component usage
- Added "Go to Settings" prompt when not connected and no data
- Kept single-day resync for data refresh convenience
- Info card now links to Settings > Garmin for connection management

## Files Created/Modified

- `src/pages/GarminPage.tsx` - Simplified to pure data viewer (386 lines removed)

## Decisions Made

- Keep `handleResync` on GarminPage - it's a data-focused action for refreshing current day
- Navigate to `/settings` rather than trying to deep-link to Garmin tab
- Show data if available (demo or real), direct to Settings only when truly empty

## Issues Encountered

None.

## Next Phase Readiness

Phase 4: Settings Consolidation complete. Ready for Phase 5: UI Mobile Polish.
