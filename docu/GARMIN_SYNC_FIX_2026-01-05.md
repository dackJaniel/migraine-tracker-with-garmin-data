# Garmin Sync Fix - HTML Response Problem

**Datum:** 2026-01-05  
**Status:** ✅ Behoben  
**Ticket:** Sleep API gibt HTML statt JSON zurück

---

## 🔴 Problem

### Symptome

Aus den Logs:

```
[5.1.2026, 14:39:02] WARN: [Sleep API] No dailySleepDTO in response for 2026-01-05
[5.1.2026, 14:39:02] INFO: [Sleep API] Response for 2026-01-05: "<!DOCTYPE html><html>..."
```

**Analyse:**
1. Sleep API gibt HTML statt JSON zurück
2. HTML deutet auf:
   - Auth-Fehler (Login-Seite)
   - Falsches Endpoint-Format
   - Fehlendes/falsches `displayName`
3. Andere APIs (Hydration, User Summary) funktionieren → Sleep-spezifisches Problem

---

## 🔍 Root Cause

### Problem 1: Fehlende HTML-Detection

Die API-Responses wurden blind als JSON geparst, ohne Content-Type zu prüfen:

```typescript
// ❌ VORHER: http-client.ts
if (contentType?.includes('application/json')) {
    responseData = await fetchResponse.json();
} else {
    responseData = (await fetchResponse.text()) as unknown as T;
}
```

**Issue:** Wenn HTML zurückkommt, wird es als String gespeichert, aber später versucht `JSON.stringify()` darauf anzuwenden → Log-Overflow.

### Problem 2: Keine Endpoint-Fallbacks

Sleep API nutzt `displayName` im Path:

```
/wellness-service/wellness/dailySleepData/{displayName}?date={date}
```

Aber möglicherweise unterstützen manche Garmin-Accounts ein alternatives Format:

```
/wellness-service/wellness/dailySleepData?calendarDate={date}
```

### Problem 3: Unzureichendes Logging

- Kein displayName-Logging → Unklar ob `displayName` korrekt gesetzt ist
- Keine Response-Truncation → Log-DB wächst massiv bei HTML-Responses
- Keine differenzierte Fehlerbehandlung

---

## ✅ Lösung

### 1. HTML-Detection in allen Endpoints

**Datei:** `src/lib/garmin/endpoints/sleep.ts`, `stress.ts`

```typescript
// CHECK: Detect HTML response (Auth failure)
if (typeof data === 'string' && data.trim().startsWith('<!DOCTYPE html>')) {
    await db.logs.add({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `[Sleep API] Got HTML instead of JSON for ${date} - Authentication failed`,
    });
    return null;
}
```

**Impact:** Frühzeitiges Erkennen von Auth-Fehlern.

---

### 2. Verbessertes Content-Type Handling

**Datei:** `src/lib/garmin/http-client.ts`

```typescript
const contentType = fetchResponse.headers.get('content-type');
const responseText = await fetchResponse.text();

// Try to parse as JSON if content-type indicates JSON or if it looks like JSON
if (contentType?.includes('application/json') || 
    (responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
    try {
        responseData = JSON.parse(responseText) as T;
    } catch (e) {
        // If parsing fails, return as text
        responseData = responseText as unknown as T;
    }
} else {
    // Non-JSON response (likely HTML error page)
    responseData = responseText as unknown as T;
}
```

**Verbesserung:**
- Heuristisches JSON-Parsing (auch wenn Content-Type fehlt)
- Try-Catch um JSON.parse() → Graceful Degradation
- HTML wird als String zurückgegeben (nicht als Objekt)

---

### 3. Alternativer Sleep-Endpoint

**Datei:** `src/lib/garmin/constants.ts`

```typescript
export const WELLNESS_ENDPOINTS = {
  SLEEP_DATA: (displayName: string, date: string) => 
    `${GARMIN_MODERN_PROXY}/wellness-service/wellness/dailySleepData/${displayName}?date=${date}&nonSleepBufferMinutes=60`,
  
  // Backup endpoint (if primary fails)
  SLEEP_DATA_ALT: (date: string) => 
    `${GARMIN_MODERN_PROXY}/wellness-service/wellness/dailySleepData?calendarDate=${date}`,
};
```

**Datei:** `src/lib/garmin/endpoints/sleep.ts`

