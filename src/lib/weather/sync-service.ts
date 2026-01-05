/**
 * Weather Sync Service - PAKET 12
 * Synchronisiert Wetterdaten mit der lokalen Datenbank
 */

import { format, subDays, parseISO, addDays } from 'date-fns';
import { db, addLog, getSetting, setSetting } from '@/lib/db';
import type { WeatherData, WeatherSyncStatus } from './types';
import { getHistoricalWeather, getWeatherForDate } from './client';
import { getSavedLocation, isWeatherSyncEnabled } from './location-service';

const LAST_WEATHER_SYNC_KEY = 'last_weather_sync';
const WEATHER_SYNC_STATUS_KEY = 'weather_sync_status';

/**
 * Holt den letzten Sync-Zeitpunkt
 */
export async function getLastWeatherSync(): Promise<string | null> {
    return getSetting<string | null>(LAST_WEATHER_SYNC_KEY, null);
}

/**
 * Speichert den letzten Sync-Zeitpunkt
 */
async function setLastWeatherSync(date: string): Promise<void> {
    await setSetting(LAST_WEATHER_SYNC_KEY, date);
}

/**
 * Holt den Sync-Status
 */
export async function getWeatherSyncStatus(): Promise<WeatherSyncStatus> {
    return getSetting<WeatherSyncStatus>(WEATHER_SYNC_STATUS_KEY, {
        lastSync: null,
        isLoading: false,
        error: null,
        syncedDays: 0,
    });
}

/**
 * Aktualisiert den Sync-Status
 */
async function updateSyncStatus(
    status: Partial<WeatherSyncStatus>
): Promise<void> {
    const current = await getWeatherSyncStatus();
    await setSetting(WEATHER_SYNC_STATUS_KEY, { ...current, ...status });
}

/**
 * Prüft ob ein Sync erforderlich ist (letzter Sync > 24h)
 */
export async function shouldSyncWeather(): Promise<boolean> {
    const enabled = await isWeatherSyncEnabled();
    if (!enabled) return false;

    const lastSync = await getLastWeatherSync();
    if (!lastSync) return true;

    const lastSyncDate = parseISO(lastSync);
    const hoursSinceSync =
        (new Date().getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);

    return hoursSinceSync > 24;
}

/**
 * Synchronisiert das heutige Wetter
 */
export async function syncTodayWeather(): Promise<WeatherData | null> {
    const location = await getSavedLocation();
    if (!location) {
        await addLog('warn', 'No location set for weather sync');
        return null;
    }

    try {
        await updateSyncStatus({ isLoading: true, error: null });

        const today = format(new Date(), 'yyyy-MM-dd');
        const weather = await getWeatherForDate(today, location);

        if (weather) {
            // Berechne Luftdruckänderung
            const previousWeather = await db.weatherData.get(
                format(subDays(new Date(), 1), 'yyyy-MM-dd')
            );

            if (previousWeather?.pressure) {
                weather.pressureChange =
                    Math.round((weather.pressure - previousWeather.pressure) * 10) / 10;
            }

            // Speichere in DB
            await db.weatherData.put(weather);

            await setLastWeatherSync(new Date().toISOString());
            await updateSyncStatus({
                isLoading: false,
                lastSync: new Date().toISOString(),
                syncedDays: 1,
            });

            await addLog('info', 'Today weather synced', { date: today });
            return weather;
        }

        return null;
    } catch (error) {
        const errorMsg = String(error);
        await updateSyncStatus({ isLoading: false, error: errorMsg });
        await addLog('error', 'Failed to sync today weather', { error: errorMsg });
        throw error;
    }
}

/**
 * Synchronisiert fehlende Wetterdaten für einen Datumsbereich
 */
