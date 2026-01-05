# PAKET 9: Intensitäts-Verlauf - Abgeschlossen

**Datum:** 2026-01-05  
**Status:** ✅ Abgeschlossen  
**Agent:** UI-CORE

---

## 📋 Übersicht

PAKET 9 implementiert die Möglichkeit, die Intensität einer Migräne-Episode über die Zeit zu dokumentieren und als Timeline darzustellen.

---

## 🎯 Ziel

Ermöglichen, dass Benutzer während einer laufenden Episode die Intensität aktualisieren können, um den Verlauf zu dokumentieren (z.B. "Nach Medikament wurde es besser").

---

## ✅ Implementierte Features

### 1. DB Schema Erweiterung ([db.ts](../src/lib/db.ts))

**Neues Interface:**

```typescript
export interface IntensityEntry {
  timestamp: string; // ISO 8601
  intensity: number; // 1-10
  note?: string; // Optional: "Nach Medikament besser"
}
```

**Episode Interface erweitert:**

```typescript
interface Episode {
  // ... bestehende Felder
  intensity: number; // Aktuelle/letzte Intensität
  intensityHistory?: IntensityEntry[]; // Verlauf
}
```

**Migration:**

- DB Version 3
- Default: `intensityHistory = [{ timestamp: startTime, intensity: initialIntensity }]`

### 2. Episode Schema Erweiterung ([episode-schema.ts](../src/features/episodes/episode-schema.ts))

**Zod Validierung:**

```typescript
intensityHistoryEntry: z.object({
  timestamp: z.string(),
  intensity: z.number().min(1).max(10),
  note: z.string().optional(),
});

intensityHistory: z.array(intensityHistoryEntry).optional();
```

**Helper Functions:**

```typescript
// Durchschnittliche Intensität berechnen
calculateAverageIntensity(history: IntensityEntry[]): number

// Peak Intensität finden
findPeakIntensity(history: IntensityEntry[]): IntensityEntry

// Dauer bis Peak
calculateTimeToPeak(startTime: string, peakEntry: IntensityEntry): number
```

### 3. Intensity Timeline Component ([IntensityTimeline.tsx](../src/features/episodes/IntensityTimeline.tsx))

**Features:**

- **Line Chart:** x-Achse = Zeit, y-Achse = Intensität (1-10)
- **Datenpunkte:** Jeder Eintrag als Punkt mit Emoji
- **Tooltips:** Zeitstempel + Notiz beim Hover
- **Responsive:** Mobile-optimiert mit Recharts ResponsiveContainer

**Darstellung:**

```
10 │    ●───────●
 8 │   /        \
 6 │  ●          ●
 4 │ /            \
 2 │●              ●
   └─────────────────
     0h   2h   4h   6h
```

### 4. Intensity Update Dialog

**Features:**

- Modal-Dialog für Intensitäts-Update
- Slider für neue Intensität
- Optionales Notiz-Feld
- Emoji-Feedback während Auswahl
- "Jetzt speichern" speichert mit aktuellem Timestamp

### 5. Episode Detail View erweitert ([EpisodeDetail.tsx](../src/features/episodes/EpisodeDetail.tsx))

**Zusätzliche Anzeigen:**

- Intensity Timeline Chart
- Durchschnittliche Intensität (berechnet)
- Peak Intensität mit Zeitpunkt
- Zeit bis Peak
- "Intensität aktualisieren" Button (bei laufenden Episoden)

### 6. EpisodeForm Integration ([EpisodeForm.tsx](../src/features/episodes/EpisodeForm.tsx))

**Neue Features:**

- Initialer History-Eintrag bei Episode-Erstellung
- Update-Modus erhält bestehende History
- Neuer Eintrag bei Intensitäts-Änderung im Edit-Modus

---

## 📊 Analytics Integration

**Neue Analyse-Möglichkeiten:**

```typescript
// Typischer Intensitätsverlauf aggregiert über alle Episoden
getTypicalIntensityCurve(): AggregatedIntensityCurve

// Durchschnittliche Episode-Dauer nach Peak-Intensität
getAverageDurationByPeakIntensity(): Map<number, number>
```

---

## 📁 Erstellte/Geänderte Dateien

| Datei                                         | Aktion                       |
| --------------------------------------------- | ---------------------------- |
| `src/lib/db.ts`                               | Schema erweitert (Version 3) |
| `src/features/episodes/episode-schema.ts`     | IntensityEntry hinzugefügt   |
| `src/features/episodes/IntensityTimeline.tsx` | **Neu erstellt**             |
| `src/features/episodes/EpisodeForm.tsx`       | History-Integration          |
| `src/features/episodes/EpisodeDetail.tsx`     | Timeline + Stats             |
| `tests/unit/intensity-history.test.ts`        | **Neu erstellt**             |

---

## 🧪 Unit Tests

**Datei:** `tests/unit/intensity-history.test.ts` (15 Tests)

**Test-Kategorien:**

1. **IntensityEntry Validation** (3 Tests)
   - Gültige Einträge
   - Ungültige Intensität (0, 11)
   - Timestamp-Format

2. **calculateAverageIntensity** (4 Tests)
   - Leere History
   - Ein Eintrag
   - Mehrere Einträge
   - Rundung auf 1 Dezimalstelle

3. **findPeakIntensity** (3 Tests)
   - Einzelner Peak
   - Mehrere gleiche Peaks (erster wird genommen)
   - Fallende Intensität

4. **calculateTimeToPeak** (3 Tests)
   - Sofortiger Peak (0 Minuten)
   - Peak nach X Stunden
   - Peak am Ende

5. **History Integration** (2 Tests)
   - Neuer Eintrag wird angehängt
   - History bleibt bei Bearbeitung erhalten

---

## 🎨 UI Screenshots

### Intensity Timeline

```
┌─────────────────────────────────────────┐
│ Intensitäts-Verlauf                     │
├─────────────────────────────────────────┤
│  10 ●                                   │
│   8   ●                                 │
│   6     ●                               │
│   4       ●───●                         │
│   2             ●                       │
│     └────┴────┴────┴────┴────┴────     │
│      8:00 10:00 12:00 14:00 16:00      │
├─────────────────────────────────────────┤
│ Ø Intensität: 5.3 | Peak: 10 (08:15)   │
│ Zeit bis Peak: 15 Minuten               │
└─────────────────────────────────────────┘
```

### Update Dialog

```
┌─────────────────────────────────────────┐
│ Intensität aktualisieren                │
├─────────────────────────────────────────┤
│ Aktuelle Intensität: 6 😟              │
│                                         │
│ [────────●────────────] 4               │
│                                         │
│ Notiz (optional):                       │
│ ┌─────────────────────────────────────┐ │
│ │ Nach Ibuprofen besser               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Abbrechen]              [Speichern]    │
└─────────────────────────────────────────┘
```

---

## 🔗 Verwandte Dokumentation

- [Episode_Form_Implementation_2026-01-05.md](Episode_Form_Implementation_2026-01-05.md) - Episode Form
- [PAKET_8_Erweiterte_Symptome_2026-01-05.md](PAKET_8_Erweiterte_Symptome_2026-01-05.md) - Symptom-Tracking
- [README.md](README.md) - Dokumentationsübersicht

---

## 🚀 Nächste Schritte (Optional)

- [ ] Aggregierter "Typischer Verlauf" Chart in Analytics
- [ ] Medikamenten-Wirksamkeit basierend auf Intensitäts-Änderungen
- [ ] Push-Notification zur Erinnerung an Intensitäts-Update

---

**Commit Message:** `feat(episodes): implement intensity history tracking with timeline visualization (PAKET 9)`
