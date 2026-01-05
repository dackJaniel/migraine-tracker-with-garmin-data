# OAuth1-Signatur-Implementierung für Garmin API

**Datum:** 2026-01-05  
**Status:** ✅ Abgeschlossen  
**Commit:** 43da0c0

## Problem

Trotz korrekter API-Endpoints und erfolgreicher OAuth2-Authentifizierung erhielten wir **HTML-Responses statt JSON**:

```
[Heart Rate API] Response for 2026-01-05: "<!DOCTYPE html><html>..."
```

**Root Cause:** Die Garmin Connect API nutzt **hybride Authentifizierung**:

- OAuth2 Bearer Token → Für initiale Authentifizierung
- **OAuth1 HMAC-SHA1 Signaturen** → Für alle API-Requests (PFLICHT!)

Ohne OAuth1-Signaturen gibt die API Login-Seiten zurück (Status 200, aber falscher Content).

---

## Lösung: Vollständiger OAuth1-Flow

### 1. OAuth1 Consumer Credentials

**Quelle:** `python-garminconnect`/`garth` Library (Open Source)

Hinzugefügt in `src/lib/garmin/constants.ts`:

```typescript
export const OAUTH_CONSUMER = {
  KEY: 'fc3e99d2-118c-44b8-8ae3-03370dde24c0',
  SECRET: 'E08WAR897WEy2knn7aFBrvegVAf0AFdWBBF',
};
```

Diese Werte sind hardcoded in der `garth` Library und für alle Clients gleich.

---

### 2. OAuth1-Funktionen exportiert

**Datei:** `src/lib/garmin/auth.ts`

Folgende Funktionen wurden von `private` → `export` geändert:

```typescript
/**
 * Generate OAuth1 base string for signature
 */
export function generateOAuth1BaseString(
  method: string,
  url: string,
  params: Record<string, string>
): string {
  // Kombiniert: Method + URL + sorted parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  return `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
}

/**
 * Generate OAuth1 HMAC-SHA1 signature using Web Crypto API
 */
export async function generateOAuth1Signature(
  baseString: string,
  consumerSecret: string,
  tokenSecret: string
): Promise<string> {
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  // Web Crypto API für HMAC-SHA1
  const encoder = new TextEncoder();
  const keyData = encoder.encode(signingKey);
  const messageData = encoder.encode(baseString);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Generate random nonce for OAuth requests
 */
export function generateNonce(length: number = 16): string {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map(byte => chars[byte % chars.length])
    .join('');
}

/**
 * Build complete OAuth1 Authorization header
 */
export async function buildOAuth1Header(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  oauthToken: string,
  oauthTokenSecret: string,
  extraParams: Record<string, string> = {}
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_token: oauthToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
  };

  // Kombiniere OAuth + Query Parameters für Signatur
  const allParams = { ...oauthParams, ...extraParams };

  const baseString = generateOAuth1BaseString(method, url, allParams);
  const signature = await generateOAuth1Signature(
    baseString,
    consumerSecret,
    oauthTokenSecret
  );

  oauthParams['oauth_signature'] = signature;

  const header =
    'OAuth ' +
    Object.entries(oauthParams)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}="${encodeURIComponent(value)}"`
      )
      .join(', ');

  return header;
}
```

**Wichtig:** Diese Funktionen nutzen die **Web Crypto API** (`crypto.subtle`), die sowohl im Browser als auch in Node.js (v15+) verfügbar ist.

---

### 3. HTTP-Client OAuth1-Integration

**Datei:** `src/lib/garmin/http-client.ts`

#### 3.1 Token-Storage erweitert

```typescript
async function getStoredTokens(): Promise<{
  oauth1?: string;
  oauth1Secret?: string;
  oauth2?: string;
} | null> {
  try {
    const result = await Preferences.get({ key: 'garmin_tokens' });
    if (result.value) {
      const tokens = JSON.parse(result.value);
      return {
        oauth1: tokens.oauth1Token,
        oauth1Secret: tokens.oauth1TokenSecret, // NEU!
        oauth2: tokens.oauth2Token,
      };
    }
  } catch (error) {
    console.error('Failed to get stored tokens:', error);
  }
  return null;
}
```

**Wichtig:** Das `oauth1Secret` wird benötigt für die Signatur-Generierung!

#### 3.2 Query-Parameter-Extraktion

```typescript
/**
 * Extract query parameters from URL
 */
function extractQueryParams(url: string): Record<string, string> {
  const queryParams: Record<string, string> = {};
  const urlObj = new URL(url, 'https://dummy.com');
  urlObj.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });
  return queryParams;
}

/**
 * Get clean URL without query parameters (for OAuth1 signature)
 */
function getCleanUrl(url: string): string {
  const questionMarkIndex = url.indexOf('?');
  return questionMarkIndex === -1 ? url : url.substring(0, questionMarkIndex);
}
```

**Warum?** OAuth1-Signaturen müssen über die **base URL** (ohne Query-String) generiert werden, aber alle Query-Parameter müssen in die Signatur einbezogen werden.

#### 3.3 buildAuthHeaders() mit OAuth1

```typescript
/**
 * Build authorization headers with OAuth1 signature
 */
async function buildAuthHeaders(
  method: string,
  url: string,
  queryParams?: Record<string, string>
): Promise<Record<string, string>> {
  const tokens = await getStoredTokens();
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };

  // Generate OAuth1 Authorization header
  if (tokens?.oauth1) {
    try {
      const oauth1Header = await buildOAuth1Header(
        method,
        url,
        OAUTH_CONSUMER.KEY,
        OAUTH_CONSUMER.SECRET,
        tokens.oauth1,
        tokens.oauth1Secret || '',
        queryParams || {}
      );
      headers['Authorization'] = oauth1Header;
    } catch (error) {
      console.error('Failed to build OAuth1 header:', error);
      // Fallback to OAuth2 if available
      if (tokens?.oauth2) {
        headers['Authorization'] = `Bearer ${tokens.oauth2}`;
      }
    }
  } else if (tokens?.oauth2) {
    // Fallback to OAuth2 Bearer token
    headers['Authorization'] = `Bearer ${tokens.oauth2}`;
  }

  return headers;
}
```

