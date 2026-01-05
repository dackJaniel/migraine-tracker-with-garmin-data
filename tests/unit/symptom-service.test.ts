/**
 * Unit Tests für Symptom Service (PAKET 8)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock für Dexie DB
vi.mock('@/lib/db', () => ({
    db: {
        episodes: {
            toArray: vi.fn(),
        },
        settings: {
            get: vi.fn(),
            put: vi.fn(),
        },
    },
    getSetting: vi.fn(),
    setSetting: vi.fn(),
}));

import { db, getSetting, setSetting } from '@/lib/db';
import {
    getAllCustomSymptoms,
    getCommonCustomSymptoms,
    saveCustomSymptoms,
    analyzeCustomSymptomFrequency,
    getSymptomSuggestions,
} from '@/features/episodes/symptom-service';

describe('Symptom Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getAllCustomSymptoms', () => {
        it('sollte leeres Array zurückgeben wenn keine Symptome vorhanden', async () => {
            vi.mocked(getSetting).mockResolvedValue({
                symptoms: {},
                updatedAt: new Date().toISOString(),
            });

            const result = await getAllCustomSymptoms();
            expect(result).toEqual([]);
        });

        it('sollte Symptome nach Häufigkeit sortiert zurückgeben', async () => {
            vi.mocked(getSetting).mockResolvedValue({
                symptoms: {
                    'Augenflimmern': 5,
                    'Ohrensausen': 3,
                    'Schwitzen': 10,
                },
                updatedAt: new Date().toISOString(),
            });

            const result = await getAllCustomSymptoms();
            expect(result).toEqual(['Schwitzen', 'Augenflimmern', 'Ohrensausen']);
        });
    });

    describe('getCommonCustomSymptoms', () => {
        it('sollte Top N Symptome zurückgeben', async () => {
            vi.mocked(getSetting).mockResolvedValue({
                symptoms: {
                    'A': 10,
                    'B': 8,
                    'C': 6,
                    'D': 4,
                    'E': 2,
                    'F': 1,
                },
                updatedAt: new Date().toISOString(),
            });

            const result = await getCommonCustomSymptoms(3);
            expect(result).toEqual(['A', 'B', 'C']);
        });

        it('sollte Default von 5 verwenden', async () => {
            vi.mocked(getSetting).mockResolvedValue({
                symptoms: {
                    'A': 10,
                    'B': 8,
                    'C': 6,
                    'D': 4,
                    'E': 2,
                    'F': 1,
                },
                updatedAt: new Date().toISOString(),
            });

            const result = await getCommonCustomSymptoms();
            expect(result.length).toBe(5);
        });
    });

    describe('saveCustomSymptoms', () => {
        it('sollte leeres Array ignorieren', async () => {
            await saveCustomSymptoms([]);
            expect(setSetting).not.toHaveBeenCalled();
        });

        it('sollte neue Symptome mit Häufigkeit 1 speichern', async () => {
            vi.mocked(getSetting).mockResolvedValue({
                symptoms: {},
                updatedAt: new Date().toISOString(),
            });

            await saveCustomSymptoms(['Neues Symptom']);

            expect(setSetting).toHaveBeenCalledWith(
                'customSymptoms',
                expect.objectContaining({
                    symptoms: { 'Neues Symptom': 1 },
                })
            );
        });

        it('sollte Häufigkeit für existierende Symptome erhöhen', async () => {
            vi.mocked(getSetting).mockResolvedValue({
                symptoms: { 'Existierend': 5 },
                updatedAt: new Date().toISOString(),
            });

            await saveCustomSymptoms(['Existierend']);

            expect(setSetting).toHaveBeenCalledWith(
                'customSymptoms',
                expect.objectContaining({
                    symptoms: { 'Existierend': 6 },
                })
            );
        });

        it('sollte mehrere Symptome gleichzeitig verarbeiten', async () => {
            vi.mocked(getSetting).mockResolvedValue({
                symptoms: { 'A': 2 },
                updatedAt: new Date().toISOString(),
            });

            await saveCustomSymptoms(['A', 'B', 'C']);

            expect(setSetting).toHaveBeenCalledWith(
                'customSymptoms',
                expect.objectContaining({
                    symptoms: { 'A': 3, 'B': 1, 'C': 1 },
                })
            );
        });

        it('sollte Whitespace trimmen', async () => {
            vi.mocked(getSetting).mockResolvedValue({
                symptoms: {},
                updatedAt: new Date().toISOString(),
            });

            await saveCustomSymptoms(['  Test Symptom  ']);

            expect(setSetting).toHaveBeenCalledWith(
                'customSymptoms',
                expect.objectContaining({
                    symptoms: { 'Test Symptom': 1 },
                })
            );
        });
    });

    describe('analyzeCustomSymptomFrequency', () => {
        it('sollte Häufigkeit aus Episoden berechnen', async () => {
            vi.mocked(db.episodes.toArray).mockResolvedValue([
                { symptoms: { custom: ['A', 'B'] } },
                { symptoms: { custom: ['A', 'C'] } },
                { symptoms: { custom: ['A'] } },
            ] as unknown[]);

            const result = await analyzeCustomSymptomFrequency();

            expect(result).toEqual({
                'A': 3,
                'B': 1,
                'C': 1,
            });
        });

        it('sollte leeres Objekt bei Episoden ohne Custom-Symptome zurückgeben', async () => {
            vi.mocked(db.episodes.toArray).mockResolvedValue([
                { symptoms: { nausea: true } },
                { symptoms: { photophobia: true } },
            ] as unknown[]);

            const result = await analyzeCustomSymptomFrequency();

            expect(result).toEqual({});
        });
    });

    describe('getSymptomSuggestions', () => {
        it('sollte bei leerem Input häufigste Symptome zurückgeben', async () => {
            vi.mocked(getSetting).mockResolvedValue({
                symptoms: { 'A': 5, 'B': 3 },
                updatedAt: new Date().toISOString(),
            });

            const result = await getSymptomSuggestions('');
            expect(result).toEqual(['A', 'B']);
        });

        it('sollte nach Suchtext filtern (case-insensitive)', async () => {
            vi.mocked(getSetting).mockResolvedValue({
                symptoms: {
                    'Augenflimmern': 5,
                    'Ohrensausen': 3,
                    'Augenschmerzen': 2,
                },
                updatedAt: new Date().toISOString(),
            });

            const result = await getSymptomSuggestions('auge');
            expect(result).toEqual(['Augenflimmern', 'Augenschmerzen']);
        });

        it('sollte maxResults respektieren', async () => {
            vi.mocked(getSetting).mockResolvedValue({
                symptoms: {
                    'A': 5,
                    'B': 4,
                    'C': 3,
                    'D': 2,
                    'E': 1,
                },
                updatedAt: new Date().toISOString(),
            });

            const result = await getSymptomSuggestions('', 2);
            expect(result.length).toBe(2);
        });
    });
});
