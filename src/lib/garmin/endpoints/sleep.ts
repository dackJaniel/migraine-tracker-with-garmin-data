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
            message: `[Sleep API] Using displayName: ${displayName} for date ${date}`,
        });

        const response = await garminHttp.get<SleepDataResponse>(
            WELLNESS_ENDPOINTS.SLEEP_DATA(displayName, date)
        );

        const data = response.data as unknown;

        // CHECK: Detect HTML response (Auth failure or wrong endpoint)
        if (typeof data === 'string' && data.trim().startsWith('<!DOCTYPE html>')) {
            await db.logs.add({
                timestamp: new Date().toISOString(),
                level: 'warn',
                message: `[Sleep API] Primary endpoint returned HTML for ${date}. Trying alternative endpoint...`,
            });

            // Try alternative endpoint format (without displayName in path)
            try {
                const altResponse = await garminHttp.get<SleepDataResponse>(
                    WELLNESS_ENDPOINTS.SLEEP_DATA_ALT(date)
                );

                if (altResponse.data?.dailySleepDTO) {
                    await db.logs.add({
                        timestamp: new Date().toISOString(),
                        level: 'info',
                        message: `[Sleep API] Alternative endpoint succeeded for ${date}`,
                    });

                    const sleep = altResponse.data.dailySleepDTO;
                    return {
                        sleepTimeMinutes: Math.round((sleep.sleepTimeSeconds || 0) / 60),
                        deepSleepMinutes: Math.round((sleep.deepSleepSeconds || 0) / 60),
                        lightSleepMinutes: Math.round((sleep.lightSleepSeconds || 0) / 60),
                        remSleepMinutes: Math.round((sleep.remSleepSeconds || 0) / 60),
                        awakeSleepMinutes: Math.round((sleep.awakeSleepSeconds || 0) / 60),
                        sleepScore: sleep.sleepScore,
                    };
                }
            } catch (altError) {
                await db.logs.add({
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: `[Sleep API] Both endpoints failed for ${date}. Auth error or no sleep data available.`,
                });
            }

            return null;
        }

        // Cast back to expected type after HTML check
        const sleepData = data as SleepDataResponse;

        // DEBUG: Log raw response to DB (truncate if too large)
        const responseStr = JSON.stringify(sleepData, null, 2);
        await db.logs.add({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `[Sleep API] Response for ${date}: ${responseStr.length > 500 ? responseStr.substring(0, 500) + '...[truncated]' : responseStr}`,
        });

        if (!sleepData?.dailySleepDTO) {
            await db.logs.add({
                timestamp: new Date().toISOString(),
                level: 'warn',
                message: `[Sleep API] No dailySleepDTO in response for ${date}`,
            });
            return null;
        }

        const sleep = sleepData.dailySleepDTO;

        // Convert seconds to minutes
        return {
            sleepTimeMinutes: Math.round((sleep.sleepTimeSeconds || 0) / 60),
            deepSleepMinutes: Math.round((sleep.deepSleepSeconds || 0) / 60),
            lightSleepMinutes: Math.round((sleep.lightSleepSeconds || 0) / 60),
            remSleepMinutes: Math.round((sleep.remSleepSeconds || 0) / 60),
            awakeSleepMinutes: Math.round((sleep.awakeSleepSeconds || 0) / 60),
            sleepScore: sleep.sleepScore,
        };
    } catch (error) {
        console.error(`Failed to get sleep data for ${date}:`, error);
        // Return null for 400 errors (feature not available)
        return null;
    }
}
