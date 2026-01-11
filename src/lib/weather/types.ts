/**
 * Weather Types - PAKET 12
 * Typdefinitionen für Wetterdaten-Integration
 */

/**
 * Standort-Informationen für Wetterabfragen
 */
export interface Location {
  lat: number;
  lon: number;
  name: string;
}

/**
 * Temperatur-Daten für einen Tag
 */
export interface TemperatureData {
  min: number; // °C
  max: number; // °C
  avg: number; // °C
}

/**
 * Gespeicherte Wetterdaten in der Datenbank
 */
export interface WeatherData {
  date: string; // YYYY-MM-DD (Primary Key)
  location?: Location;
  temperature: TemperatureData;
  humidity: number; // %
  pressure: number; // hPa (Luftdruck - wichtig für Migräne!)
  pressureChange?: number; // hPa Änderung zum Vortag
  precipitation: number; // mm
  cloudCover: number; // %
  windSpeed: number; // km/h
  uvIndex?: number;
  weatherCode: number; // WMO Weather Code
  weatherDescription: string; // "Sonnig", "Bewölkt", etc.
  syncedAt: string; // ISO 8601 Date String
}

/**
 * WMO Weather Interpretation Codes
 * https://open-meteo.com/en/docs
 */
export const WMO_WEATHER_CODES: Record<number, string> = {
  0: 'Klar',
  1: 'Überwiegend klar',
  2: 'Teilweise bewölkt',
  3: 'Bewölkt',
  45: 'Nebel',
  48: 'Nebel mit Reif',
  51: 'Leichter Nieselregen',
  53: 'Mäßiger Nieselregen',
  55: 'Starker Nieselregen',
  56: 'Leichter gefrierender Nieselregen',
  57: 'Starker gefrierender Nieselregen',
  61: 'Leichter Regen',
  63: 'Mäßiger Regen',
  65: 'Starker Regen',
  66: 'Leichter gefrierender Regen',
  67: 'Starker gefrierender Regen',
  71: 'Leichter Schneefall',
  73: 'Mäßiger Schneefall',
  75: 'Starker Schneefall',
  77: 'Schneekörner',
  80: 'Leichte Regenschauer',
  81: 'Mäßige Regenschauer',
  82: 'Starke Regenschauer',
  85: 'Leichte Schneeschauer',
  86: 'Starke Schneeschauer',
  95: 'Gewitter',
  96: 'Gewitter mit leichtem Hagel',
  99: 'Gewitter mit starkem Hagel',
};

/**
 * Übersetzt WMO Weather Code in deutsche Beschreibung
 */
export function getWeatherDescription(code: number): string {
  return WMO_WEATHER_CODES[code] || `Unbekannt (${code})`;
}

/**
 * API Response von Open-Meteo für historische Daten
 */
export interface OpenMeteoHistoricalResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  daily_units: {
    time: string;
    weather_code: string;
    temperature_2m_max: string;
    temperature_2m_min: string;
    temperature_2m_mean: string;
    precipitation_sum: string;
    wind_speed_10m_max: string;
    relative_humidity_2m_mean: string;
    pressure_msl_mean: string;
    uv_index_max: string;
    cloud_cover_mean: string;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    temperature_2m_mean: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    relative_humidity_2m_mean: number[];
    pressure_msl_mean: number[];
    uv_index_max: number[];
    cloud_cover_mean: number[];
  };
}

/**
 * API Response von Open-Meteo für Forecast
 */
export interface OpenMeteoForecastResponse extends OpenMeteoHistoricalResponse {
  // Forecast hat die gleiche Struktur wie Historical
}

/**
 * Wetter-Sync Status
 */
export interface WeatherSyncStatus {
  lastSync: string | null;
  isLoading: boolean;
  error: string | null;
  syncedDays: number;
}

/**
 * Wetter-Einstellungen in der App
 */
export interface WeatherSettings {
  enabled: boolean;
  location?: Location;
  autoSync: boolean;
}

/**
 * Optionen für Wetter-Sync
 */
export interface WeatherSyncOptions {
  startDate: string;
  endDate: string;
  location: Location;
  onProgress?: (current: number, total: number) => void;
}
