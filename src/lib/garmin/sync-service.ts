// Garmin Sync Service - Real API Implementation
import { format, subDays, differenceInDays, parseISO, isValid } from 'date-fns';
import { db, type GarminData } from '../db';
import { garminAuth } from './auth';
import { garminHttp } from './http-client';
import {
  getSleepData,
  getStressData,
  getHeartRates,
  getHRVData,
  getBodyBatterySingleDay,
  getStepsData,
  getHydrationData,
  getRespirationData,
  getSpo2Data,
} from './endpoints';
import { Preferences } from '@capacitor/preferences';
import { SESSION_CONFIG } from './constants';

export interface SyncProgress {
  total: number;
  completed: number;
  currentDate: string;
  errors: Array<{ date: string; error: string }>;
  status: 'idle' | 'syncing' | 'completed' | 'error';
}

export interface SyncStatus {
  lastSyncDate: string | null;
  daysBehind: number;
  totalDaysInDB: number;
  isConnected: boolean;
}

/**
 * Log sync events to database
 */
async function logSync(message: string, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
  try {
    await db.logs.add({
      timestamp: new Date().toISOString(),
      level,
      message: `[Garmin Sync] ${message}`,
    });
  } catch (e) {
    console.error('Failed to log sync:', e);
  }
}

/**
 * Get the last sync date from preferences
 */
async function getLastSyncDate(): Promise<Date | null> {
  try {
    const result = await Preferences.get({ key: SESSION_CONFIG.PREFERENCES_KEY_LAST_SYNC });
    if (result.value) {
      const date = parseISO(result.value);
      return isValid(date) ? date : null;
    }
  } catch (error) {
    console.error('Failed to get last sync date:', error);
  }
  return null;
}

/**
 * Set the last sync date in preferences
 */
async function setLastSyncDate(date: Date): Promise<void> {
  try {
    await Preferences.set({
      key: SESSION_CONFIG.PREFERENCES_KEY_LAST_SYNC,
      value: date.toISOString(),
    });
  } catch (error) {
    console.error('Failed to set last sync date:', error);
  }
}

/**
 * Sync data for a single date
 */
export async function syncSingleDate(date: string): Promise<GarminData | null> {
  const canRequest = await garminHttp.canMakeRequests();
  if (!canRequest) {
    await logSync(`Cannot sync ${date}: No valid session`, 'warn');
    return null;
  }

  await logSync(`Syncing data for ${date}`);

  try {
    // Fetch all metrics in parallel for speed
    const [
      sleepData,
      stressData,
      heartRateData,
      hrvData,
      bodyBattery,
      stepsData,
      hydrationData,
      respirationData,
      spo2Data,
    ] = await Promise.all([
      getSleepData(date).catch(() => null),
      getStressData(date).catch(() => null),
      getHeartRates(date).catch(() => null),
      getHRVData(date).catch(() => null),
      getBodyBatterySingleDay(date).catch(() => null),
      getStepsData(date).catch(() => null),
      getHydrationData(date).catch(() => null),
      getRespirationData(date).catch(() => null),
      getSpo2Data(date).catch(() => null),
    ]);

    // Construct GarminData object
    const garminData: GarminData = {
      date,
      sleepScore: sleepData?.sleepScore,
      sleepStages: sleepData ? {
        deep: sleepData.deepSleepMinutes,
        light: sleepData.lightSleepMinutes,
        rem: sleepData.remSleepMinutes,
        awake: sleepData.awakeSleepMinutes,
      } : undefined,
      stressLevel: stressData ? {
        average: stressData.avgStressLevel,
        max: stressData.maxStressLevel,
      } : undefined,
      restingHR: heartRateData?.restingHeartRate,
      maxHR: heartRateData?.maxHeartRate,
      hrv: hrvData?.hrvValue || hrvData?.lastNightAverage,
      bodyBattery: bodyBattery ? {
        charged: bodyBattery.charged,
        drained: bodyBattery.drained,
        current: bodyBattery.currentValue,
      } : undefined,
      steps: stepsData?.totalSteps,
      hydration: hydrationData?.valueInML,
      respirationRate: respirationData?.avgSleepRespirationValue,
      // Prioritize SpO2 from sleep data, fallback to separate endpoint
      spo2: sleepData?.averageSpO2 ?? spo2Data?.averageSpO2,
      syncedAt: new Date().toISOString(),
    };

    // Save to database (upsert)
    await db.garminData.put(garminData);

    await logSync(`Successfully synced ${date}`);
    return garminData;
  } catch (error) {
    await logSync(`Failed to sync ${date}: ${error}`, 'error');
    throw error;
  }
}

