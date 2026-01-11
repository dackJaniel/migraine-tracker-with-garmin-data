// Stress & Heart Rate Endpoints - Real Garmin API Implementation
import { garminHttp } from '../http-client';
import { garminAuth } from '../auth';
import { WELLNESS_ENDPOINTS, HRV_ENDPOINTS } from '../constants';
import { db } from '../../db';
import type {
  StressDataResponse,
  HeartRateDataResponse,
  HRVDataResponse
} from '../types';

export interface StressData {
  avgStressLevel: number;
  maxStressLevel: number;
  stressValues?: Array<{ timestamp: number; value: number }>;
}

export interface HeartRateData {
  restingHeartRate?: number;
  maxHeartRate?: number;
  heartRateValues?: Array<{ timestamp: number; value: number }>;
}

export interface HRVData {
  hrvValue?: number;
  lastNightAverage?: number;
  weeklyAverage?: number;
  status?: string;
}

/**
 * Check if response is HTML (Cloudflare challenge or auth failure)
 */
function isHtmlResponse(data: unknown): boolean {
  if (typeof data !== 'string') return false;
  const trimmed = data.trim();
  return trimmed.startsWith('<!DOCTYPE html>') || trimmed.startsWith('<html');
}

/**
 * Get stress data for a specific date
 * @param date - Date in YYYY-MM-DD format
 */
export async function getStressData(date: string): Promise<StressData | null> {
  try {
    const response = await garminHttp.get<StressDataResponse>(
      WELLNESS_ENDPOINTS.STRESS_DATA(date)
    );

    const data = response.data as unknown;

    // CHECK: Detect HTML response (Auth failure)
    if (isHtmlResponse(data)) {
      await db.logs.add({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `[Stress API] Got HTML instead of JSON for ${date} - Authentication failed`,
      });
      return null;
    }

    // Cast back to expected type after HTML check
    const stressData = data as StressDataResponse;

    if (!stressData) {
      return null;
    }

    return {
      avgStressLevel: stressData.avgStressLevel || 0,
      maxStressLevel: stressData.maxStressLevel || 0,
      stressValues: stressData.stressValuesArray?.map(([timestamp, value]) => ({
        timestamp,
        value,
      })),
    };
  } catch (error) {
    console.error(`Failed to get stress data for ${date}:`, error);
    return null;
  }
}

/**
 * Get heart rate data for a specific date
 * @param date - Date in YYYY-MM-DD format
 */
export async function getHeartRates(date: string): Promise<HeartRateData | null> {
  try {
    // Heart Rate endpoint requires displayName in URL path
    const displayName = await garminAuth.getDisplayNameAsync();

    // DEBUG: Log displayName
    await db.logs.add({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `[Heart Rate API] Using displayName: "${displayName}" for date ${date}`,
    });

    // If no displayName available, try resting heart rate endpoint instead
    if (!displayName) {
      await db.logs.add({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `[Heart Rate API] No displayName available, trying resting HR endpoint for ${date}`,
      });

      // Try the resting heart rate endpoint which doesn't require displayName
      try {
        const restingHR = await getRestingHeartRate(date);
        if (restingHR !== null) {
          return {
            restingHeartRate: restingHR,
            maxHeartRate: undefined,
            heartRateValues: undefined,
          };
        }
      } catch (restingError) {
        await db.logs.add({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `[Heart Rate API] Resting HR endpoint also failed for ${date}: ${restingError}`,
        });
      }
      return null;
    }

    const response = await garminHttp.get<HeartRateDataResponse>(
      WELLNESS_ENDPOINTS.HEART_RATE(displayName, date)
    );

    const data = response.data as unknown;

    // CHECK: Detect HTML response (Auth failure)
    if (isHtmlResponse(data)) {
      await db.logs.add({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `[Heart Rate API] Got HTML instead of JSON for ${date} - Authentication failed`,
      });
      return null;
    }

    // Cast back to expected type after HTML check
    const hrData = data as HeartRateDataResponse;

    if (!hrData) {
      await db.logs.add({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `[Heart Rate API] No data in response for ${date}`,
      });
      return null;
    }

    return {
      restingHeartRate: hrData.restingHeartRate,
      maxHeartRate: hrData.maxHeartRate,
      heartRateValues: hrData.heartRateValues?.map(([timestamp, value]) => ({
        timestamp,
        value,
      })),
    };
  } catch (error) {
    console.error(`Failed to get heart rate data for ${date}:`, error);
    return null;
  }
}

/**
 * Get resting heart rate for a specific date
 * @param date - Date in YYYY-MM-DD format
 */
export async function getRestingHeartRate(date: string): Promise<number | null> {
  try {
    const response = await garminHttp.get<{ restingHeartRate?: number }>(
      WELLNESS_ENDPOINTS.RESTING_HR(date)
    );

    const data = response.data;

    // Check for HTML response (Cloudflare block)
    if (!data || isHtmlResponse(data)) {
      return null;
    }

    return data.restingHeartRate || null;
  } catch (error) {
    console.error(`Failed to get resting heart rate for ${date}:`, error);
    return null;
  }
}

/**
 * Get HRV data for a specific date
 * @param date - Date in YYYY-MM-DD format
 */
export async function getHRVData(date: string): Promise<HRVData | null> {
  try {
    const response = await garminHttp.get<HRVDataResponse>(
      HRV_ENDPOINTS.HRV_DATA(date)
    );

    const data = response.data as unknown;

    // CHECK: Detect HTML response (Auth failure)
    if (isHtmlResponse(data)) {
      await db.logs.add({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `[HRV API] Got HTML instead of JSON for ${date} - Authentication failed`,
      });
      return null;
    }

    // Cast back to expected type after HTML check
    const hrvData = data as HRVDataResponse;

    if (!hrvData) {
      await db.logs.add({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `[HRV API] No data in response for ${date}`,
      });
      return null;
    }

    return {
      hrvValue: hrvData.hrvValue,
      lastNightAverage: hrvData.lastNightAverage,
      weeklyAverage: hrvData.weeklyAverage,
      status: hrvData.status,
    };
  } catch (error) {
    console.error(`Failed to get HRV data for ${date}:`, error);
    return null;
  }
}
