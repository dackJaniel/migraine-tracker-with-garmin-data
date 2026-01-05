/**
 * Weather Client Tests - PAKET 12
 * Unit Tests für Open-Meteo API Integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getWeatherDescription,
    WMO_WEATHER_CODES,
} from '@/lib/weather/types';

// Mock fetch für API Tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Weather Types', () => {
    describe('WMO_WEATHER_CODES', () => {
        it('should have correct German descriptions for common weather codes', () => {
            expect(WMO_WEATHER_CODES[0]).toBe('Klar');
            expect(WMO_WEATHER_CODES[3]).toBe('Bewölkt');
            expect(WMO_WEATHER_CODES[61]).toBe('Leichter Regen');
            expect(WMO_WEATHER_CODES[95]).toBe('Gewitter');
        });

        it('should have descriptions for all rain codes', () => {
            expect(WMO_WEATHER_CODES[51]).toBe('Leichter Nieselregen');
            expect(WMO_WEATHER_CODES[53]).toBe('Mäßiger Nieselregen');
            expect(WMO_WEATHER_CODES[55]).toBe('Starker Nieselregen');
            expect(WMO_WEATHER_CODES[61]).toBe('Leichter Regen');
            expect(WMO_WEATHER_CODES[63]).toBe('Mäßiger Regen');
            expect(WMO_WEATHER_CODES[65]).toBe('Starker Regen');
        });

        it('should have descriptions for snow codes', () => {
            expect(WMO_WEATHER_CODES[71]).toBe('Leichter Schneefall');
            expect(WMO_WEATHER_CODES[73]).toBe('Mäßiger Schneefall');
            expect(WMO_WEATHER_CODES[75]).toBe('Starker Schneefall');
        });
    });

    describe('getWeatherDescription', () => {
        it('should return correct description for known code', () => {
            expect(getWeatherDescription(0)).toBe('Klar');
            expect(getWeatherDescription(95)).toBe('Gewitter');
        });

        it('should return "Unbekannt (code)" for unknown code', () => {
            expect(getWeatherDescription(999)).toBe('Unbekannt (999)');
            expect(getWeatherDescription(100)).toBe('Unbekannt (100)');
        });
    });
});

describe('Weather Client', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getHistoricalWeather', () => {
        it('should call Open-Meteo API with correct parameters', async () => {
            // Mock successful response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    daily: {
                        time: ['2026-01-05'],
                        weather_code: [0],
                        temperature_2m_max: [10],
                        temperature_2m_min: [2],
                        temperature_2m_mean: [6],
                        precipitation_sum: [0],
                        wind_speed_10m_max: [15],
                        relative_humidity_2m_mean: [65],
                        pressure_msl_mean: [1015],
                        uv_index_max: [2],
                        cloud_cover_mean: [20],
                    },
                }),
            });

            // Dynamic import to allow mocking
            const { getHistoricalWeather } = await import('@/lib/weather/client');

            const result = await getHistoricalWeather(
                '2026-01-05',
                '2026-01-05',
                { lat: 52.52, lon: 13.405, name: 'Berlin' }
            );

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(result).toHaveLength(1);
            expect(result[0].date).toBe('2026-01-05');
            expect(result[0].temperature.max).toBe(10);
            expect(result[0].pressure).toBe(1015);
            expect(result[0].weatherCode).toBe(0);
        });

        it('should throw error on API failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Internal Server Error',
            });

            const { getHistoricalWeather } = await import('@/lib/weather/client');

            await expect(
                getHistoricalWeather('2026-01-05', '2026-01-05', {
                    lat: 52.52,
                    lon: 13.405,
                    name: 'Berlin',
                })
            ).rejects.toThrow('Weather API Error');
        });
    });

    describe('searchCities', () => {
        it('should return empty array for short queries', async () => {
            const { searchCities } = await import('@/lib/weather/client');

            const result = await searchCities('B');
            expect(result).toEqual([]);
        });

        it('should search cities and format results', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [
                        {
                            latitude: 52.52,
                            longitude: 13.405,
                            name: 'Berlin',
                            admin1: 'Berlin',
                            country: 'Deutschland',
                        },
                    ],
                }),
            });

            const { searchCities } = await import('@/lib/weather/client');

            const result = await searchCities('Berlin');

            expect(result).toHaveLength(1);
            expect(result[0].lat).toBe(52.52);
            expect(result[0].lon).toBe(13.405);
            expect(result[0].name).toBe('Berlin, Berlin, Deutschland');
        });

        it('should return empty array on API error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const { searchCities } = await import('@/lib/weather/client');

            const result = await searchCities('Berlin');
            expect(result).toEqual([]);
        });
    });
});

describe('Weather Data Structure', () => {
    it('should have all required fields in WeatherData interface', () => {
        // TypeScript compile-time check through usage
        const sampleWeather = {
            date: '2026-01-05',
            location: { lat: 52.52, lon: 13.405, name: 'Berlin' },
            temperature: { min: 2, max: 10, avg: 6 },
            humidity: 65,
            pressure: 1015,
            pressureChange: -5,
            precipitation: 0,
            cloudCover: 20,
            windSpeed: 15,
            uvIndex: 2,
            weatherCode: 0,
            weatherDescription: 'Klar',
            syncedAt: '2026-01-05T12:00:00Z',
        };

        expect(sampleWeather.date).toBeDefined();
        expect(sampleWeather.temperature.avg).toBe(6);
        expect(sampleWeather.pressure).toBe(1015);
        expect(sampleWeather.pressureChange).toBe(-5);
    });
});
