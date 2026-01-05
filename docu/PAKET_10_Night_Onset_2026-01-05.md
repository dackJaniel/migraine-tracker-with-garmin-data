# PAKET 10: Night-Onset Tracking - Abschlussdokumentation

**Datum:** 2026-01-05  
**Status:** ✅ Abgeschlossen  
**Dauer:** ~30 Minuten

---

## Ziel

Erfassen ob Migräne in der Nacht begonnen oder geendet hat, um Zusammenhänge zwischen Schlaf und Migräne besser zu verstehen.

---

## Implementierte Features

### 1. DB Schema Erweiterung

**Datei:** `src/lib/db.ts`

Neue Felder im Episode Interface:

```typescript
interface Episode {
  // ... bestehende Felder
  nightOnset?: boolean; // Beginn während Schlaf (22:00-06:00)
  nightEnd?: boolean; // Ende während Schlaf
  wokeUpWithMigraine?: boolean; // Aufgewacht mit Migräne
  sleepQualityBefore?: number; // 1-5 Schlafqualität vor Episode
}
```

**Hinweis:** Keine DB Migration nötig, da alle neuen Felder optional sind (rückwärtskompatibel).

### 2. Episode Schema Erweiterung

**Datei:** `src/features/episodes/episode-schema.ts`

Neue Zod Validierung:

```typescript
nightOnset: z.boolean().optional(),
wokeUpWithMigraine: z.boolean().optional(),
sleepQualityBefore: z.number().min(1).max(5).optional().nullable(),
```

Neue Helper-Funktion:

```typescript
export function isNightTime(date: Date): boolean {
  const hours = date.getHours();
  return hours >= 22 || hours < 6;
}
```

Neue Konstante:

```typescript
export const SLEEP_QUALITY_LABELS: Record<number, string> = {
  1: 'Sehr schlecht',
  2: 'Schlecht',
  3: 'Mittelmäßig',
  4: 'Gut',
  5: 'Sehr gut',
};
```

### 3. EpisodeForm UI

**Datei:** `src/features/episodes/EpisodeForm.tsx`

Neue UI-Komponenten:

- **Nacht-Tracking Card** mit Moon-Icon
- **Auto-Detect:** Wenn Startzeit zwischen 22:00-06:00 liegt, wird `nightOnset` automatisch aktiviert
- **Checkbox:** "Während der Nacht begonnen"
- **Checkbox:** "Mit Migräne aufgewacht"
- **Schlafqualität:** 5-Sterne Rating (nur sichtbar wenn nightOnset oder wokeUpWithMigraine aktiv)
- **Hinweis-Box:** Zeigt an wenn Startzeit in der Nacht liegt

### 4. Analytics Erweiterung

**Datei:** `src/features/analytics/correlation-service.ts`

Neue Funktionen:

1. **`analyzeNightOnsetCorrelation()`**
   - Analysiert prozentuale Verteilung von Nacht-Migränen
   - Korreliert mit Garmin Sleep Score
   - Gibt signifikante Muster zurück

2. **`analyzeTimeOfDayDistribution()`**
   - Kategorisiert Episoden nach Tageszeit:
     - Morgen (06:00-12:00)
     - Nachmittag (12:00-18:00)
     - Abend (18:00-22:00)
     - Nacht (22:00-06:00)

Neuer Korrelations-Typ:

```typescript
type: 'sleep' | 'stress' | 'hrv' | 'trigger' | 'bodyBattery' | 'nightOnset';
```

### 5. Unit Tests

**Datei:** `tests/unit/night-onset.test.ts`

18 Tests in 4 Kategorien:

- **isNightTime:** 9 Tests für Grenzwerte und Tageszeiten
- **SLEEP_QUALITY_LABELS:** 2 Tests für Label-Mapping
- **Episode mit Night-Onset Feldern:** 3 Tests für Datenstruktur
- **Tageszeit-Kategorisierung:** 4 Tests für alle 4 Tageszeiten

---

## Geänderte Dateien

| Datei                                           | Änderungstyp                |
| ----------------------------------------------- | --------------------------- |
| `src/lib/db.ts`                                 | Schema erweitert            |
| `src/features/episodes/episode-schema.ts`       | Validierung + Helper        |
| `src/features/episodes/EpisodeForm.tsx`         | UI für Night-Tracking       |
| `src/features/analytics/correlation-service.ts` | Neue Analyse-Funktionen     |
| `tests/unit/night-onset.test.ts`                | Neue Test-Datei             |
| `PROJECT_PLAN.md`                               | Todos als erledigt markiert |

---

## Bekannte Einschränkungen

1. **Keine Migration:** Da alle Felder optional sind, werden bestehende Episoden keine Night-Onset Daten haben
2. **Auto-Detect:** Basiert nur auf Startzeit, nicht auf Benutzer-Schlafzeiten
3. **Schlafqualität:** Subjektive Einschätzung, nicht aus Garmin-Daten

---

## Nächste Schritte (Optional)

- [ ] Chart für Tageszeit-Verteilung in Analytics-Dashboard einbauen
- [ ] Garmin Sleep Score automatisch als Schlafqualität übernehmen
- [ ] Personalisierte Nacht-Definition (z.B. 23:00-07:00 statt 22:00-06:00)

---

## Test-Ergebnisse

```
✓ tests/unit/night-onset.test.ts (18 tests) 10ms
   ✓ Night-Onset Tracking (PAKET 10) (18)
     ✓ isNightTime (9)
     ✓ SLEEP_QUALITY_LABELS (2)
     ✓ Episode mit Night-Onset Feldern (3)
     ✓ Tageszeit-Kategorisierung (4)

 Test Files  1 passed (1)
      Tests  18 passed (18)
```
