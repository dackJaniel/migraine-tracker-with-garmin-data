# PAKET 12: Wetterdaten Integration

**Datum:** 2026-01-05
**Status:** ✅ COMPLETED
**Agent:** WEATHER

---

## Übersicht

PAKET 12 implementiert die Wetterdaten-Integration für die Migräne Tracker App. Wetterdaten werden über die kostenlose Open-Meteo API abgerufen und mit Migräne-Episoden korreliert.

---

## Implementierte Features

### 1. Datenbank Schema (v4)

**Datei:** `src/lib/db.ts`

Neue `WeatherData` Tabelle mit folgenden Feldern:

- `date` (Primary Key, YYYY-MM-DD)
- `location` (lat, lon, name)
- `temperature` (min, max, avg in °C)
- `humidity` (%)
- `pressure` (hPa - wichtig für Migräne!)
- `pressureChange` (Δ zum Vortag)
- `precipitation` (mm)
- `cloudCover` (%)
- `windSpeed` (km/h)
- `uvIndex`
- `weatherCode` (WMO Code 0-99)
- `weatherDescription` (Deutsche Beschreibung)
- `syncedAt`

Indizes: `date`, `pressure`, `syncedAt`

### 2. Weather Module (`src/lib/weather/`)

#### `types.ts`

- TypeScript Interfaces für alle Wetter-Daten
- WMO_WEATHER_CODES: 50+ deutsche Übersetzungen (0-99)
- `getWeatherDescription()` Helper-Funktion

#### `client.ts` - Open-Meteo API Client

- `getHistoricalWeather(lat, lon, startDate, endDate)` - Historische Daten
- `getWeatherForecast(lat, lon)` - 7-Tage Vorhersage
- `searchCities(query)` - Stadt-Suche (Open-Meteo Geocoding)
- `reverseGeocode(lat, lon)` - Koordinaten → Stadtname

**API Besonderheiten:**

- Kostenlos, kein API-Key erforderlich
- Rate Limit: 10.000 requests/day
- Archive API für historische Daten (bis 1940!)
- Forecast API für aktuelle + 7 Tage

#### `location-service.ts`

- `getSavedLocation()` - Gespeicherten Standort abrufen
- `saveLocation(location)` - Standort speichern
- `getCurrentLocation()` - Browser Geolocation API
- `PRESET_CITIES` - Vordefinierte deutsche Städte

**Hinweis:** Nutzt Browser Geolocation API statt Capacitor Plugin (Dependency-Konflikt mit dexie-encrypted).

#### `sync-service.ts`

- `syncTodayWeather()` - Heutige Daten abrufen
- `syncMissingWeather(dateRange)` - Historische Daten nachholen
- `syncAllMissingWeather()` - Alle fehlenden Tage synchronisieren
- `autoSyncWeather()` - Automatischer Sync bei App-Start
- `getLastWeatherSyncDate()` - Letzter Sync-Zeitpunkt

### 3. Weather UI Components (`src/features/weather/`)

#### `WeatherCard.tsx` - Dashboard Widget

- Aktuelle Wetterdaten anzeigen
- Temperatur, Luftfeuchtigkeit, Luftdruck
- Wetter-Icon basierend auf WMO Code
- **Migräne-Warnung Badges:**
  - Druckabfall >10 hPa → "Druckabfall" Badge
  - Hoher Stress (nicht implementiert, nur Platzhalter)
- Luftdruck-Trend Anzeige (↑/↓)

#### `WeatherSettings.tsx` - Einstellungen

- Standort-Konfiguration
  - GPS-Erkennung (Browser API)
  - Stadt-Suche mit Autocomplete
  - Vordefinierte deutsche Städte
- Sync-Steuerung
  - Auto-Sync ein/aus
  - "Jetzt synchronisieren" Button
  - Letzter Sync-Zeitpunkt
- "Wetterdaten löschen" Option

#### `WeatherCharts.tsx` - Analytics Charts

3 Tabs mit interaktiven Recharts:

1. **Luftdruck Tab:**
   - Line Chart mit Druckverlauf
   - Referenzlinie bei 1013 hPa (Normaldruck)
   - Migräne-Tage als rote Punkte markiert

2. **Temperatur Tab:**
   - Area Chart (Min/Max als Band)
   - Line für Durchschnitt
   - Migräne-Marker

3. **Luftfeuchtigkeit Tab:**
   - Bar Chart mit Tageswerten
   - Migräne-Tage rot gefärbt
   - Referenzlinien bei 30%/80% (optimal/hoch)

### 4. Korrelations-Engine Erweiterung

**Datei:** `src/features/analytics/correlation-service.ts`

4 neue Korrelations-Funktionen:

#### `analyzePressureCorrelation()`

- Analysiert Luftdruck-Abfälle >10 hPa
- Vergleicht Migräne-Rate bei Druckabfall vs. normal
- Chi-Square Test für Signifikanz

#### `analyzeTemperatureCorrelation()`