export async function syncMissingWeather(
    startDate: string,
    endDate: string,
    onProgress?: (current: number, total: number) => void
): Promise<number> {
    const location = await getSavedLocation();
    if (!location) {
        await addLog('warn', 'No location set for weather sync');
        return 0;
    }

    try {
        await updateSyncStatus({ isLoading: true, error: null });

        // Ermittle welche Tage fehlen
        const missingDates = await getMissingWeatherDates(startDate, endDate);

        if (missingDates.length === 0) {
            await updateSyncStatus({ isLoading: false });
            return 0;
        }

        await addLog('info', 'Starting weather sync', {
            missingDays: missingDates.length,
            startDate,
            endDate,
        });

        let syncedCount = 0;

        // Gruppiere Daten in Batches von 30 Tagen (API Limit)
        const batches = chunkArray(missingDates, 30);

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            const batchStart = batch[0];
            const batchEnd = batch[batch.length - 1];

            try {
                const weatherData = await getHistoricalWeather(
                    batchStart,
                    batchEnd,
                    location
                );

                // Berechne Luftdruckänderungen und speichere
                for (const weather of weatherData) {
                    const previousDay = format(
                        subDays(parseISO(weather.date), 1),
                        'yyyy-MM-dd'
                    );
                    const previousWeather = await db.weatherData.get(previousDay);

                    if (previousWeather?.pressure) {
                        weather.pressureChange =
                            Math.round(
                                (weather.pressure - previousWeather.pressure) * 10
                            ) / 10;
                    }

                    await db.weatherData.put(weather);
                    syncedCount++;

                    if (onProgress) {
                        onProgress(syncedCount, missingDates.length);
                    }
                }
            } catch (batchError) {
                // Bei Fehler in einem Batch weitermachen
                await addLog('error', 'Batch sync failed', {
                    batchStart,
                    batchEnd,
                    error: String(batchError),
                });
            }
        }

        await setLastWeatherSync(new Date().toISOString());
        await updateSyncStatus({
            isLoading: false,
            lastSync: new Date().toISOString(),
            syncedDays: syncedCount,
        });

        await addLog('info', 'Weather sync completed', { syncedCount });
        return syncedCount;
    } catch (error) {
        const errorMsg = String(error);
        await updateSyncStatus({ isLoading: false, error: errorMsg });
        await addLog('error', 'Weather sync failed', { error: errorMsg });
        throw error;
    }
}

/**
 * Synchronisiert alle fehlenden Wetterdaten (letzte 90 Tage)
 */
export async function syncAllMissingWeather(
    onProgress?: (current: number, total: number) => void
): Promise<number> {
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');

    return syncMissingWeather(startDate, endDate, onProgress);
}

/**
 * Auto-Sync bei App-Start (wenn letzter Sync > 24h)
 */
export async function autoSyncWeather(): Promise<WeatherData | null> {
    const shouldSync = await shouldSyncWeather();

    if (!shouldSync) {
        return null;
    }

    return syncTodayWeather();
}

/**
 * Ermittelt fehlende Wetter-Daten für einen Datumsbereich
 */
async function getMissingWeatherDates(
    startDate: string,
    endDate: string
): Promise<string[]> {
    const existingDates = new Set(
        (await db.weatherData.toArray()).map((w) => w.date)
    );

    const missingDates: string[] = [];
    let currentDate = parseISO(startDate);
    const end = parseISO(endDate);

    while (currentDate <= end) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        if (!existingDates.has(dateStr)) {
            missingDates.push(dateStr);
        }
        currentDate = addDays(currentDate, 1);
    }

    return missingDates;
}

/**
 * Holt Wetterdaten aus der DB für einen Tag
 */
export async function getWeatherData(date: string): Promise<WeatherData | null> {
    const weather = await db.weatherData.get(date);
    return weather || null;
}

/**
 * Holt Wetterdaten aus der DB für einen Datumsbereich
 */
export async function getWeatherDataRange(
    startDate: string,
    endDate: string
): Promise<WeatherData[]> {
    return db.weatherData
        .where('date')
        .between(startDate, endDate, true, true)
        .toArray();
}

/**
 * Löscht alle Wetterdaten
 */
export async function clearWeatherData(): Promise<void> {
    await db.weatherData.clear();
    await setSetting(LAST_WEATHER_SYNC_KEY, null);
    await addLog('info', 'Weather data cleared');
}

/**
 * Gibt Statistiken über gespeicherte Wetterdaten
 */
export async function getWeatherStats(): Promise<{
    totalDays: number;
    oldestDate: string | null;
    newestDate: string | null;
}> {
    const allWeather = await db.weatherData.orderBy('date').toArray();

    return {
        totalDays: allWeather.length,
        oldestDate: allWeather.length > 0 ? allWeather[0].date : null,
        newestDate:
            allWeather.length > 0 ? allWeather[allWeather.length - 1].date : null,
    };
}

/**
 * Teilt ein Array in Chunks
 */
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
