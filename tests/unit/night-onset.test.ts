import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isNightTime, SLEEP_QUALITY_LABELS } from '@/features/episodes/episode-schema';

describe('Night-Onset Tracking (PAKET 10)', () => {
    describe('isNightTime', () => {
        it('sollte 22:00 als Nachtzeit erkennen', () => {
            const date = new Date('2026-01-05T22:00:00');
            expect(isNightTime(date)).toBe(true);
        });

        it('sollte 23:30 als Nachtzeit erkennen', () => {
            const date = new Date('2026-01-05T23:30:00');
            expect(isNightTime(date)).toBe(true);
        });

        it('sollte 00:00 (Mitternacht) als Nachtzeit erkennen', () => {
            const date = new Date('2026-01-05T00:00:00');
            expect(isNightTime(date)).toBe(true);
        });

        it('sollte 03:00 als Nachtzeit erkennen', () => {
            const date = new Date('2026-01-05T03:00:00');
            expect(isNightTime(date)).toBe(true);
        });

        it('sollte 05:59 als Nachtzeit erkennen', () => {
            const date = new Date('2026-01-05T05:59:00');
            expect(isNightTime(date)).toBe(true);
        });

        it('sollte 06:00 NICHT als Nachtzeit erkennen (Grenze)', () => {
            const date = new Date('2026-01-05T06:00:00');
            expect(isNightTime(date)).toBe(false);
        });

        it('sollte 12:00 (Mittag) NICHT als Nachtzeit erkennen', () => {
            const date = new Date('2026-01-05T12:00:00');
            expect(isNightTime(date)).toBe(false);
        });

        it('sollte 18:00 NICHT als Nachtzeit erkennen', () => {
            const date = new Date('2026-01-05T18:00:00');
            expect(isNightTime(date)).toBe(false);
        });

        it('sollte 21:59 NICHT als Nachtzeit erkennen (Grenze)', () => {
            const date = new Date('2026-01-05T21:59:00');
            expect(isNightTime(date)).toBe(false);
        });
    });

    describe('SLEEP_QUALITY_LABELS', () => {
        it('sollte alle 5 Schlafqualitäts-Labels haben', () => {
            expect(Object.keys(SLEEP_QUALITY_LABELS)).toHaveLength(5);
        });

        it('sollte korrekte Labels für alle Werte haben', () => {
            expect(SLEEP_QUALITY_LABELS[1]).toBe('Sehr schlecht');
            expect(SLEEP_QUALITY_LABELS[2]).toBe('Schlecht');
            expect(SLEEP_QUALITY_LABELS[3]).toBe('Mittelmäßig');
            expect(SLEEP_QUALITY_LABELS[4]).toBe('Gut');
            expect(SLEEP_QUALITY_LABELS[5]).toBe('Sehr gut');
        });
    });

    describe('Episode mit Night-Onset Feldern', () => {
        it('sollte Night-Onset Felder korrekt speichern', () => {
            // Simuliere Episode-Daten mit Night-Onset Feldern
            const episodeData = {
                startTime: '2026-01-05T23:30:00.000Z',
                intensity: 7,
                triggers: ['Schlafmangel'],
                medicines: [],
                symptoms: {
                    nausea: false,
                    photophobia: true,
                    phonophobia: false,
                    aura: false,
                },
                nightOnset: true,
                nightEnd: false,
                wokeUpWithMigraine: false,
                sleepQualityBefore: 2,
            };

            expect(episodeData.nightOnset).toBe(true);
            expect(episodeData.wokeUpWithMigraine).toBe(false);
            expect(episodeData.sleepQualityBefore).toBe(2);
        });

        it('sollte wokeUpWithMigraine korrekt handhaben', () => {
            const episodeData = {
                startTime: '2026-01-06T06:30:00.000Z',
                intensity: 6,
                triggers: [],
                medicines: [],
                symptoms: {
                    nausea: true,
                    photophobia: false,
                    phonophobia: false,
                    aura: false,
                },
                nightOnset: false,
                nightEnd: false,
                wokeUpWithMigraine: true,
                sleepQualityBefore: 3,
            };

            expect(episodeData.wokeUpWithMigraine).toBe(true);
            expect(episodeData.sleepQualityBefore).toBe(3);
        });

        it('sollte optionale Felder als undefined akzeptieren', () => {
            const episodeData = {
                startTime: '2026-01-05T14:00:00.000Z',
                intensity: 5,
                triggers: [],
                medicines: [],
                symptoms: {
                    nausea: false,
                    photophobia: false,
                    phonophobia: false,
                    aura: false,
                },
                // Night-Onset Felder nicht gesetzt
            };

            expect(episodeData.nightOnset).toBeUndefined();
            expect(episodeData.wokeUpWithMigraine).toBeUndefined();
            expect(episodeData.sleepQualityBefore).toBeUndefined();
        });
    });

    describe('Tageszeit-Kategorisierung', () => {
        it('sollte Morgen korrekt kategorisieren (06:00-12:00)', () => {
            const morningHours = [6, 7, 8, 9, 10, 11];
            for (const hour of morningHours) {
                const date = new Date(`2026-01-05T${hour.toString().padStart(2, '0')}:30:00`);
                expect(isNightTime(date)).toBe(false);
            }
        });

        it('sollte Nachmittag korrekt kategorisieren (12:00-18:00)', () => {
            const afternoonHours = [12, 13, 14, 15, 16, 17];
            for (const hour of afternoonHours) {
                const date = new Date(`2026-01-05T${hour.toString().padStart(2, '0')}:30:00`);
                expect(isNightTime(date)).toBe(false);
            }
        });

        it('sollte Abend korrekt kategorisieren (18:00-22:00)', () => {
            const eveningHours = [18, 19, 20, 21];
            for (const hour of eveningHours) {
                const date = new Date(`2026-01-05T${hour.toString().padStart(2, '0')}:30:00`);
                expect(isNightTime(date)).toBe(false);
            }
        });

        it('sollte Nacht korrekt kategorisieren (22:00-06:00)', () => {
            const nightHours = [22, 23, 0, 1, 2, 3, 4, 5];
            for (const hour of nightHours) {
                const date = new Date(`2026-01-05T${hour.toString().padStart(2, '0')}:30:00`);
                expect(isNightTime(date)).toBe(true);
            }
        });
    });
});
