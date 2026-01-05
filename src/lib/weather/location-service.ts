/**
 * Location Service - PAKET 12
 * Verwaltet Standort-Einstellungen für Wetter-Abfragen
 */

import { Geolocation } from '@capacitor/geolocation';
import { addLog, getSetting, setSetting } from '@/lib/db';
import type { Location, WeatherSettings } from './types';
import { reverseGeocode } from './client';

const WEATHER_SETTINGS_KEY = 'weather_settings';

/**
 * Standardeinstellungen
 */
const DEFAULT_SETTINGS: WeatherSettings = {
    enabled: true,
    autoSync: true,
    location: undefined,
};

/**
 * Holt die aktuellen Wetter-Einstellungen
 */
export async function getWeatherSettings(): Promise<WeatherSettings> {
    return getSetting(WEATHER_SETTINGS_KEY, DEFAULT_SETTINGS);
}

/**
 * Speichert die Wetter-Einstellungen
 */
export async function saveWeatherSettings(
    settings: Partial<WeatherSettings>
): Promise<void> {
    const current = await getWeatherSettings();
    await setSetting(WEATHER_SETTINGS_KEY, { ...current, ...settings });
    await addLog('info', 'Weather settings updated', settings);
}

/**
 * Holt den gespeicherten Standort
 */
export async function getSavedLocation(): Promise<Location | undefined> {
    const settings = await getWeatherSettings();
    return settings.location;
}

/**
 * Speichert einen neuen Standort
 */
export async function saveLocation(location: Location): Promise<void> {
    await saveWeatherSettings({ location });
    await addLog('info', 'Location saved', location);
}

/**
 * Ermittelt den aktuellen Standort via GPS
 */
export async function getCurrentLocation(): Promise<Location | null> {
    try {
        // Prüfe ob Berechtigung vorhanden ist
        const permission = await Geolocation.checkPermissions();

        if (permission.location === 'denied') {
            const request = await Geolocation.requestPermissions();
            if (request.location !== 'granted') {
                await addLog('warn', 'Location permission denied');
                return null;
            }
        }

        // Hole aktuelle Position
        const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false, // Für Wetter reicht grobe Position
            timeout: 10000,
        });

        const { latitude, longitude } = position.coords;

        // Reverse Geocoding für Stadtname
        const cityName = await reverseGeocode(latitude, longitude);

        const location: Location = {
            lat: Math.round(latitude * 1000) / 1000, // 3 Dezimalstellen reichen
            lon: Math.round(longitude * 1000) / 1000,
            name: cityName || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
        };

        await addLog('info', 'Current location detected', location);
        return location;
    } catch (error) {
        await addLog('error', 'Failed to get current location', {
            error: String(error),
        });
        return null;
    }
}

/**
 * Ermittelt Standort und speichert ihn (einmalige Abfrage)
 */
export async function detectAndSaveLocation(): Promise<Location | null> {
    const location = await getCurrentLocation();

    if (location) {
        await saveLocation(location);
    }

    return location;
}

/**
 * Prüft ob ein Standort gesetzt ist
 */
export async function hasLocation(): Promise<boolean> {
    const location = await getSavedLocation();
    return location !== undefined;
}

/**
 * Löscht den gespeicherten Standort
 */
export async function clearLocation(): Promise<void> {
    await saveWeatherSettings({ location: undefined });
    await addLog('info', 'Location cleared');
}

/**
 * Prüft ob Wetter-Sync aktiviert ist
 */
export async function isWeatherSyncEnabled(): Promise<boolean> {
    const settings = await getWeatherSettings();
    return settings.enabled && settings.location !== undefined;
}

/**
 * Aktiviert/Deaktiviert Wetter-Sync
 */
export async function setWeatherSyncEnabled(enabled: boolean): Promise<void> {
    await saveWeatherSettings({ enabled });
}

/**
 * Setzt Auto-Sync Einstellung
 */
export async function setAutoSync(autoSync: boolean): Promise<void> {
    await saveWeatherSettings({ autoSync });
}

/**
 * Deutsche Städte für schnelle Auswahl (ohne Geolocation)
 */
export const PRESET_CITIES: Location[] = [
    { lat: 52.52, lon: 13.405, name: 'Berlin, Deutschland' },
    { lat: 48.137, lon: 11.576, name: 'München, Deutschland' },
    { lat: 50.938, lon: 6.96, name: 'Köln, Deutschland' },
    { lat: 53.551, lon: 9.994, name: 'Hamburg, Deutschland' },
    { lat: 50.111, lon: 8.682, name: 'Frankfurt am Main, Deutschland' },
    { lat: 48.775, lon: 9.182, name: 'Stuttgart, Deutschland' },
    { lat: 51.228, lon: 6.773, name: 'Düsseldorf, Deutschland' },
    { lat: 51.339, lon: 12.373, name: 'Leipzig, Deutschland' },
    { lat: 51.054, lon: 13.738, name: 'Dresden, Deutschland' },
    { lat: 52.375, lon: 9.732, name: 'Hannover, Deutschland' },
    { lat: 47.376, lon: 8.541, name: 'Zürich, Schweiz' },
    { lat: 48.208, lon: 16.373, name: 'Wien, Österreich' },
];
