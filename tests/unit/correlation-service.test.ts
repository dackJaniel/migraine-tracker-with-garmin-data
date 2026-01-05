import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import {
    analyzeSleepCorrelation,
    analyzeStressCorrelation,
    analyzeHRVCorrelation,
    analyzeBodyBatteryCorrelation,
    analyzeTriggerPatterns,
    analyzeAllCorrelations,
} from '@/features/analytics/correlation-service';
import { format, subDays } from 'date-fns';

describe('Correlation Service', () => {
    beforeEach(async () => {
        // Clear all tables before each test
        await db.episodes.clear();
        await db.garminData.clear();
    });

    afterEach(async () => {
        await db.episodes.clear();
        await db.garminData.clear();
    });

    describe('analyzeSleepCorrelation', () => {
        it('should return null with less than 5 episodes', async () => {
            // Add only 3 episodes
            for (let i = 0; i < 3; i++) {
                await db.episodes.add({
                    startTime: new Date().toISOString(),
                    intensity: 5,
                    triggers: [],
                    medicines: [],
                    symptoms: { nausea: false, photophobia: false, phonophobia: false, aura: false },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }

            const result = await analyzeSleepCorrelation();
            expect(result).toBeNull();
        });

        it('should return correlation data with sufficient episodes and garmin data', async () => {
            // Add 5 episodes with corresponding garmin data
            for (let i = 0; i < 5; i++) {
                const episodeDate = subDays(new Date(), i);
                const previousDay = subDays(episodeDate, 1);

                await db.episodes.add({
                    startTime: episodeDate.toISOString(),
                    intensity: 5,
                    triggers: [],
                    medicines: [],
                    symptoms: { nausea: false, photophobia: false, phonophobia: false, aura: false },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });

                // Add garmin data with low sleep (< 6 hours = 360 minutes)
                await db.garminData.put({
                    date: format(previousDay, 'yyyy-MM-dd'),
                    sleepStages: {
                        deep: 60,
                        light: 120,
                        rem: 60,
                        awake: 30,
                    },
                    syncedAt: new Date().toISOString(),
                });
            }

            const result = await analyzeSleepCorrelation();
            expect(result).not.toBeNull();
            expect(result?.type).toBe('sleep');
            expect(result?.sampleSize).toBeGreaterThan(0);
        });
    });

    describe('analyzeStressCorrelation', () => {
        it('should return null with less than 5 episodes', async () => {
            const result = await analyzeStressCorrelation();
            expect(result).toBeNull();
        });

        it('should detect high stress correlation', async () => {
            for (let i = 0; i < 5; i++) {
                const episodeDate = subDays(new Date(), i);

                await db.episodes.add({
                    startTime: episodeDate.toISOString(),
                    intensity: 7,
                    triggers: [],
                    medicines: [],
                    symptoms: { nausea: false, photophobia: false, phonophobia: false, aura: false },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });

                // Add garmin data with high stress
                await db.garminData.put({
                    date: format(episodeDate, 'yyyy-MM-dd'),
                    stressLevel: {
                        average: 75,
                        max: 95,
                    },
                    syncedAt: new Date().toISOString(),
                });
            }

            const result = await analyzeStressCorrelation();
            expect(result).not.toBeNull();
            expect(result?.type).toBe('stress');
            expect(result?.percentage).toBe(100); // All episodes have high stress
        });
    });

    describe('analyzeHRVCorrelation', () => {
        it('should return null without enough HRV data', async () => {
            // Add episodes but no garmin data
            for (let i = 0; i < 5; i++) {
                await db.episodes.add({
                    startTime: subDays(new Date(), i).toISOString(),
                    intensity: 5,
                    triggers: [],
                    medicines: [],
                    symptoms: { nausea: false, photophobia: false, phonophobia: false, aura: false },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }

            const result = await analyzeHRVCorrelation();
            expect(result).toBeNull();
        });
    });

    describe('analyzeBodyBatteryCorrelation', () => {
        it('should detect low body battery correlation', async () => {
            for (let i = 0; i < 5; i++) {
                const episodeDate = subDays(new Date(), i);

                await db.episodes.add({
                    startTime: episodeDate.toISOString(),
                    intensity: 6,
                    triggers: [],
                    medicines: [],
                    symptoms: { nausea: false, photophobia: false, phonophobia: false, aura: false },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });

                await db.garminData.put({
                    date: format(episodeDate, 'yyyy-MM-dd'),
                    bodyBattery: {
                        charged: 20,
                        drained: 50,
                        current: 25, // Low body battery < 30
                    },
                    syncedAt: new Date().toISOString(),
                });
            }

            const result = await analyzeBodyBatteryCorrelation();
            expect(result).not.toBeNull();
            expect(result?.type).toBe('bodyBattery');
        });
    });

    describe('analyzeTriggerPatterns', () => {
        it('should return empty array with less than 5 episodes', async () => {
            const result = await analyzeTriggerPatterns();
            expect(result).toEqual([]);
        });

        it('should identify frequent triggers', async () => {
            // Add 5 episodes with the same trigger
            for (let i = 0; i < 5; i++) {
                await db.episodes.add({
                    startTime: subDays(new Date(), i).toISOString(),
                    intensity: i < 3 ? 8 : 4, // 3 intense, 2 mild
                    triggers: ['Stress', 'Schlafmangel'],
                    medicines: [],
                    symptoms: { nausea: false, photophobia: false, phonophobia: false, aura: false },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }

            const result = await analyzeTriggerPatterns();
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].type).toBe('trigger');
            expect(result[0].sampleSize).toBe(5);
        });

        it('should filter triggers with less than 3 occurrences', async () => {
            for (let i = 0; i < 5; i++) {
                await db.episodes.add({
                    startTime: subDays(new Date(), i).toISOString(),
                    intensity: 5,
                    triggers: i < 2 ? ['Seltener Trigger'] : ['Häufiger Trigger'],
                    medicines: [],
                    symptoms: { nausea: false, photophobia: false, phonophobia: false, aura: false },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }

            const result = await analyzeTriggerPatterns();
            const seltenerTrigger = result.find((r) => r.title.includes('Seltener'));
            const häufigerTrigger = result.find((r) => r.title.includes('Häufiger'));

            expect(seltenerTrigger).toBeUndefined(); // Less than 3 occurrences
            expect(häufigerTrigger).toBeDefined(); // 3 occurrences
        });
    });

    describe('analyzeAllCorrelations', () => {
        it('should return array of correlation results', async () => {
            // Add enough data for multiple correlation types
            for (let i = 0; i < 6; i++) {
                const episodeDate = subDays(new Date(), i);

                await db.episodes.add({
                    startTime: episodeDate.toISOString(),
                    intensity: 7,
                    triggers: ['Stress'],
                    medicines: ['Ibuprofen'],
                    symptoms: { nausea: true, photophobia: false, phonophobia: false, aura: false },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });

                await db.garminData.put({
                    date: format(episodeDate, 'yyyy-MM-dd'),
                    stressLevel: { average: 80, max: 95 },
                    bodyBattery: { charged: 20, drained: 60, current: 20 },
                    syncedAt: new Date().toISOString(),
                });
            }

            const results = await analyzeAllCorrelations();
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeGreaterThan(0);
        });
    });
});
