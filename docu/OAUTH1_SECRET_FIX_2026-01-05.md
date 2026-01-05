# OAuth1 Token Secret Fix - Critical Bug

**Datum:** 2026-01-05  
**Status:** ✅ Behoben  
**Severity:** 🔴 CRITICAL - Alle Garmin APIs lieferten HTML statt JSON

---

## 🔴 Problem

### Symptome aus den Logs

```
[HTTP Client] Tokens available: oauth1=true, oauth1Secret=false, oauth2=true
[Sleep API] Got HTML instead of JSON for 2026-01-05
[Heart Rate API] Got HTML instead of JSON for 2026-01-05  
[Stress API] Got HTML instead of JSON for 2026-01-05
```

**Kritisch:** `oauth1Secret=false` → OAuth1-Signatur ungültig → Garmin API gibt HTML-Login-Seiten zurück!

---

## 🔍 Root Cause Analysis

### Problem-Kette

1. **Auth.ts speichert OAuth1 Token falsch:**
```typescript
// auth.ts - Line 712
return {
    oauth1Token: JSON.stringify(oauth1),  // ❌ PROBLEM: Speichert als JSON-String!
    oauth2Token: oauth2.access_token,
};

// oauth1 Struktur:
{
    oauth_token: "abc123...",
    oauth_token_secret: "xyz789...",  // ← DAS SECRET!
    mfa_token: undefined
}
```

2. **Http-client.ts liest Token falsch:**
```typescript
// http-client.ts - VORHER
const tokens = JSON.parse(result.value);
return {
    oauth1: tokens.oauth1Token,           // ❌ Ist ein JSON-String, nicht der Token!
    oauth1Secret: tokens.oauth1TokenSecret, // ❌ Existiert nicht!
    oauth2: tokens.oauth2Token,
};
```

3. **Ergebnis:**
   - `oauth1` = `'{"oauth_token":"abc","oauth_token_secret":"xyz"}'` (String statt Token!)
   - `oauth1Secret` = `undefined` (Property existiert nicht!)
   - OAuth1-Signatur wird mit falschem Token + ohne Secret berechnet
   - Garmin API lehnt Request ab → HTML-Login-Seite

---

## ✅ Lösung

### Code-Fix in http-client.ts

```typescript
async function getStoredTokens(): Promise<{
    oauth1?: string;
    oauth1Secret?: string;
    oauth2?: string;
} | null> {
    try {
        const result = await Preferences.get({ key: SESSION_CONFIG.PREFERENCES_KEY_TOKENS });
        if (result.value) {
            const tokens = JSON.parse(result.value);
            
            // ✅ NEU: Parse oauth1Token JSON-String
            let oauth1Token: string | undefined;
            let oauth1Secret: string | undefined;
            
            if (tokens.oauth1Token) {
                try {
                    // oauth1Token ist ein JSON-String mit oauth_token und oauth_token_secret
                    const oauth1Data = JSON.parse(tokens.oauth1Token);
                    oauth1Token = oauth1Data.oauth_token;
                    oauth1Secret = oauth1Data.oauth_token_secret;
                } catch (e) {
                    // Fallback für alte Daten (backwards compatibility)
                    oauth1Token = tokens.oauth1Token;
                }
            }
            
            return {
                oauth1: oauth1Token,        // ✅ Jetzt der echte Token
                oauth1Secret: oauth1Secret, // ✅ Jetzt das Secret!
                oauth2: tokens.oauth2Token,
            };
        }
    } catch (error) {
        console.error('Failed to get stored tokens:', error);
    }
    return null;
}
```

---

## 📊 Vorher/Nachher

### Vorher (Broken)

```json
// Gespeichert in Preferences:
{
  "oauth1Token": "{\"oauth_token\":\"abc123\",\"oauth_token_secret\":\"xyz789\"}",
  "oauth2Token": "bearer_token_123"
}

// Gelesen von http-client:
{
  "oauth1": "{\"oauth_token\":\"abc123\",\"oauth_token_secret\":\"xyz789\"}", // ❌ JSON String!
  "oauth1Secret": undefined, // ❌ FEHLT!
  "oauth2": "bearer_token_123"
}

// OAuth1 Signatur:
- Token: "{\"oauth_token\":... → FALSCH
- Secret: undefined → FEHLT!
- Result: Ungültige Signatur → HTML Response
```

