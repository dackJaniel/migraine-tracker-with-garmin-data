/**
 * Weather API Client - PAKET 12
 * Integration mit Open-Meteo API (kostenlos, kein API Key erforderlich)
 * https://open-meteo.com/
 */

import { format, parseISO, subDays } from 'date-fns';
import { addLog } from '@/lib/db';
import type {
    WeatherData,
    Location,
    OpenMeteoHistoricalResponse,
    OpenMeteoForecastResponse,
} from './types';
import { getWeatherDescription } from './types';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1';
const ARCHIVE_BASE_URL = 'https://archive-api.open-meteo.com/v1';

/**
 * Holt historische Wetterdaten für einen Datumsbereich
 */
export async function getHistoricalWeather(
    startDate: string,
    endDate: string,
    location: Location
): Promise<WeatherData[]> {
    const params = new URLSearchParams({
        latitude: location.lat.toString(),
        longitude: location.lon.toString(),
        start_date: startDate,
        end_date: endDate,
        daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'temperature_2m_mean',
            'precipitation_sum',
            'wind_speed_10m_max',
            'relative_humidity_2m_mean',
            'pressure_msl_mean',
            'uv_index_max',
            'cloud_cover_mean',
        ].join(','),
        timezone: 'Europe/Berlin',
    });

    try {
        // Entscheide welche API zu nutzen ist basierend auf Datum
        // Archive API für Daten älter als 5 Tage, Forecast API für aktuelle
        const today = new Date();
        const startDateObj = parseISO(startDate);
        const daysDiff = Math.floor(
            (today.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
        );

        const baseUrl = daysDiff > 5 ? ARCHIVE_BASE_URL : OPEN_METEO_BASE_URL;
        const endpoint = daysDiff > 5 ? '/archive' : '/forecast';

        const response = await fetch(`${baseUrl}${endpoint}?${params.toString()}`);

        if (!response.ok) {
            const errorText = await response.text();
            await addLog('error', 'Weather API Error', {
                status: response.status,
                error: errorText,
            });
            throw new Error(`Weather API Error: ${response.status}`);
        }

        const data: OpenMeteoHistoricalResponse = await response.json();
        return parseWeatherResponse(data, location);
    } catch (error) {
        await addLog('error', 'Failed to fetch historical weather', {
            error: String(error),
            startDate,
            endDate,
        });
        throw error;
    }
}

/**
 * Holt Wettervorhersage für die nächsten 7 Tage
 */
export async function getWeatherForecast(
    location: Location
): Promise<WeatherData[]> {
    const params = new URLSearchParams({
        latitude: location.lat.toString(),
        longitude: location.lon.toString(),
        daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'temperature_2m_mean',
            'precipitation_sum',
            'wind_speed_10m_max',
            'relative_humidity_2m_mean',
            'pressure_msl_mean',
            'uv_index_max',
            'cloud_cover_mean',
        ].join(','),
        timezone: 'Europe/Berlin',
        forecast_days: '7',
    });

    try {
        const response = await fetch(
            `${OPEN_METEO_BASE_URL}/forecast?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error(`Forecast API Error: ${response.status}`);
        }

        const data: OpenMeteoForecastResponse = await response.json();
        return parseWeatherResponse(data, location);
    } catch (error) {
        await addLog('error', 'Failed to fetch weather forecast', {
            error: String(error),
        });
        throw error;
    }
}

/**
 * Holt Wetterdaten für ein einzelnes Datum
 */
export async function getWeatherForDate(
    date: string,
    location: Location
): Promise<WeatherData | null> {
    try {
        const results = await getHistoricalWeather(date, date, location);
        return results.length > 0 ? results[0] : null;
    } catch (error) {
        await addLog('error', 'Failed to fetch weather for date', {
            error: String(error),
            date,
        });
        return null;
    }
}

/**
 * Berechnet die Luftdruckänderung zum Vortag
 */
export async function calculatePressureChange(
    date: string,
    currentPressure: number,
    location: Location
): Promise<number | undefined> {
    try {
        const previousDate = format(subDays(parseISO(date), 1), 'yyyy-MM-dd');
        const previousWeather = await getWeatherForDate(previousDate, location);

        if (previousWeather?.pressure) {
            return Math.round((currentPressure - previousWeather.pressure) * 10) / 10;
        }
        return undefined;
    } catch {
        return undefined;
    }
}

/**
 * Parst die Open-Meteo API Response in unser WeatherData Format
 */
function parseWeatherResponse(
    response: OpenMeteoHistoricalResponse | OpenMeteoForecastResponse,
    location: Location
): WeatherData[] {
    const { daily } = response;
    const weatherData: WeatherData[] = [];

    for (let i = 0; i < daily.time.length; i++) {
        const weatherCode = daily.weather_code[i];

        weatherData.push({
            date: daily.time[i],
            location,
            temperature: {
                min: daily.temperature_2m_min[i],
                max: daily.temperature_2m_max[i],
                avg: daily.temperature_2m_mean[i],
            },
            humidity: daily.relative_humidity_2m_mean[i],
            pressure: daily.pressure_msl_mean[i],
            pressureChange: undefined, // Wird später berechnet
            precipitation: daily.precipitation_sum[i],
            cloudCover: daily.cloud_cover_mean[i],
            windSpeed: daily.wind_speed_10m_max[i],
            uvIndex: daily.uv_index_max[i],
            weatherCode,
            weatherDescription: getWeatherDescription(weatherCode),
            syncedAt: new Date().toISOString(),
        });
    }

    return weatherData;
}

/**
 * Geocoding: Sucht nach Städten basierend auf einem Suchbegriff
 */
export async function searchCities(query: string): Promise<Location[]> {
    if (query.length < 2) return [];

    const params = new URLSearchParams({
        name: query,
        count: '10',
        language: 'de',
        format: 'json',
    });

    try {
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error(`Geocoding API Error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.results) return [];

        return data.results.map(
            (result: { latitude: number; longitude: number; name: string; country?: string; admin1?: string }) => ({
                lat: result.latitude,
                lon: result.longitude,
                name: [result.name, result.admin1, result.country]
                    .filter(Boolean)
                    .join(', '),
            })
        );
    } catch (error) {
        await addLog('error', 'Failed to search cities', {
            error: String(error),
            query,
        });
        return [];
    }
}

/**
 * Reverse Geocoding: Ermittelt Stadtname aus Koordinaten
 */
export async function reverseGeocode(
    lat: number,
    lon: number
): Promise<string | null> {
    try {
        // Open-Meteo hat kein Reverse Geocoding, nutze Nominatim
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=de`
        );

        if (!response.ok) return null;

        const data = await response.json();
        const address = data.address;

        return (
            address?.city ||
            address?.town ||
            address?.village ||
            address?.municipality ||
            null
        );
    } catch {
        return null;
    }
}
