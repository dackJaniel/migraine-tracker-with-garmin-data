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
        const response = await garminHttp.get<SleepDataResponse>(
            WELLNESS_ENDPOINTS.SLEEP_DATA(displayName, date)
        );

        const data = response.data;

        // DEBUG: Log raw response to DB
        await db.logs.add({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `[Sleep API] Response for ${date}: ${JSON.stringify(data, null, 2)}`,
        });

        if (!data?.dailySleepDTO) {
            await db.logs.add({
                timestamp: new Date().toISOString(),
                level: 'warn',
                message: `[Sleep API] No dailySleepDTO in response for ${date}`,
            });
            return null;
        }

        const sleep = data.dailySleepDTO;

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
