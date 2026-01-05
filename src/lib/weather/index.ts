/**
 * Weather Module - PAKET 12
 * Export aller Weather-bezogenen Funktionen und Typen
 */

// Types
export type {
    WeatherData,
    Location,
    TemperatureData,
    WeatherSyncStatus,
    WeatherSettings,
    WeatherSyncOptions,
} from './types';

export { WMO_WEATHER_CODES, getWeatherDescription } from './types';

// Client
export {
    getHistoricalWeather,
    getWeatherForecast,
    getWeatherForDate,
    searchCities,
    reverseGeocode,
} from './client';

// Location Service
export {
    getWeatherSettings,
    saveWeatherSettings,
    getSavedLocation,
    saveLocation,
    getCurrentLocation,
    detectAndSaveLocation,
    hasLocation,
    clearLocation,
    isWeatherSyncEnabled,
    setWeatherSyncEnabled,
    setAutoSync,
    PRESET_CITIES,
} from './location-service';

// Sync Service
export {
    getLastWeatherSync,
    getWeatherSyncStatus,
    shouldSyncWeather,
    syncTodayWeather,
    syncMissingWeather,
    syncAllMissingWeather,
    autoSyncWeather,
    getWeatherData,
    getWeatherDataRange,
    clearWeatherData,
    getWeatherStats,
} from './sync-service';
