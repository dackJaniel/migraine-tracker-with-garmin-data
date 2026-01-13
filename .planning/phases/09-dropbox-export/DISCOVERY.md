# Phase 09: Dropbox Export - Discovery

**Discovery Level:** 2 (Standard Research)
**Date:** 2026-01-13

## Research Topics

1. Dropbox API v2 for JavaScript
2. OAuth2 PKCE flow for Capacitor/Mobile apps
3. Client-side encryption (already implemented)

## Findings

### Dropbox SDK

**Package:** `dropbox` (npm)
**Version:** v10.35.0 (latest)
**Documentation:** https://github.com/dropbox/dropbox-sdk-js

**Installation:**
```bash
npm install dropbox
```

**Basic Usage:**
```typescript
import { Dropbox } from 'dropbox';

const dbx = new Dropbox({ accessToken: 'ACCESS_TOKEN' });

// Upload file
dbx.filesUpload({
  path: '/MigraineTracker/backup.enc',
  contents: fileContent,
  mode: { '.tag': 'overwrite' }
});
```

**File Size Limits:**
- Simple upload: < 150 MB
- Upload sessions: up to 350 GB (not needed for backups)

### OAuth2 for Capacitor

**Plugin:** `@capacitor-community/generic-oauth2`
**Version:** 7.x (requires Capacitor 7+, we have 8.0)

**Installation:**
```bash
npm install @capacitor-community/generic-oauth2
npx cap sync
```

**PKCE Flow (required for mobile):**
```typescript
import { GenericOAuth2 } from '@capacitor-community/generic-oauth2';

const options = {
  appId: 'DROPBOX_APP_KEY',
  authorizationBaseUrl: 'https://www.dropbox.com/oauth2/authorize',
  accessTokenEndpoint: 'https://api.dropboxapi.com/oauth2/token',
  responseType: 'code',
  pkceEnabled: true,
  scope: 'files.content.write files.content.read',
  web: {
    redirectUrl: window.location.origin + '/callback',
  },
  android: {
    redirectUrl: 'com.example.migrainetracker://oauth/callback',
  }
};

const result = await GenericOAuth2.authenticate(options);
const accessToken = result['access_token'];
const refreshToken = result['refresh_token'];
```

**Token Refresh:**
```typescript
const refreshResult = await GenericOAuth2.refreshToken({
  appId: 'DROPBOX_APP_KEY',
  accessTokenEndpoint: 'https://api.dropboxapi.com/oauth2/token',
  refreshToken: storedRefreshToken
});
```

### Dropbox App Setup

**Required:** Create app at https://www.dropbox.com/developers/apps

**Settings needed:**
- App type: "Scoped access"
- Permissions: `files.content.write`, `files.content.read`
- Redirect URI (Android): `com.example.migrainetracker://oauth/callback`
- Redirect URI (Web dev): `http://localhost:5173/callback`

**App Key:** Store in constants (public, not secret)
**App Secret:** NOT needed with PKCE flow

### Encryption

**Already implemented:** `src/features/backup/backup-service.ts`
- `encryptBackup()` - AES-GCM encryption with password
- `decryptBackup()` - AES-GCM decryption
- Password strength validation

**Can reuse directly** for Dropbox export.

## Architecture Decision

**Approach:** Follow existing patterns

1. **Service layer:** `src/lib/dropbox/` following `src/lib/garmin/` pattern
   - `client.ts` - Dropbox client facade
   - `auth.ts` - OAuth2 with PKCE via generic-oauth2 plugin
   - `types.ts` - TypeScript types

2. **Settings UI:** `src/features/dropbox/` following `src/features/garmin/` pattern
   - `DropboxSettings.tsx` - Settings component (following GarminSettings pattern)

3. **Auto-export:** Integrate with existing auto-sync service or create dedicated export service

## Dependencies to Install

```bash
npm install dropbox @capacitor-community/generic-oauth2
npx cap sync
```

## Don't Hand-Roll

- OAuth2 PKCE flow → Use `@capacitor-community/generic-oauth2`
- Dropbox API calls → Use official `dropbox` SDK
- Encryption → Use existing `encryptBackup()` from backup-service.ts

## Scope Estimate

**Tasks:**
1. Install dependencies + create Dropbox service layer
2. Implement OAuth2 PKCE authentication
3. Implement encrypted file upload
4. Create DropboxSettings component
5. Add auto-export functionality

**Complexity:** Medium (new external integration, OAuth flow)
**Files:** ~8-10 new/modified files
**Recommendation:** Split into 2 plans (OAuth+Upload, then Settings+Auto-export)
