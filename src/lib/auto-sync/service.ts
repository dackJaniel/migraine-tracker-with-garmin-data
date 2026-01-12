/**
 * Auto-Sync Service
 * Syncs Garmin and Weather data on app open if needed (>24h since last sync)
 */
import { getSetting, setSetting, addLog } from '@/lib/db';
import { syncAllMissingData as syncGarmin, isSyncNeeded as isGarminSyncNeeded } from '@/lib/garmin/sync-service';
import { garminAuth } from '@/lib/garmin/auth';
import { autoSyncWeather, shouldSyncWeather } from '@/lib/weather/sync-service';

const AUTO_SYNC_ENABLED_KEY = 'auto_sync_enabled';
const LAST_AUTO_SYNC_KEY = 'last_auto_sync';

export interface AutoSyncStatus {
  enabled: boolean;
  lastSync: string | null;
  isSyncing: boolean;
}

// In-memory syncing state (not persisted)
let isSyncing = false;

/**
 * Check if auto-sync is enabled
 */
export async function isAutoSyncEnabled(): Promise<boolean> {
  return getSetting<boolean>(AUTO_SYNC_ENABLED_KEY, true); // Default: enabled
}

/**
 * Enable or disable auto-sync
 */
export async function setAutoSyncEnabled(enabled: boolean): Promise<void> {
  await setSetting(AUTO_SYNC_ENABLED_KEY, enabled);
  await addLog('info', `Auto-sync ${enabled ? 'aktiviert' : 'deaktiviert'}`);
}

/**
 * Get last auto-sync timestamp
 */
export async function getLastAutoSync(): Promise<string | null> {
  return getSetting<string | null>(LAST_AUTO_SYNC_KEY, null);
}

/**
 * Get current auto-sync status
 */
export async function getAutoSyncStatus(): Promise<AutoSyncStatus> {
  const [enabled, lastSync] = await Promise.all([
    isAutoSyncEnabled(),
    getLastAutoSync(),
  ]);

  return {
    enabled,
    lastSync,
    isSyncing,
  };
}

/**
 * Perform auto-sync if needed
 * Called on app open
 */
export async function performAutoSyncIfNeeded(): Promise<{
  synced: boolean;
  garmin: boolean;
  weather: boolean;
}> {
  const result = { synced: false, garmin: false, weather: false };

  // Check if enabled
  const enabled = await isAutoSyncEnabled();
  if (!enabled) {
    return result;
  }

  // Prevent concurrent syncs
  if (isSyncing) {
    return result;
  }

  // Check if any sync is needed
  const [garminNeeded, weatherNeeded] = await Promise.all([
    isGarminSyncNeeded().catch(() => false),
    shouldSyncWeather().catch(() => false),
  ]);

  if (!garminNeeded && !weatherNeeded) {
    return result;
  }

  isSyncing = true;
  await addLog('info', 'Auto-sync gestartet');

  try {
    // Sync Garmin if needed and connected
    if (garminNeeded) {
      const isConnected = await garminAuth.isSessionValid();
      if (isConnected) {
        try {
          const progress = await syncGarmin();
          result.garmin = progress.status === 'completed';
        } catch (error) {
          await addLog('error', `Auto-sync Garmin fehlgeschlagen: ${error}`);
        }
      }
    }

    // Sync Weather if needed
    if (weatherNeeded) {
      try {
        const weatherResult = await autoSyncWeather();
        result.weather = weatherResult !== null;
      } catch (error) {
        await addLog('error', `Auto-sync Wetter fehlgeschlagen: ${error}`);
      }
    }

    result.synced = result.garmin || result.weather;

    // Update last sync time
    if (result.synced) {
      await setSetting(LAST_AUTO_SYNC_KEY, new Date().toISOString());
      await addLog('info', `Auto-sync abgeschlossen: Garmin=${result.garmin}, Wetter=${result.weather}`);
    }
  } finally {
    isSyncing = false;
  }

  return result;
}

/**
 * Check if currently syncing
 */
export function isCurrentlySyncing(): boolean {
  return isSyncing;
}
