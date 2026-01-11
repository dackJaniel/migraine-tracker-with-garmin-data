# External Integrations

**Analysis Date:** 2026-01-11

## APIs & External Services

**Garmin Connect:**
- Purpose: Health metrics (sleep, stress, heart rate, HRV, body battery, steps, etc.)
- SDK/Client: Custom implementation (`src/lib/garmin/`)
- Auth: OAuth 1.0 + OAuth 2.0 dual-token system
- Endpoints:
  - SSO: `https://sso.garmin.com/sso`
  - API: `https://connectapi.garmin.com`
  - OAuth consumer: `https://thegarth.s3.amazonaws.com/oauth_consumer.json`
- Implementation files:
  - `src/lib/garmin/auth.ts` - OAuth flow, login, MFA support
  - `src/lib/garmin/client.ts` - Public API facade
  - `src/lib/garmin/http-client.ts` - HTTP with rate limiting (60 req/min)
  - `src/lib/garmin/sync-service.ts` - Data synchronization
  - `src/lib/garmin/endpoints/*.ts` - Individual metric fetchers
- Rate limits: 120 requests/minute (self-imposed: 60)

**Open-Meteo (Weather):**
- Purpose: Weather data for migraine correlation (pressure, temperature, humidity)
- SDK/Client: Custom fetch client (`src/lib/weather/client.ts`)
- Auth: No API key required (free tier)
- Endpoints:
  - Historical: `https://archive-api.open-meteo.com/v1/archive`
  - Forecast: `https://api.open-meteo.com/v1/forecast`
  - Geocoding: `https://geocoding-api.open-meteo.com/v1/search`
- Implementation files:
  - `src/lib/weather/client.ts` - API calls
  - `src/lib/weather/sync-service.ts` - Background sync
  - `src/lib/weather/location-service.ts` - Location management
  - `src/lib/weather/types.ts` - Data types and WMO codes
- Features: Auto-selects Archive API for data >5 days old

**OpenStreetMap Nominatim:**
- Purpose: Reverse geocoding (coordinates to city name)
- Endpoint: `https://nominatim.openstreetmap.org/reverse`
- Used by: `src/lib/weather/location-service.ts`

## Data Storage

**Dexie (IndexedDB):**
- Purpose: Primary local data store
- Client: Dexie 4.2.1 (`src/lib/db.ts`)
- Database: `MigraineTrackerDB`
- Tables:
  - `episodes` - Migraine episodes with intensity history
  - `garminData` - Daily Garmin health metrics (date-indexed)
  - `weatherData` - Daily weather data (date-indexed)
  - `archivedEpisodes` - Archived episode history
  - `logs` - Application and sync logs
  - `settings` - Key-value configuration store
- Migrations: 4 versions with upgrade hooks

**Capacitor Preferences:**
- Purpose: Device-level preferences storage
- Client: `@capacitor/preferences`
- Keys stored:
  - `garmin_tokens` - OAuth1 and OAuth2 tokens
  - `garmin_profile` - User profile (displayName, email)
  - `garmin_last_sync` - Last sync timestamp

**File Storage:**
- Service: Capacitor Filesystem (`@capacitor/filesystem`)
- Purpose: Backup file export/import
- Location: Device Documents directory

## Authentication & Identity

**PIN Protection:**
- Implementation: `src/features/auth/pin-service.ts`
- Encryption: PBKDF2 (100,000 iterations) + SHA-256
- Storage: Hashed PIN in Capacitor Preferences

**Garmin OAuth:**
- OAuth 1.0: Initial authentication
- OAuth 2.0: API access tokens
- MFA Support: Two-factor authentication handling
- Token refresh: Automatic via OAuth1 token exchange
- Implementation: `src/lib/garmin/auth.ts`

## Monitoring & Observability

**Error Tracking:**
- Service: None (logs to local DB)
- Implementation: `db.logs.add()` for persistent logging

**Logging:**
- Service: Local IndexedDB (`logs` table)
- Levels: info, warn, error
- Patterns: `logAuth()`, `logSync()`, `addLog()`

## CI/CD & Deployment

**Hosting:**
- Platform: None (local-first PWA)
- Android: Capacitor build to APK

**Build:**
- Tool: Vite
- Output: `dist/` directory
- Commands: `npm run build`, `npx cap sync android`

## Environment Configuration

**Development:**
- Proxies configured in `vite.config.ts`:
  - `/api/garmin-sso` → `https://sso.garmin.com`
  - `/api/garmin` → `https://connect.garmin.com`
  - `/api/oauth-consumer` → OAuth consumer endpoint
- Detection: `import.meta.env.DEV`

**Production (Native):**
- Direct API calls (no proxy needed)
- Detection: `Capacitor.isNativePlatform()`
- Uses Capacitor HTTP client (bypasses CORS)

**No .env files:**
- Configuration hardcoded in `src/lib/garmin/constants.ts`
- No secrets required (public OAuth)

## Webhooks & Callbacks

**Incoming:**
- None (client-side only app)

**Outgoing:**
- None

## Security Notes

**OAuth Credentials:**
- Public consumer key/secret from Garmin (same as garth library)
- Stored in constants, not secrets
- Tokens stored securely in Capacitor Preferences

**Data Encryption:**
- Backup files: AES-GCM with password-derived key
- PIN: PBKDF2 hashed with salt
- Implementation: `src/lib/encryption.ts`

---

*Integration audit: 2026-01-11*
*Update when adding/removing external services*
