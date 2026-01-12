# Phase 7: Auto Sync - Discovery

**Discovery Level:** 1 (Quick Verification)
**Date:** 2026-01-12

## Research Questions

1. How to implement automatic sync on app open?
2. What existing infrastructure can be reused?

## Options Evaluated

### Option A: Background Runner + Notifications (Complex)
- Requires @capacitor/background-runner and @capacitor/local-notifications
- Needs Android permissions (SCHEDULE_EXACT_ALARM, POST_NOTIFICATIONS)
- OS controls timing - not guaranteed
- High complexity

**Verdict:** Over-engineered for use case

### Option B: Sync on App Open (Simple) ✓
- No new plugins needed
- No permissions needed
- Uses existing `isSyncNeeded()` and `shouldSyncWeather()` functions
- Syncs when user actually uses the app
- Simple useEffect in App.tsx

**Verdict:** Best approach - simple, reliable, no dependencies

## Recommended Approach

**Sync on App Open:**
1. When app starts, check if Garmin/Weather sync needed (>24h since last)
2. If needed, trigger sync automatically in background
3. Show toast notification when sync completes
4. Settings toggle to enable/disable

## Existing Infrastructure

Already available in codebase:
- `isSyncNeeded()` - src/lib/garmin/sync-service.ts:280
- `shouldSyncWeather()` - src/lib/weather/sync-service.ts:54
- `syncAllMissingData()` - Garmin sync
- `autoSyncWeather()` - Weather sync

## Implementation

Simple service + useEffect hook:
```typescript
// On app mount
useEffect(() => {
  if (autoSyncEnabled) {
    performAutoSyncIfNeeded();
  }
}, []);
```

No new Capacitor plugins required.