/**
 * Find dates that need syncing
 */
async function findMissingDates(startDate: Date, endDate: Date): Promise<string[]> {
  const missingDates: string[] = [];
  const existingDates = new Set(
    (await db.garminData.toArray()).map(g => g.date)
  );

  let currentDate = startDate;
  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    if (!existingDates.has(dateStr)) {
      missingDates.push(dateStr);
    }
    currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
  }

  return missingDates;
}

/**
 * Sync all missing data from the last sync date to today
 */
export async function syncAllMissingData(
  onProgress?: (progress: SyncProgress) => void,
  daysBack = 30
): Promise<SyncProgress> {
  const progress: SyncProgress = {
    total: 0,
    completed: 0,
    currentDate: '',
    errors: [],
    status: 'idle',
  };

  // Check if we have a valid session
  const isValid = await garminAuth.isSessionValid();
  if (!isValid) {
    await logSync('Cannot sync: No valid session', 'warn');
    progress.status = 'error';
    progress.errors.push({ date: '', error: 'No valid session' });
    onProgress?.(progress);
    return progress;
  }

  progress.status = 'syncing';
  onProgress?.(progress);

  try {
    // Determine date range
    const endDate = new Date();
    const lastSync = await getLastSyncDate();
    const startDate = lastSync
      ? new Date(lastSync.getTime() + 24 * 60 * 60 * 1000) // Day after last sync
      : subDays(endDate, daysBack);

    // Get missing dates
    const missingDates = await findMissingDates(startDate, endDate);
    progress.total = missingDates.length;

    await logSync(`Starting sync for ${missingDates.length} dates`);

    // Sync each date
    for (const date of missingDates) {
      progress.currentDate = date;
      onProgress?.(progress);

      try {
        await syncSingleDate(date);
        progress.completed++;
      } catch (error) {
        progress.errors.push({
          date,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with next date even if one fails
      }

      onProgress?.(progress);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update last sync date
    await setLastSyncDate(endDate);

    progress.status = 'completed';
    await logSync(`Sync completed: ${progress.completed}/${progress.total} dates, ${progress.errors.length} errors`);
  } catch (error) {
    progress.status = 'error';
    await logSync(`Sync failed: ${error}`, 'error');
  }

  onProgress?.(progress);
  return progress;
}

/**
 * Get current sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const lastSyncDate = await getLastSyncDate();
  const totalDaysInDB = await db.garminData.count();
  const isConnected = await garminAuth.isSessionValid();

  let daysBehind = 0;
  if (lastSyncDate) {
    daysBehind = differenceInDays(new Date(), lastSyncDate);
  }

  return {
    lastSyncDate: lastSyncDate ? lastSyncDate.toISOString() : null,
    daysBehind,
    totalDaysInDB,
    isConnected,
  };
}

/**
 * Check if sync is needed (last sync > 24h ago)
 */
export async function isSyncNeeded(): Promise<boolean> {
  const lastSync = await getLastSyncDate();
  if (!lastSync) {
    return true;
  }

  const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
  return hoursSinceSync >= 24;
}

/**
 * Force re-sync of a specific date (overwrites existing data)
 */
export async function resyncDate(date: string): Promise<GarminData | null> {
  await logSync(`Force re-syncing ${date}`);
  return syncSingleDate(date);
}

/**
 * Sync only the most recent days
 */
export async function syncRecentDays(
  days: number,
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncProgress> {
  const progress: SyncProgress = {
    total: days,
    completed: 0,
    currentDate: '',
    errors: [],
    status: 'syncing',
  };

  const isValid = await garminAuth.isSessionValid();
  if (!isValid) {
    progress.status = 'error';
    progress.errors.push({ date: '', error: 'No valid session' });
    onProgress?.(progress);
    return progress;
  }

  onProgress?.(progress);

  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = format(subDays(today, i), 'yyyy-MM-dd');
    progress.currentDate = date;
    onProgress?.(progress);

    try {
      await syncSingleDate(date);
      progress.completed++;
    } catch (error) {
      progress.errors.push({
        date,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    onProgress?.(progress);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  progress.status = 'completed';
  await setLastSyncDate(today);
  onProgress?.(progress);

  return progress;
}
