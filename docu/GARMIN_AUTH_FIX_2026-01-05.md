# Garmin OAuth1 401-Fehler Fix nach MFA

**Datum:** 2026-01-05  
**Problem:** OAuth1 Token-Request schlägt mit Status 401 fehl nach erfolgreicher MFA-Verifizierung

## Problemanalyse

### Symptome

- Login + 2FA Code-Eingabe funktioniert
- Nach MFA: "OAuth1 token request failed with status 401"
- Der OAuth1-Token-Request an `/oauth-service/oauth/preauthorized` wird abgelehnt

### Root Cause

Nach Analyse der Referenz-Implementierungen (`python-garminconnect`, `garth`, `GarminDB`) wurden zwei Hauptprobleme identifiziert:

1. **OAuth1 Signatur falsch berechnet**: Die Query-Parameter (`ticket`, `login-url`, `accepts-mfa-tokens`) wurden NICHT in die OAuth1-Signatur einbezogen. OAuth1 erfordert jedoch, dass **alle** Parameter (Query UND Body) in der Signatur-Berechnung enthalten sind.

2. **MFA-Response Ticket-Extraktion**: Das Ticket-Extraktionsmuster war nicht vollständig kompatibel mit garth's Pattern (`embed\?ticket=([^"]+)"`).

## Referenz-Implementierungen

### garth (matin/garth)

Die Python-Library `garth` ist die Referenz-Implementierung für Garmin Connect OAuth:

```python
# sso.py - get_oauth1_token()
def get_oauth1_token(ticket: str, client: "http.Client") -> OAuth1Token:
    sess = GarminOAuth1Session(parent=client.sess)
    base_url = f"https://connectapi.{client.domain}/oauth-service/oauth/"
    login_url = f"https://sso.{client.domain}/sso/embed"
    url = (
        f"{base_url}preauthorized?ticket={ticket}&login-url={login_url}"
        "&accepts-mfa-tokens=true"
    )
    resp = sess.get(url, headers=USER_AGENT, timeout=client.timeout)
    resp.raise_for_status()
    parsed = parse_qs(resp.text)
    token = {k: v[0] for k, v in parsed.items()}
    return OAuth1Token(domain=client.domain, **token)
```

**Wichtig:** `GarminOAuth1Session` verwendet `requests_oauthlib.OAuth1Session`, welche automatisch die korrekte OAuth1-Signatur generiert und alle Parameter (auch Query-Parameter) in die Signatur einbezieht.

### GarminDB (tcgoetz/GarminDB)

GarminDB verwendet direkt die `garth` Library über `GarthClient`:

```python
from garth import Client as GarthClient
gc = GarthClient()
gc.login(username, password)
```

## Implementierte Fixes

### 1. OAuth1 Signatur-Fix (auth.ts)

**Vorher (falsch):**

```typescript
const authHeader = await buildOAuth1Header(
  'GET',
  url, // Base URL ohne Query-Params
  consumer.consumer_key,
  consumer.consumer_secret
);
```

**Nachher (korrekt):**

```typescript
const queryParams: Record<string, string> = {
  ticket: ticket,
  'login-url': loginUrl,
  'accepts-mfa-tokens': 'true',
};

const authHeader = await buildOAuth1Header(
  'GET',
  baseUrl,
  consumer.consumer_key,
  consumer.consumer_secret,
  undefined, // No token yet
  undefined, // No token secret yet
  queryParams // Include query params in signature!
);
```

### 2. MFA-Response Ticket-Extraktion

- Verbesserte Logging für Debugging
- Korrektes garth-Pattern: `embed\?ticket=([^"]+)"`
- Fallback-Patterns für alternative Formate
- Fresh CSRF-Token vor MFA-Submit holen

### 3. Verbessertes Error-Logging

- Response-Body bei 401-Fehlern loggen
- Page Title nach MFA prüfen ("Success" erwartet)
- Vollständige Response-Chunks bei Fehlern

## Geänderte Dateien

- `src/lib/garmin/auth.ts`: Hauptänderungen im OAuth1-Flow

## Testen

1. App starten
2. Garmin-Einstellungen öffnen
3. Mit Email/Passwort anmelden
4. 2FA-Code eingeben
5. Login sollte jetzt erfolgreich sein

## Referenzen

- **garth Library:** https://github.com/matin/garth
- **python-garminconnect:** https://github.com/cyberjunky/python-garminconnect
- **GarminDB:** https://github.com/tcgoetz/GarminDB
- **OAuth1 Signature Spec:** Die Signatur-Basis-String muss ALLE Parameter enthalten (RFC 5849)
