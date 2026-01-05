# Garmin Data Display Fix - 2026-01-05

## Problem

Die Garmin-Daten werden synchronisiert und in der Datenbank gespeichert (31 Tage in DB), aber in der UI werden fast alle Felder als "Keine Daten" angezeigt, außer Stress zeigt "0".

## Root Cause

Mehrere Garmin API Endpoints erfordern den **displayName** des Benutzers im URL-Pfad, aber der Code hat nur das Datum übergeben. Dadurch gaben die APIs keine Daten zurück und die DB-Einträge wurden mit `undefined` für die meisten Felder gespeichert.

## Durchgeführte Fixes

### 1. **src/lib/garmin/constants.ts** - API Endpoint URLs korrigiert

#### Sleep Data Endpoint

```typescript
// ALT (FALSCH):
SLEEP_DATA: (date: string) => `.../dailySleepData/${date}`;

// NEU (RICHTIG):
SLEEP_DATA: (displayName: string, date: string) =>
  `.../dailySleepData/${displayName}?date=${date}&nonSleepBufferMinutes=60`;
```

#### Heart Rate Endpoint

```typescript
// ALT (FALSCH):
HEART_RATE: (date: string) => `.../dailyHeartRate/${date}`;

// NEU (RICHTIG):
HEART_RATE: (displayName: string, date: string) =>
  `.../dailyHeartRate/${displayName}?date=${date}`;
```

#### Daily Summary Endpoint

```typescript
// ALT (FALSCH):
DAILY_SUMMARY: (date: string) => `.../dailySummaryChart/${date}`;

// NEU (RICHTIG):
DAILY_SUMMARY: (displayName: string, date: string) =>
  `.../usersummary/daily/${displayName}?calendarDate=${date}`;
```

#### SpO2 Endpoint

```typescript
// ALT (FALSCH - falscher Service):
SPO2: (date: string) => `usersummary-service/wellness/daily/spo2/${date}`;

// NEU (RICHTIG):
SPO2: (date: string) => `wellness-service/wellness/daily/spo2/${date}`;
```

### 2. **src/lib/garmin/auth.ts** - displayName Helper-Funktionen hinzugefügt

```typescript
/**
 * Get display name for API calls that require it in the URL
 */
getDisplayName(): string {
    return this.profile?.displayName || 'user';
}

/**
 * Get display name async - loads from preferences if not in memory
 */
async getDisplayNameAsync(): Promise<string> {
    if (this.profile?.displayName) {
        return this.profile.displayName;
    }
    // Try to load from preferences
    // ... (loads from stored profile)
    return 'user';
}
```

### 3. **Endpoint-Dateien aktualisiert**

#### src/lib/garmin/endpoints/sleep.ts

```typescript
import { garminAuth } from '../auth'; // NEU

export async function getSleepData(date: string): Promise<SleepData | null> {
  const displayName = await garminAuth.getDisplayNameAsync(); // NEU
  const response = await garminHttp.get<SleepDataResponse>(
    WELLNESS_ENDPOINTS.SLEEP_DATA(displayName, date) // NEU: displayName hinzugefügt
  );
  // ...
}
```

#### src/lib/garmin/endpoints/stress.ts

```typescript
import { garminAuth } from '../auth'; // NEU

export async function getHeartRates(
  date: string
): Promise<HeartRateData | null> {
  const displayName = await garminAuth.getDisplayNameAsync(); // NEU
  const response = await garminHttp.get<HeartRateDataResponse>(
    WELLNESS_ENDPOINTS.HEART_RATE(displayName, date) // NEU
  );
  // ...
}
```

#### src/lib/garmin/endpoints/activity.ts

```typescript
import { garminAuth } from '../auth'; // NEU

export async function getStepsData(date: string): Promise<StepsData | null> {
  const displayName = await garminAuth.getDisplayNameAsync(); // NEU
  const response = await garminHttp.get<StepsDataResponse>(
    WELLNESS_ENDPOINTS.DAILY_SUMMARY(displayName, date) // NEU
  );
  // ...
}

export async function getUserSummary(
  date: string
): Promise<DailySummary | null> {
  const displayName = await garminAuth.getDisplayNameAsync(); // NEU
  const response = await garminHttp.get<DailySummaryResponse>(
    USER_SUMMARY_ENDPOINTS.USER_SUMMARY(displayName, date) // NEU
  );
  // ...
}
```

### 4. **src/pages/Settings.tsx** - Debug-Funktion hinzugefügt

Neue Funktion `handleDebugGarminData()` im Debug-Tab, die:

- Alle Garmin-Daten aus der DB liest
- In die Browser-Console loggt
- Statistiken über vorhandene Felder zeigt

## Deployment-Anleitung

### Schritt 1: Build & Deploy

```bash
cd /home/daniel/Desktop/garmin
npm run build
./deploy.sh
```

### Schritt 2: App neu installieren