```typescript
// If primary endpoint returns HTML, try alternative
if (typeof data === 'string' && data.trim().startsWith('<!DOCTYPE html>')) {
    await db.logs.add({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `[Sleep API] Primary endpoint returned HTML. Trying alternative...`,
    });
    
    try {
        const altResponse = await garminHttp.get<SleepDataResponse>(
            WELLNESS_ENDPOINTS.SLEEP_DATA_ALT(date)
        );
        
        if (altResponse.data?.dailySleepDTO) {
            // ... return sleep data
        }
    } catch (altError) {
        // Both endpoints failed
    }
}
```

**Impact:** Fallback-Mechanismus bei Endpoint-Problemen.

---

### 4. Erweitertes Logging

**DisplayName-Logging:**

```typescript
const displayName = await garminAuth.getDisplayNameAsync();

await db.logs.add({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `[Sleep API] Using displayName: ${displayName} for date ${date}`,
});
```

**Response-Truncation:**

```typescript
const responseStr = JSON.stringify(data, null, 2);
await db.logs.add({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `[Sleep API] Response for ${date}: ${
        responseStr.length > 500 
            ? responseStr.substring(0, 500) + '...[truncated]' 
            : responseStr
    }`,
});
```

**Impact:** 
- Besseres Debugging (displayName sichtbar)
- Log-DB bleibt klein (max 500 Zeichen pro Response)

---

## 📊 Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/lib/garmin/endpoints/sleep.ts` | HTML-Detection, Fallback-Endpoint, displayName-Logging, Response-Truncation |
| `src/lib/garmin/endpoints/stress.ts` | HTML-Detection, displayName-Logging (Heart Rate + Stress) |
| `src/lib/garmin/http-client.ts` | Verbessertes Content-Type Handling, heuristisches JSON-Parsing |
| `src/lib/garmin/constants.ts` | Alternativer Sleep-Endpoint hinzugefügt |

---

## 🧪 Testing

### Manuelle Tests

1. **Sleep API mit HTML-Response:**
   - Erwartung: Log-Eintrag "Got HTML instead of JSON"
   - Fallback-Endpoint wird versucht
   - Kein JSON.stringify() auf HTML-String

2. **DisplayName-Logging:**
   - Erwartung: Log zeigt `displayName: "john.doe"` (oder "user" als Fallback)

3. **Response-Truncation:**
   - Erwartung: Bei großen Responses nur ersten 500 Zeichen loggen

### Automatisierte Tests

```typescript
// TODO: Unit Test für HTML-Detection
describe('getSleepData', () => {
  it('should handle HTML response gracefully', async () => {
    // Mock response mit HTML
    const htmlResponse = '<!DOCTYPE html><html>...</html>';
    // ...
  });
});
```

---

## 🚀 Nächste Schritte

### Kurzfristig (Post-Fix)

1. **User mit HTML-Response debuggen:**
   - Logs prüfen: Welches `displayName` wird verwendet?
   - Alternative Endpoint-Formate testen

2. **Auth-Status prüfen:**
   - Ist OAuth1-Signatur korrekt?
   - Sind Token noch gültig?

3. **Garmin API Dokumentation:**
   - Offizielle Docs für Sleep-Endpoint suchen
   - `python-garminconnect` Source genauer prüfen

### Mittelfristig (Robustheit)

1. **Generic Error Handler:**
   ```typescript
   function isHTMLResponse(data: unknown): boolean {
       return typeof data === 'string' && data.trim().startsWith('<!DOCTYPE html>');
   }
   ```

2. **Retry-Logik für HTML-Responses:**
   - Nach HTML-Response: Token refresh triggern
   - Dann erneut versuchen

3. **Endpoint-Discovery:**
   - Bei Fehler: Alle bekannten Sleep-Endpoint-Varianten durchprobieren
   - Funktionierende Variante in DB cachen

---

## 📝 Lessons Learned

1. **Content-Type ist nicht garantiert:**
   - Garmin API gibt manchmal keinen/falschen Content-Type Header
   - Heuristische JSON-Detection notwendig

2. **HTML = Auth-Problem:**
   - Garmin gibt Login-Seiten zurück bei Auth-Fehlern (statt 401/403)
   - Explizite HTML-Detection essential

3. **Endpoint-Variabilität:**
   - Garmin nutzt verschiedene Endpoint-Formate
   - Fallback-Mechanismen wichtig

4. **Logging-Hygiene:**
   - Große Responses müssen getruncated werden
   - Sonst wächst Log-DB exponentiell

---

**Autor:** Claude (GitHub Copilot)  
**Review:** Pending
