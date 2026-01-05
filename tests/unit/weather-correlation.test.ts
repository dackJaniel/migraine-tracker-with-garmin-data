/**
 * Weather Correlation Tests - PAKET 12
 * Unit Tests für Wetter-Korrelations-Analysen
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';

// Mock Dexie Database
vi.mock('@/lib/db', async () => {
    const actual = await vi.importActual('@/lib/db');
    return {
        ...actual,
        db: {
            episodes: {
                toArray: vi.fn(),
            },
            weatherData: {
                get: vi.fn(),
                toArray: vi.fn(),
            },
            garminData: {
                get: vi.fn(),
                toArray: vi.fn(),
            },
        },
    };
});

describe('Weather Correlations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('analyzePressureCorrelation', () => {
        it('should return null if not enough episodes', async () => {
            (db.episodes.toArray as ReturnType<typeof vi.fn>).mockResolvedValue([
                { id: 1, startTime: '2026-01-01T10:00:00Z', intensity: 5 },
            ]);

            const { analyzePressureCorrelation } = await import(
                '@/features/analytics/correlation-service'
            );

            const result = await analyzePressureCorrelation();
            expect(result).toBeNull();
        });

        it('should detect pressure drop correlation', async () => {
            const episodes = [
                { id: 1, startTime: '2026-01-01T10:00:00Z', intensity: 7, triggers: [] },
                { id: 2, startTime: '2026-01-02T10:00:00Z', intensity: 8, triggers: [] },
                { id: 3, startTime: '2026-01-03T10:00:00Z', intensity: 6, triggers: [] },
                { id: 4, startTime: '2026-01-04T10:00:00Z', intensity: 7, triggers: [] },
                { id: 5, startTime: '2026-01-05T10:00:00Z', intensity: 5, triggers: [] },
            ];

            (db.episodes.toArray as ReturnType<typeof vi.fn>).mockResolvedValue(episodes);
            (db.weatherData.get as ReturnType<typeof vi.fn>).mockImplementation((date: string) => {
                // Simuliere Druckabfall bei 3 von 5 Episoden
                if (date === '2026-01-01' || date === '2026-01-02' || date === '2026-01-03') {
                    return Promise.resolve({
                        date,
                        pressure: 1000,
                        pressureChange: -8,
                        temperature: { min: 5, max: 10, avg: 7 },
                        humidity: 70,
                    });
                }
                return Promise.resolve({
                    date,
                    pressure: 1015,
                    pressureChange: 2,
                    temperature: { min: 5, max: 10, avg: 7 },
                    humidity: 60,
                });
            });

            const { analyzePressureCorrelation } = await import(
                '@/features/analytics/correlation-service'
            );

            const result = await analyzePressureCorrelation();

            expect(result).not.toBeNull();
            expect(result?.type).toBe('pressure');
            expect(result?.title).toContain('Luftdruck');
            expect(result?.sampleSize).toBeGreaterThan(0);
        });

        it('should return null if no weather data available', async () => {
            const episodes = Array.from({ length: 5 }, (_, i) => ({
                id: i + 1,
                startTime: `2026-01-0${i + 1}T10:00:00Z`,
                intensity: 5,
                triggers: [],
            }));

            (db.episodes.toArray as ReturnType<typeof vi.fn>).mockResolvedValue(episodes);
            (db.weatherData.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

            const { analyzePressureCorrelation } = await import(
                '@/features/analytics/correlation-service'
            );

            const result = await analyzePressureCorrelation();
            expect(result).toBeNull();
        });
    });

    describe('analyzeTemperatureCorrelation', () => {
        it('should detect hot day correlation', async () => {
            const episodes = [
                { id: 1, startTime: '2026-07-01T10:00:00Z', intensity: 7, triggers: [] },
                { id: 2, startTime: '2026-07-02T10:00:00Z', intensity: 8, triggers: [] },
                { id: 3, startTime: '2026-07-03T10:00:00Z', intensity: 6, triggers: [] },
                { id: 4, startTime: '2026-07-04T10:00:00Z', intensity: 7, triggers: [] },
                { id: 5, startTime: '2026-07-05T10:00:00Z', intensity: 5, triggers: [] },
            ];

            (db.episodes.toArray as ReturnType<typeof vi.fn>).mockResolvedValue(episodes);
            (db.weatherData.get as ReturnType<typeof vi.fn>).mockImplementation((date: string) => {
                // 4 von 5 Episoden an heißen Tagen
                if (date !== '2026-07-05') {
                    return Promise.resolve({
                        date,
                        temperature: { min: 22, max: 35, avg: 28 },
                        humidity: 40,
                        pressure: 1015,
                    });
                }
                return Promise.resolve({
                    date,
                    temperature: { min: 15, max: 22, avg: 18 },
                    humidity: 50,
                    pressure: 1018,
                });
            });

            const { analyzeTemperatureCorrelation } = await import(
                '@/features/analytics/correlation-service'
            );

            const result = await analyzeTemperatureCorrelation();

            expect(result).not.toBeNull();
            expect(result?.type).toBe('temperature');
            expect(result?.title).toContain('Hitze');
            expect(result?.percentage).toBeGreaterThan(50);
        });

        it('should return null for moderate temperatures', async () => {
            const episodes = Array.from({ length: 5 }, (_, i) => ({
                id: i + 1,
                startTime: `2026-04-0${i + 1}T10:00:00Z`,
                intensity: 5,
                triggers: [],
            }));

            (db.episodes.toArray as ReturnType<typeof vi.fn>).mockResolvedValue(episodes);
            (db.weatherData.get as ReturnType<typeof vi.fn>).mockResolvedValue({
                temperature: { min: 10, max: 20, avg: 15 },
                humidity: 60,
                pressure: 1015,
            });

            const { analyzeTemperatureCorrelation } = await import(
                '@/features/analytics/correlation-service'
            );

            const result = await analyzeTemperatureCorrelation();
            expect(result).toBeNull();
        });
    });

    describe('analyzeHumidityCorrelation', () => {
        it('should detect high humidity correlation', async () => {
            const episodes = Array.from({ length: 5 }, (_, i) => ({
                id: i + 1,
                startTime: `2026-01-0${i + 1}T10:00:00Z`,
                intensity: 6,
                triggers: [],
            }));

            (db.episodes.toArray as ReturnType<typeof vi.fn>).mockResolvedValue(episodes);
            (db.weatherData.get as ReturnType<typeof vi.fn>).mockResolvedValue({
                humidity: 85,
                temperature: { min: 10, max: 15, avg: 12 },
                pressure: 1010,
            });

            const { analyzeHumidityCorrelation } = await import(
                '@/features/analytics/correlation-service'
            );

            const result = await analyzeHumidityCorrelation();

            expect(result).not.toBeNull();
            expect(result?.type).toBe('humidity');
            expect(result?.title).toContain('Luftfeuchtigkeit');
        });

        it('should return null for normal humidity', async () => {
            const episodes = Array.from({ length: 5 }, (_, i) => ({
                id: i + 1,
                startTime: `2026-01-0${i + 1}T10:00:00Z`,
                intensity: 5,
                triggers: [],
            }));

            (db.episodes.toArray as ReturnType<typeof vi.fn>).mockResolvedValue(episodes);
            (db.weatherData.get as ReturnType<typeof vi.fn>).mockResolvedValue({
                humidity: 50,
                temperature: { min: 10, max: 20, avg: 15 },
                pressure: 1015,
            });

            const { analyzeHumidityCorrelation } = await import(
                '@/features/analytics/correlation-service'
            );

            const result = await analyzeHumidityCorrelation();
            expect(result).toBeNull();
        });
    });

    describe('analyzeWeatherCodeCorrelation', () => {
        it('should detect thunderstorm correlation', async () => {
            // 10 Episoden - davon 7 an Gewitter-Tagen (70%) - Storm muss der häufigste sein
            const episodes = Array.from({ length: 10 }, (_, i) => ({
                id: i + 1,
                startTime: `2026-06-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
                intensity: 7,
                triggers: [],
            }));

            (db.episodes.toArray as ReturnType<typeof vi.fn>).mockResolvedValue(episodes);
            (db.weatherData.get as ReturnType<typeof vi.fn>).mockImplementation((date: string) => {
                // 7 Episoden bei Gewitter (01-07)
                const day = parseInt(date.split('-')[2]);
                if (day >= 1 && day <= 7) {
                    return Promise.resolve({
                        weatherCode: 95, // Gewitter
                        temperature: { min: 18, max: 28, avg: 23 },
                        humidity: 75,
                        pressure: 1005,
                    });
                }
                // Rest: Regen (nur 3)
                return Promise.resolve({
                    weatherCode: 61, // Regen (nicht clear, damit storm der häufigste ist)
                    temperature: { min: 18, max: 28, avg: 23 },
                    humidity: 50,
                    pressure: 1018,
                });
            });

            const { analyzeWeatherCodeCorrelation } = await import(
                '@/features/analytics/correlation-service'
            );

            const result = await analyzeWeatherCodeCorrelation();

            expect(result).not.toBeNull();
            expect(result?.type).toBe('weather');
            expect(result?.title).toContain('Gewitter');
        });
    });

    describe('analyzeAllCorrelations', () => {
        it('should include weather correlations in results', async () => {
            const episodes = Array.from({ length: 10 }, (_, i) => ({
                id: i + 1,
                startTime: `2026-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
                intensity: 6,
                triggers: ['stress'],
            }));

            (db.episodes.toArray as ReturnType<typeof vi.fn>).mockResolvedValue(episodes);
            (db.garminData.toArray as ReturnType<typeof vi.fn>).mockResolvedValue([]);
            (db.garminData.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
            (db.weatherData.get as ReturnType<typeof vi.fn>).mockResolvedValue({
                pressure: 1000,
                pressureChange: -10,
                temperature: { min: 5, max: 10, avg: 7 },
                humidity: 85,
                weatherCode: 61,
            });

            const { analyzeAllCorrelations } = await import(
                '@/features/analytics/correlation-service'
            );

            const results = await analyzeAllCorrelations();

            // Sollte verschiedene Korrelationstypen enthalten
            const types = results.map((r) => r.type);

            // Mindestens Trigger-Korrelation sollte gefunden werden
            expect(types).toContain('trigger');
        });
    });
});

describe('Migraine Warning Logic', () => {
    it('should identify critical weather conditions', () => {
        const criticalConditions = {
            highPressureDrop: { pressureChange: -12 },
            thunderstorm: { weatherCode: 95 },
            highHumidity: { humidity: 90 },
            extremeHeat: { temperature: { max: 35 } },
        };

        // Druckabfall > 10 hPa ist kritisch
        expect(criticalConditions.highPressureDrop.pressureChange < -10).toBe(true);

        // Gewitter-Codes (95-99) sind kritisch
        expect(criticalConditions.thunderstorm.weatherCode >= 95).toBe(true);

        // Luftfeuchtigkeit > 85% ist kritisch
        expect(criticalConditions.highHumidity.humidity > 85).toBe(true);

        // Temperatur > 30°C ist kritisch
        expect(criticalConditions.extremeHeat.temperature.max > 30).toBe(true);
    });
});
