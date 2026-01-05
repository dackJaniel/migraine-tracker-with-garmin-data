import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateIntensityStats } from '@/features/episodes/episode-service';
import type { IntensityEntry } from '@/lib/db';

describe('IntensityHistory (PAKET 9)', () => {
  describe('calculateIntensityStats', () => {
    it('sollte leere Stats für leere History zurückgeben', () => {
      const result = calculateIntensityStats([]);

      expect(result.average).toBe(0);
      expect(result.peak).toBe(0);
      expect(result.current).toBe(0);
      expect(result.trend).toBe('stable');
      expect(result.peakTime).toBeNull();
    });

    it('sollte korrekte Stats für einzelnen Eintrag berechnen', () => {
      const history: IntensityEntry[] = [
        { timestamp: '2026-01-05T10:00:00Z', intensity: 5, note: 'Initial' },
      ];

      const result = calculateIntensityStats(history);

      expect(result.average).toBe(5);
      expect(result.peak).toBe(5);
      expect(result.current).toBe(5);
      expect(result.trend).toBe('stable');
      expect(result.peakTime).toBe('2026-01-05T10:00:00Z');
    });

    it('sollte Trend "improving" erkennen wenn Schmerz sinkt', () => {
      const history: IntensityEntry[] = [
        { timestamp: '2026-01-05T10:00:00Z', intensity: 7 },
        { timestamp: '2026-01-05T11:00:00Z', intensity: 5 },
        { timestamp: '2026-01-05T12:00:00Z', intensity: 3 },
      ];

      const result = calculateIntensityStats(history);

      expect(result.trend).toBe('improving');
      expect(result.current).toBe(3);
      expect(result.peak).toBe(7);
    });

    it('sollte Trend "worsening" erkennen wenn Schmerz steigt', () => {
      const history: IntensityEntry[] = [
        { timestamp: '2026-01-05T10:00:00Z', intensity: 3 },
        { timestamp: '2026-01-05T11:00:00Z', intensity: 5 },
        { timestamp: '2026-01-05T12:00:00Z', intensity: 8 },
      ];

      const result = calculateIntensityStats(history);

      expect(result.trend).toBe('worsening');
      expect(result.current).toBe(8);
      expect(result.peak).toBe(8);
    });

    it('sollte Trend "stable" erkennen wenn Schmerz gleich bleibt', () => {
      const history: IntensityEntry[] = [
        { timestamp: '2026-01-05T10:00:00Z', intensity: 5 },
        { timestamp: '2026-01-05T11:00:00Z', intensity: 6 },
        { timestamp: '2026-01-05T12:00:00Z', intensity: 6 },
      ];

      const result = calculateIntensityStats(history);

      expect(result.trend).toBe('stable');
    });

    it('sollte korrekten Durchschnitt berechnen', () => {
      const history: IntensityEntry[] = [
        { timestamp: '2026-01-05T10:00:00Z', intensity: 2 },
        { timestamp: '2026-01-05T11:00:00Z', intensity: 4 },
        { timestamp: '2026-01-05T12:00:00Z', intensity: 6 },
        { timestamp: '2026-01-05T13:00:00Z', intensity: 8 },
      ];

      const result = calculateIntensityStats(history);

      expect(result.average).toBe(5); // (2+4+6+8)/4 = 5
    });

    it('sollte korrekten Peak identifizieren', () => {
      const history: IntensityEntry[] = [
        { timestamp: '2026-01-05T10:00:00Z', intensity: 5 },
        { timestamp: '2026-01-05T11:00:00Z', intensity: 8 },
        { timestamp: '2026-01-05T12:00:00Z', intensity: 6 },
        { timestamp: '2026-01-05T13:00:00Z', intensity: 4 },
      ];

      const result = calculateIntensityStats(history);

      expect(result.peak).toBe(8);
      expect(result.peakTime).toBe('2026-01-05T11:00:00Z');
    });

    it('sollte Verbesserungsrate korrekt berechnen', () => {
      const history: IntensityEntry[] = [
        { timestamp: '2026-01-05T10:00:00Z', intensity: 10 },
        { timestamp: '2026-01-05T12:00:00Z', intensity: 5 },
      ];

      const result = calculateIntensityStats(history);

      expect(result.improvementRate).toBe(50); // 50% Verbesserung
    });

    it('sollte negative Verbesserungsrate bei Verschlechterung zurückgeben', () => {
      const history: IntensityEntry[] = [
        { timestamp: '2026-01-05T10:00:00Z', intensity: 5 },
        { timestamp: '2026-01-05T12:00:00Z', intensity: 10 },
      ];

      const result = calculateIntensityStats(history);

      expect(result.improvementRate).toBe(-100); // 100% Verschlechterung
    });
  });

  describe('IntensityEntry Interface', () => {
    it('sollte timestamp als ISO String speichern', () => {
      const entry: IntensityEntry = {
        timestamp: new Date().toISOString(),
        intensity: 5,
      };

      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('sollte optionale Notiz unterstützen', () => {
      const entryWithNote: IntensityEntry = {
        timestamp: '2026-01-05T10:00:00Z',
        intensity: 5,
        note: 'Nach Medikament',
      };

      const entryWithoutNote: IntensityEntry = {
        timestamp: '2026-01-05T10:00:00Z',
        intensity: 5,
      };

      expect(entryWithNote.note).toBe('Nach Medikament');
      expect(entryWithoutNote.note).toBeUndefined();
    });

    it('sollte Intensität zwischen 1-10 erlauben', () => {
      const validEntries: IntensityEntry[] = [
        { timestamp: '2026-01-05T10:00:00Z', intensity: 1 },
        { timestamp: '2026-01-05T10:00:00Z', intensity: 5 },
        { timestamp: '2026-01-05T10:00:00Z', intensity: 10 },
      ];

      validEntries.forEach(entry => {
        expect(entry.intensity).toBeGreaterThanOrEqual(1);
        expect(entry.intensity).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Episode mit IntensityHistory', () => {
    it('sollte Episode mit initialem IntensityHistory erstellen können', () => {
      const startTime = '2026-01-05T10:00:00Z';
      const initialIntensity = 6;

      const episode = {
        startTime,
        intensity: initialIntensity,
        intensityHistory: [
          {
            timestamp: startTime,
            intensity: initialIntensity,
            note: 'Initial',
          },
        ],
        triggers: [],
        medicines: [],
        symptoms: {
          nausea: false,
          vomiting: false,
          fatigue: false,
          vertigo: false,
          photophobia: false,
          phonophobia: false,
          aura: false,
          visualDisturbance: false,
          concentration: false,
          tinglingNumbness: false,
          speechDifficulty: false,
          neckPain: false,
          custom: [],
        },
      };

      expect(episode.intensityHistory).toHaveLength(1);
      expect(episode.intensityHistory[0].intensity).toBe(episode.intensity);
      expect(episode.intensityHistory[0].timestamp).toBe(episode.startTime);
    });

    it('sollte mehrere IntensityHistory Einträge haben können', () => {
      const history: IntensityEntry[] = [
        { timestamp: '2026-01-05T10:00:00Z', intensity: 5, note: 'Initial' },
        { timestamp: '2026-01-05T11:00:00Z', intensity: 7 },
        { timestamp: '2026-01-05T12:00:00Z', intensity: 8, note: 'Peak' },
        { timestamp: '2026-01-05T14:00:00Z', intensity: 5, note: 'Nach Medikament' },
        { timestamp: '2026-01-05T16:00:00Z', intensity: 3 },
      ];

      expect(history).toHaveLength(5);
      
      const stats = calculateIntensityStats(history);
      expect(stats.peak).toBe(8);
      expect(stats.current).toBe(3);
      expect(stats.trend).toBe('improving');
    });
  });

  describe('DB Migration v3', () => {
    it('sollte alte Episoden ohne IntensityHistory migrieren', () => {
      // Simuliere alte Episode ohne intensityHistory
      const oldEpisode = {
        id: 1,
        startTime: '2026-01-05T10:00:00Z',
        intensity: 6,
        triggers: [],
        medicines: [],
        symptoms: { nausea: false, photophobia: false, phonophobia: false, aura: false },
        createdAt: '2026-01-05T10:00:00Z',
        updatedAt: '2026-01-05T10:00:00Z',
      };

      // Migrations-Logik (wie in db.ts Version 3)
      const migratedEpisode = {
        ...oldEpisode,
        intensityHistory: (oldEpisode as any).intensityHistory || [
          {
            timestamp: oldEpisode.startTime,
            intensity: oldEpisode.intensity,
            note: 'Initial',
          },
        ],
      };

      expect(migratedEpisode.intensityHistory).toHaveLength(1);
      expect(migratedEpisode.intensityHistory[0].intensity).toBe(oldEpisode.intensity);
    });
  });
});
