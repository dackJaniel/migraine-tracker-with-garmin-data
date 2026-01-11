// Sleep Endpoints - Real Garmin API Implementation
import { garminHttp } from '../http-client';
import { garminAuth } from '../auth';
import { WELLNESS_ENDPOINTS } from '../constants';
import { db } from '../../db';
import type { SleepDataResponse } from '../types';

export interface SleepData {
  sleepTimeMinutes: number;
  deepSleepMinutes: number;
  lightSleepMinutes: number;
  remSleepMinutes: number;
  awakeSleepMinutes: number;
  sleepScore?: number;
}

/**
 * Helper to parse sleep response data
 */
function parseSleepResponse(sleepData: SleepDataResponse): SleepData | null {
  if (!sleepData?.dailySleepDTO) {
    return null;
  }

  const sleep = sleepData.dailySleepDTO;
  return {
    sleepTimeMinutes: Math.round((sleep.sleepTimeSeconds || 0) / 60),
    deepSleepMinutes: Math.round((sleep.deepSleepSeconds || 0) / 60),
    lightSleepMinutes: Math.round((sleep.lightSleepSeconds || 0) / 60),
    remSleepMinutes: Math.round((sleep.remSleepSeconds || 0) / 60),
    awakeSleepMinutes: Math.round((sleep.awakeSleepSeconds || 0) / 60),
    sleepScore: sleep.sleepScore,
  };
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
 * Get sleep data for a specific date
 * @param date - Date in YYYY-MM-DD format
 */
export async function getSleepData(date: string): Promise<SleepData | null> {
  try {
    // Sleep endpoint requires displayName in URL path
    const displayName = await garminAuth.getDisplayNameAsync();

    // DEBUG: Log displayName
    await db.logs.add({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `[Sleep API] Using displayName: "${displayName}" for date ${date}`,
    });

    // If displayName is empty, skip primary endpoint and go straight to alternative
    if (!displayName) {
      await db.logs.add({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `[Sleep API] No displayName available, using alternative endpoint for ${date}`,
      });
    } else {
      // Try primary endpoint with displayName
      try {
        const response = await garminHttp.get<SleepDataResponse>(
          WELLNESS_ENDPOINTS.SLEEP_DATA(displayName, date)
        );

        const data = response.data as unknown;

        // CHECK: Detect HTML response (Auth failure or wrong endpoint)
        if (!isHtmlResponse(data)) {
          const result = parseSleepResponse(data as SleepDataResponse);
          if (result) {
            await db.logs.add({
              timestamp: new Date().toISOString(),
              level: 'info',
              message: `[Sleep API] Primary endpoint succeeded for ${date}`,
            });
            return result;
          }
        } else {
          await db.logs.add({
            timestamp: new Date().toISOString(),
            level: 'warn',
            message: `[Sleep API] Primary endpoint returned HTML for ${date}. Trying alternative endpoint...`,
          });
        }
      } catch (primaryError) {
        await db.logs.add({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: `[Sleep API] Primary endpoint failed for ${date}: ${primaryError}. Trying alternative...`,
        });
      }
    }

    // Try alternative endpoint format (without displayName in path)
    try {
      const altResponse = await garminHttp.get<SleepDataResponse>(
        WELLNESS_ENDPOINTS.SLEEP_DATA_ALT(date)
      );

      const altData = altResponse.data as unknown;

      if (isHtmlResponse(altData)) {
        await db.logs.add({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `[Sleep API] Alternative endpoint also returned HTML for ${date}. Auth failed.`,
        });
        return null;
      }

      const result = parseSleepResponse(altData as SleepDataResponse);
      if (result) {
        await db.logs.add({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `[Sleep API] Alternative endpoint succeeded for ${date}`,
        });
        return result;
      }
    } catch (altError) {
      await db.logs.add({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `[Sleep API] Both endpoints failed for ${date}. Auth error or no sleep data available.`,
      });
    }

    return null;
  } catch (error) {
    console.error(`Failed to get sleep data for ${date}:`, error);
    return null;
  }
}