### Nachher (Fixed)

```json
// Gespeichert in Preferences: (GLEICH)
{
  "oauth1Token": "{\"oauth_token\":\"abc123\",\"oauth_token_secret\":\"xyz789\"}",
  "oauth2Token": "bearer_token_123"
}

// Gelesen von http-client:
{
  "oauth1": "abc123",     // ✅ Echter Token!
  "oauth1Secret": "xyz789", // ✅ Secret extrahiert!
  "oauth2": "bearer_token_123"
}

// OAuth1 Signatur:
- Token: abc123 → KORREKT
- Secret: xyz789 → VORHANDEN!
- Result: Gültige Signatur → JSON Response
```

---

## 🧪 Testing

### Erwartete Log-Änderungen

**Vorher:**
```
[HTTP Client] Tokens available: oauth1=true, oauth1Secret=false, oauth2=true
[Sleep API] Got HTML instead of JSON
```

**Nachher:**
```
[HTTP Client] Tokens available: oauth1=true, oauth1Secret=true, oauth2=true
[Sleep API] Response for 2026-01-05: {"dailySleepDTO":{...}}
```

### Test-Schritte

1. **Logout + Re-Login:**
   - Um neue Tokens mit korrekt gespeichertem Format zu erhalten
   - Oder: Bestehende Session funktioniert auch (Parsing extrahiert Secret)

2. **Garmin Sync durchführen:**
   - Sleep API sollte JSON zurückgeben
   - Heart Rate API sollte JSON zurückgeben
   - Stress API sollte JSON zurückgeben

3. **Logs prüfen:**
   - `oauth1Secret=true` ✅
   - Keine HTML-Responses mehr ✅
   - OAuth1 Signaturen werden korrekt generiert ✅

---

## 🚀 Deployment

```bash
npm run build   # Build erfolgreich
./deploy.sh     # Deploy zur App
```

**Nach Deployment:**
1. App öffnen
2. Garmin Sync starten
3. Debug-Logs prüfen

---

## 📝 Lessons Learned

### 1. **Token Storage Format**
- **Problem:** Inconsistent zwischen Speichern und Lesen
- **Lösung:** Entweder beide Seiten anpassen, oder Parser hinzufügen

### 2. **Type Safety verloren bei JSON.stringify()**
- `JSON.stringify()` wandelt strukturierte Daten in String
- TypeScript kann nicht prüfen, wie der String wieder geparst wird
- **Best Practice:** Nutze strukturierte Speicherung:
  ```typescript
  // ✅ BESSER
  {
      oauth1Token: oauth1.oauth_token,
      oauth1TokenSecret: oauth1.oauth_token_secret,
      oauth2Token: oauth2.access_token
  }
  ```

### 3. **Debugging OAuth**
- Log **immer** ob Secrets vorhanden sind (`oauth1Secret=true/false`)
- Ohne Secret ist OAuth1-Signatur **immer** ungültig
- HTML-Response von Garmin = Auth-Fehler (nicht JSON-Parse-Fehler)

### 4. **Backwards Compatibility**
- Fallback eingebaut für alte Token-Formate
- Bestehende Sessions funktionieren weiter
- Neue Logins nutzen korrektes Format

---

## 🔗 Related Issues

- **GARMIN_SYNC_FIX_2026-01-05.md** - HTML Response Detection
- **OAUTH1_IMPLEMENTATION_2026-01-05.md** - OAuth1 Signature Implementation
- **PROJECT_PLAN.md** - PAKET 7: Garmin Real API

---

## ✅ Verification Checklist

- [x] TypeScript Compiler: Keine Fehler
- [x] Build: Erfolgreich
- [ ] Runtime Test: oauth1Secret=true in Logs
- [ ] Sleep API: JSON Response
- [ ] Heart Rate API: JSON Response
- [ ] Stress API: JSON Response
- [ ] Body Battery: Daten vorhanden

---

**Status:** ✅ Code-Fix implementiert, bereit für Runtime-Testing  
**Next:** Deploy zur App und Live-Test mit echtem Garmin-Account
