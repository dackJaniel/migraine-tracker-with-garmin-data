# Codebase Concerns

**Analysis Date:** 2026-01-11

## Tech Debt

**N+1 Database Query Patterns:**
- Issue: Sequential DB queries inside loops in correlation analysis
- Files: `src/features/analytics/correlation-service.ts`
- Lines: 31, 119, 168, 202, 311, 404, 448, 508, 554
- Why: Each episode triggers individual `db.garminData.get()` or `db.weatherData.get()` call
- Impact: Performance degrades linearly with data size
- Fix approach: Batch load all required dates first, then process in-memory

**Duplicate Encryption Implementations:**
- Issue: Two different encryption implementations exist
- Files:
  - `src/lib/encryption.ts` - Proper PBKDF2 + AES-GCM (100,000 iterations)
  - `src/features/backup/backup-service.ts` - Simpler SHA-256 key derivation
- Why: Backup feature implemented separately without reusing existing code
- Impact: Inconsistent security, maintenance burden
- Fix approach: Consolidate to use `src/lib/encryption.ts` functions

**Large Monolithic Files:**
- Issue: Several files exceed reasonable size
- Files:
  - `src/lib/garmin/auth.ts` - 1238 lines
  - `src/features/episodes/EpisodeForm.tsx` - 792 lines
  - `src/pages/GarminSettings.tsx` - 678 lines
  - `src/pages/Settings.tsx` - 668 lines
- Why: Organic growth without refactoring
- Impact: Hard to test, maintain, and extend
- Fix approach: Extract components and split auth.ts into modules

## Known Bugs

**None detected during analysis**

## Security Considerations

**Untyped Backup Data:**
- Risk: `BackupData` interface uses `any[]` for episodes, garminData, settings
- Files: `src/features/backup/backup-service.ts` (lines 9-11, 123)
- Current mitigation: None
- Recommendations: Use proper types `Episode[]`, `GarminData[]`, etc.

**JSON.parse Without Error Handling:**
- Risk: Malformed input can crash the app
- Files: `src/features/backup/backup-service.ts` (lines 86, 98, 156, 167)
- Current mitigation: None
- Recommendations: Wrap in try-catch blocks

## Performance Bottlenecks

**Correlation Analysis:**
- Problem: Multiple sequential database queries in loops
- Files: `src/features/analytics/correlation-service.ts`
- Measurement: Not measured, but O(n) DB calls per analysis function
- Cause: Individual `db.get()` calls instead of batch loading
- Improvement path: Load all garminData/weatherData upfront, process in-memory

## Fragile Areas

**Garmin HTML Parsing:**
- Files: `src/lib/garmin/auth.ts` (lines 255-366)
- Why fragile: Multiple regex patterns parse Garmin SSO HTML responses for CSRF tokens
- Common failures: Any change to Garmin's HTML structure breaks authentication
- Safe modification: Add extensive logging, test against real Garmin responses
- Test coverage: No automated tests for auth flow

**Rate Limiting Implementation:**
- Files: `src/lib/garmin/http-client.ts`
- Why fragile: Simple counter-based rate limiting
- Common failures: Counter reset timing could allow burst requests
- Safe modification: Test rate limiting behavior under load
- Test coverage: Minimal

## Scaling Limits

**IndexedDB Storage:**
- Current capacity: Browser-dependent (typically 50-100MB minimum)
- Limit: Browser quota exceeded
- Symptoms at limit: Write failures, data loss
- Scaling path: Implement data cleanup for old records

## Dependencies at Risk

**None detected** - All dependencies appear actively maintained.

## Missing Critical Features

**None detected** - Core functionality is implemented.

## Test Coverage Gaps

**Backup/Restore Flow:**
- What's not tested: Full backup encryption → export → import → restore flow
- Files: `src/features/backup/backup-service.ts`
- Risk: Data loss or corruption during backup operations
- Priority: High
- Difficulty to test: Needs file system mocking and encryption verification

**Authentication Flow:**
- What's not tested: OAuth login, MFA handling, token refresh
- Files: `src/lib/garmin/auth.ts`
- Risk: Auth breaks silently on Garmin API changes
- Priority: High
- Difficulty to test: Requires mocking complex HTTP flows and HTML responses

**E2E Tests:**
- What's not tested: No E2E tests exist (directory configured but empty)
- Files: `tests/e2e/`
- Risk: User-facing bugs not caught
- Priority: Medium
- Difficulty to test: Setup exists, just needs test implementation

## Documentation Gaps

**Complex Regex Patterns:**
- Files: `src/lib/garmin/auth.ts` (lines 257-262)
- What's missing: Why multiple CSRF extraction patterns are needed
- Impact: Hard to maintain or debug

**Error Messages Mixed Languages:**
- Files: Various
- What's missing: Consistent language policy (German domain, English code)
- Impact: Inconsistent user experience

## Logging Inconsistencies

**Mixed Logging Patterns:**
- Issue: Different logging approaches across files
- Files:
  - `src/lib/garmin/auth.ts` - uses `logAuth()`
  - `src/lib/garmin/sync-service.ts` - uses `logSync()`
  - `src/lib/weather/sync-service.ts` - uses `addLog()`
  - `src/features/backup/backup-service.ts` - uses `console.error()`
- Impact: Harder debugging, inconsistent log persistence
- Fix approach: Standardize on single logging utility

---

*Concerns audit: 2026-01-11*
*Update as issues are fixed or new ones discovered*