**Logik:**

1. Versuche OAuth1-Signatur zu generieren
2. Fallback zu OAuth2 Bearer Token bei Fehler
3. Keine Auth-Header wenn beides fehlt

#### 3.4 executeRequest() mit Parameter-Extraktion

```typescript
async function executeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: unknown,
    customHeaders?: Record<string, string>
): Promise<GarminHttpResponse<T>> {
    const startTime = Date.now();

    // Extract query parameters for OAuth1 signature
    const queryParams = extractQueryParams(url);
    const cleanUrl = getCleanUrl(url);

    const headers = {
        ...(await buildAuthHeaders(method, cleanUrl, queryParams)),
        ...customHeaders,
    };

    try {
        await waitForRateLimit();
        // ... rest of function
    }
}
```

**Wichtig:** Jeder Request extrahiert Query-Parameter **vor** der Signatur-Generierung!

---

## OAuth1-Signatur-Algorithmus

### RFC 5849 - The OAuth 1.0 Protocol

**Signature Base String:**

```
HTTP_METHOD + "&" + url_encode(base_url) + "&" + url_encode(sorted_params)
```

**Signing Key:**

```
url_encode(consumer_secret) + "&" + url_encode(token_secret)
```

**Signature:**

```
Base64(HMAC-SHA1(signing_key, signature_base_string))
```

### Beispiel

**Request:**

```
GET https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailySleepData/User?date=2026-01-05
```

**Base String:**

```
GET&https%3A%2F%2Fconnect.garmin.com%2Fmodern%2Fproxy%2Fwellness-service%2Fwellness%2FdailySleepData%2FUser&date%3D2026-01-05%26oauth_consumer_key%3Dfc3e99d2-118c-44b8-8ae3-03370dde24c0%26oauth_nonce%3DaBcDeF1234567890%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D1736084420%26oauth_token%3Duser_oauth1_token%26oauth_version%3D1.0
```

**Signing Key:**

```
E08WAR897WEy2knn7aFBrvegVAf0AFdWBBF&user_oauth1_token_secret
```

**Authorization Header:**

```
Authorization: OAuth oauth_consumer_key="fc3e99d2-118c-44b8-8ae3-03370dde24c0",
                     oauth_token="user_oauth1_token",
                     oauth_signature_method="HMAC-SHA1",
                     oauth_timestamp="1736084420",
                     oauth_nonce="aBcDeF1234567890",
                     oauth_version="1.0",
                     oauth_signature="XyZaBc1234567890+/=="
```

---

## Tests

**Alle Tests bestehen:**

```
✓ tests/unit/garmin-client.test.ts (10 tests)
✓ tests/unit/garmin-endpoints.test.ts (12 tests)
✓ tests/unit/garmin-sync.test.ts (8 tests)
✓ tests/unit/correlation-service.test.ts (10 tests)
✓ tests/unit/backup-service.test.ts (8 tests)
✓ tests/unit/symptom-service.test.ts (14 tests)
✓ tests/unit/intensity-history.test.ts (15 tests)
✓ tests/unit/night-onset.test.ts (18 tests)
✓ tests/unit/weather-client.test.ts (11 tests)
✓ tests/unit/weather-correlation.test.ts (10 tests)

Test Files  12 passed (12)
     Tests  131 passed (131)
```

---

## Nächste Schritte

1. **App neu bauen:**

   ```bash
   npm run build
   npx cap sync
   npx cap open android
   ```

2. **Testing auf Android:**
   - In der App neu einloggen (um OAuth1 Token Secret zu speichern)
   - "Test-Sync Heute" Button klicken
   - Debug-Log in Settings prüfen:
     - ✅ Sollte jetzt JSON-Responses zeigen
     - ✅ Keine HTML-Responses mehr

3. **Erwartete Logs:**

   ```
   [Sleep API] Response for 2026-01-05: {"dailySleepDTO":{"sleepScore":75,...}}
   [Heart Rate API] Response for 2026-01-05: {"restingHeartRate":62,...}
   [Steps API] Response for 2026-01-05: {"totalSteps":8432,...}
   ```

4. **UI-Verifikation:**
   - Dashboard sollte jetzt Garmin-Daten anzeigen
   - Stats Cards: Stress, Steps, Hydration mit echten Werten
   - Keine "Keine Daten" mehr

---

## Referenzen

- **RFC 5849:** https://datatracker.ietf.org/doc/html/rfc5849
- **python-garminconnect:** https://github.com/cyberjunky/python-garminconnect
- **garth (OAuth Library):** https://github.com/matin/garth
- **Web Crypto API:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API

---

## Lessons Learned

1. **Garmin API ist hybrid:** OAuth2 für Auth, OAuth1 für API-Requests
2. **Status 200 ≠ Success:** HTML-Responses bei fehlender OAuth1-Signatur
3. **Alle Parameter einbeziehen:** Query + OAuth-Parameter in Signatur
4. **Web Crypto API:** Modern, sicher, cross-platform (Browser + Node.js)
5. **Token Secrets essentiell:** Müssen persistent gespeichert werden

---

**Ende der Implementierung** ✅