- Erkennt "Heiße Tage" (>30°C) Korrelation
- Erkennt "Kalte Tage" (<5°C) Korrelation

#### `analyzeHumidityCorrelation()`

- Hohe Luftfeuchtigkeit (>80%) Analyse
- Niedrige Luftfeuchtigkeit (<30%) Analyse

#### `analyzeWeatherCodeCorrelation()`

- Kategorisiert nach Wetter-Typ:
  - Clear (0-3)
  - Rain (51-67, 80-82)
  - Snow (71-86)
  - Storm (95-99)
  - Fog (45, 48)
- Findet häufigsten Wetter-Typ bei Migränen

### 5. UI Integration

#### Dashboard (`src/pages/Dashboard.tsx`)

- WeatherCard hinzugefügt (rechte Seite)

#### Settings (`src/pages/Settings.tsx`)

- Neuer "Wetter" Tab mit WeatherSettings

#### Analytics (`src/pages/Analytics.tsx`)

- Neuer "Wetter" Tab (6. Tab) mit WeatherCharts
- Korrelations-Insights für Wetter-Faktoren

---

## Erstellte Dateien

### Neue Dateien:

```
src/lib/weather/
├── types.ts           # TypeScript Interfaces + WMO Codes
├── client.ts          # Open-Meteo API Client
├── location-service.ts # Standort-Verwaltung
├── sync-service.ts    # Wetter-Synchronisation
└── index.ts           # Module Exports

src/features/weather/
├── WeatherCard.tsx    # Dashboard Widget
├── WeatherSettings.tsx # Settings UI
├── WeatherCharts.tsx  # Analytics Charts
└── index.ts           # Feature Exports

tests/unit/
├── weather-client.test.ts      # 11 Tests
└── weather-correlation.test.ts # 10 Tests
```

### Modifizierte Dateien:

```
src/lib/db.ts                              # WeatherData Interface + Table
src/features/analytics/correlation-service.ts # 4 neue Korrelations-Funktionen
src/pages/Dashboard.tsx                    # WeatherCard Integration
src/pages/Settings.tsx                     # Wetter Tab
src/pages/Analytics.tsx                    # Wetter Tab
```

---

## Tests

### Unit Tests: 21 Tests

**weather-client.test.ts (11 Tests):**

- API URL Construction
- Parameter Handling
- Response Parsing
- Error Handling
- City Search
- Reverse Geocoding

**weather-correlation.test.ts (10 Tests):**

- Pressure Correlation Detection
- Temperature Correlation (Hot/Moderate)
- Humidity Correlation (High/Normal)
- Weather Code Correlation (Thunderstorm)
- All Correlations Integration
- Critical Weather Condition Logic

### Testergebnis:

```
✓ tests/unit/weather-client.test.ts (11 tests)
✓ tests/unit/weather-correlation.test.ts (10 tests)
```

---

## Technische Entscheidungen

### 1. Open-Meteo API

**Gewählt weil:**

- Kostenlos (kein API-Key)
- Umfangreiche historische Daten
- Zuverlässig und schnell
- WMO Standard Weather Codes

### 2. Browser Geolocation API statt Capacitor

**Grund:** Dependency-Konflikt zwischen `@capacitor/geolocation` und `dexie-encrypted`
**Lösung:** Native Browser API funktioniert sowohl im Web als auch in Capacitor

### 3. Recharts für Visualisierung

**Konsistent mit bestehendem Analytics Code**

### 4. Chi-Square Test für Korrelationen

**Statistisch fundierte Signifikanz-Berechnung**

---

## Bekannte Einschränkungen

1. **GPS-Genauigkeit:** Browser API ist weniger genau als native Capacitor
2. **Offline-Modus:** Keine Wetterdaten ohne Internet
3. **Historische Daten:** Archive API nur bis 3 Monate zurück für kostenlosen Zugang

---

## Nächste Schritte (Optional)

- [ ] Background Sync für Wetterdaten
- [ ] Push-Benachrichtigung bei kritischem Wetter
- [ ] Wetter-Prognose für nächste Tage auf Dashboard
- [ ] Export von Wetterdaten im Backup

---

## Commit

```bash
git add -A && git commit -m "feat(weather): implement weather integration with Open-Meteo API

- Add WeatherData table to Dexie DB (v4)
- Create Open-Meteo API client for historical and forecast data
- Implement location service with browser geolocation
- Add weather sync service with auto-sync capability
- Create WeatherCard dashboard widget with migraine warnings
- Create WeatherSettings for location and sync configuration
- Create WeatherCharts with pressure, temperature, humidity tabs
- Extend correlation service with 4 weather correlations:
  - Pressure drop correlation
  - Temperature correlation (hot/cold)
  - Humidity correlation (high/low)
  - Weather code correlation (storm/rain)
- Integrate weather tab in Settings and Analytics pages
- Add 21 unit tests for weather functionality

Closes #12"
```
