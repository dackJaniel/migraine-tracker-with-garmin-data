import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MigraineDB } from '@/lib/db';

describe('Database Schema', () => {
    let db: MigraineDB;

    beforeEach(async () => {
        // Erstelle temporäre DB für jeden Test
        db = new MigraineDB();
        // Clear alle Tabellen
        await db.episodes.clear();
        await db.garminData.clear();
        await db.settings.clear();
    });

    describe('Episodes Table', () => {
        it('should add episode successfully', async () => {
            const episode = {
                startTime: new Date().toISOString(),
                intensity: 7,
                triggers: ['Stress', 'Schlafmangel'],
                medicines: ['Ibuprofen 400mg'],
                symptoms: {
                    nausea: true,
                    photophobia: true,
                    phonophobia: false,
                    aura: false,
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const id = await db.episodes.add(episode);
            expect(id).toBeTypeOf('number');

            const retrieved = await db.episodes.get(id as number);
            expect(retrieved).toBeDefined();
            expect(retrieved?.intensity).toBe(7);
            expect(retrieved?.triggers).toContain('Stress');
        });

        it('should query episodes by trigger', async () => {
            await db.episodes.bulkAdd([
                {
                    startTime: new Date().toISOString(),
                    intensity: 5,
                    triggers: ['Stress'],
                    medicines: [],
                    symptoms: {
                        nausea: false,
                        photophobia: false,
                        phonophobia: false,
                        aura: false,
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    startTime: new Date().toISOString(),
                    intensity: 8,
                    triggers: ['Wetter'],
                    medicines: [],
                    symptoms: {
                        nausea: false,
                        photophobia: false,
                        phonophobia: false,
                        aura: false,
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ]);

            const stressEpisodes = await db.episodes
                .where('triggers')
                .equals('Stress')
                .toArray();

            expect(stressEpisodes.length).toBe(1);
            expect(stressEpisodes[0].intensity).toBe(5);
        });
    });

    describe('GarminData Table', () => {
        it('should add garmin data with date as primary key', async () => {
            const data = {
                date: '2024-01-01',
                sleepScore: 85,
                steps: 8000,
                syncedAt: new Date().toISOString(),
            };

            await db.garminData.put(data);

            const retrieved = await db.garminData.get('2024-01-01');
            expect(retrieved).toBeDefined();
            expect(retrieved?.sleepScore).toBe(85);
        });

        it('should update existing garmin data', async () => {
            const date = '2024-01-01';
            await db.garminData.put({
                date,
                sleepScore: 80,
                syncedAt: new Date().toISOString(),
            });

            await db.garminData.put({
                date,
                sleepScore: 90,
                syncedAt: new Date().toISOString(),
            });

            const retrieved = await db.garminData.get(date);
            expect(retrieved?.sleepScore).toBe(90);
        });
    });

    describe('Settings Table', () => {
        it('should store and retrieve JSON settings', async () => {
            await db.settings.put({
                key: 'theme',
                value: JSON.stringify({ mode: 'light', accent: 'blue' }),
            });

            const setting = await db.settings.get('theme');
            expect(setting).toBeDefined();

            const parsed = JSON.parse(setting!.value);
            expect(parsed.mode).toBe('light');
        });
    });
});