- APK auf Android-Gerät übertragen und installieren
- Oder: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`

### Schritt 3: Daten neu synchronisieren

**WICHTIG:** Die alten Daten in der DB wurden mit falschen API-URLs abgerufen und sind daher unvollständig (alle Felder `undefined`).

#### Option A: Vollständige Neu-Synchronisation (empfohlen)

1. App öffnen → Garmin-Seite
2. "Vollständig synchronisieren" Button drücken
3. Dies überschreibt alle 31 Tage mit korrekten Daten von den reparierten APIs

#### Option B: Datenbank leeren und neu syncen

1. App öffnen → Einstellungen → Daten Tab
2. "Alle Daten löschen" (nur Garmin-Daten oder komplett)
3. Zurück zu Garmin-Seite → "Vollständig synchronisieren"

### Schritt 4: Überprüfung

1. **Garmin-Seite öffnen** → Datum-Navigation nutzen
2. **Prüfen ob Daten angezeigt werden:**
   - Sleep Score (sollte nicht mehr "Keine Daten" sein)
   - Schlafphasen (Balkendiagramm)
   - Stress Ø (sollte echten Wert haben, nicht "0")
   - Ruhe-HR
   - HRV
   - Body Battery
   - Schritte
   - Hydration
   - Atmung
   - SpO2

3. **Debug-Console überprüfen (optional):**
   - Einstellungen → Debug Tab → "Debug Garmin Data"
   - Öffne Browser-Console (F12 in Chrome Remote Debugging)
   - Schaue ob alle Felder Werte haben

## Erwartete API-Antworten

Nach dem Fix sollten die APIs folgende Daten liefern:

### Sleep Data Response

```json
{
  "dailySleepDTO": {
    "sleepTimeSeconds": 28800,
    "deepSleepSeconds": 7200,
    "lightSleepSeconds": 14400,
    "remSleepSeconds": 5400,
    "awakeSleepSeconds": 1800,
    "sleepScore": 85
  }
}
```

### Stress Data Response

```json
{
  "avgStressLevel": 45,
  "maxStressLevel": 78,
  "stressValuesArray": [[timestamp, value], ...]
}
```

### Heart Rate Response

```json
{
  "restingHeartRate": 62,
  "maxHeartRate": 175
}
```

### Steps/Daily Summary Response

```json
{
  "totalSteps": 8540,
  "stepGoal": 10000,
  "totalDistance": 6420
}
```

## Troubleshooting

### Problem: Daten werden immer noch nicht angezeigt

**Mögliche Ursachen:**

1. **Alte APK Version installiert**
   - Lösung: APK neu übertragen und installieren (build timestamp prüfen)

2. **Garmin Profil hat keinen displayName**
   - Lösung: Garmin-Verbindung trennen und neu anmelden
   - Dies lädt das Profil neu mit displayName

3. **API gibt 400 Fehler (Feature not available)**
   - Prüfen: Debug Logs in Einstellungen → Debug Tab
   - Manche Features sind nur mit bestimmten Garmin-Geräten verfügbar
   - Ist aber OK - andere Metriken sollten trotzdem funktionieren

4. **Cache-Problem in Android WebView**
   - Lösung: App-Daten löschen (Android Settings → Apps → Migraine Tracker → Speicher → Daten löschen)
   - Danach PIN neu setzen und Garmin neu verbinden

### Debug-Schritte

1. **Logs prüfen:**

   ```
   Einstellungen → Debug Tab → Logs anschauen
   Schaue nach "[Garmin API]" und "[Garmin Sync]" Einträgen
   ```

2. **API Requests prüfen:**

   ```
   Chrome Remote Debugging (chrome://inspect)
   Network Tab → Filter "garmin"
   Schaue ob URLs jetzt mit displayName sind
   ```

3. **DB Inhalte prüfen:**

   ```
   Einstellungen → Debug Tab → "Debug Garmin Data"
   Console öffnen → Schaue "Field Stats"
   ```

4. **Test mit Demo-Daten:**
   ```
   Garmin-Seite → "Demo-Daten laden" Button
   Diese nutzen nicht die API und sollten immer funktionieren
   ```

## Betroffene Endpoints (Summary)

| Endpoint            | Benötigt displayName | Fix Status     |
| ------------------- | -------------------- | -------------- |
| Sleep Data          | ✅ Ja                | ✅ Fixed       |
| Heart Rate          | ✅ Ja                | ✅ Fixed       |
| Stress Data         | ❌ Nein              | ✅ OK          |
| HRV                 | ❌ Nein              | ✅ OK          |
| Body Battery        | ❌ Nein              | ✅ OK          |
| Steps/Daily Summary | ✅ Ja                | ✅ Fixed       |
| User Summary        | ✅ Ja                | ✅ Fixed       |
| Hydration           | ❌ Nein              | ✅ OK          |
| Respiration         | ❌ Nein              | ✅ OK          |
| SpO2                | ❌ Nein              | ✅ Fixed (URL) |

## Weitere Verbesserungen (für später)

Diese sind nicht Teil dieses Fixes, aber könnten in Zukunft helfen:

1. **Response Type Updates:** Einige Response-Strukturen haben zusätzliche Felder (calendarDate, bodyBatteryValuesArray)
2. **Error Handling:** Bessere Fehlermeldungen wenn displayName fehlt
3. **Retry Logic:** Automatisches Re-Login wenn displayName nicht verfügbar
4. **UI Feedback:** Zeige User welche Metriken verfügbar sind (grünes Häkchen vs. graues Icon)

## Testing Checklist

- [ ] App neu gebaut und deployed
- [ ] APK auf Gerät installiert
- [ ] Garmin-Verbindung getrennt und neu verbunden
- [ ] Vollständige Synchronisation durchgeführt
- [ ] Sleep Data wird angezeigt
- [ ] Heart Rate wird angezeigt
- [ ] Steps werden angezeigt
- [ ] Body Battery wird angezeigt
- [ ] Stress zeigt echten Wert (nicht "0")
- [ ] Debug Logs zeigen erfolgreiche API Calls
- [ ] Mehrere Tage geprüft (nicht nur heute)

---

**Erstellt:** 2026-01-05  
**Status:** Ready for Testing
