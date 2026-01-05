// Activity Endpoints - Real Garmin API Implementation
import { garminHttp } from '../http-client';
import { garminAuth } from '../auth';
import { WELLNESS_ENDPOINTS, USER_SUMMARY_ENDPOINTS } from '../constants';
import { db } from '../../db';
import type {
    BodyBatteryDataResponse,
    StepsDataResponse,
    HydrationDataResponse,
    DailySummaryResponse
} from '../types';

export interface BodyBatteryData {
    charged: number;
    drained: number;
    currentValue: number;
}

export interface StepsData {
    totalSteps: number;
    stepGoal?: number;
    totalDistanceMeters?: number;
}

export interface HydrationData {
    valueInML: number;
    goalInML?: number;
}

export interface DailySummary {
    totalSteps: number;
    stepGoal: number;
    totalDistanceMeters: number;
    totalKilocalories: number;
    activeKilocalories: number;
    floorsAscended: number;
    floorsDescended: number;
    moderateIntensityMinutes: number;
    vigorousIntensityMinutes: number;
}

/**
 * Get body battery data for a date range
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 */
export async function getBodyBattery(
    startDate: string,
    endDate: string
): Promise<BodyBatteryData[] | null> {
    try {
        const response = await garminHttp.get<Array<BodyBatteryDataResponse>>(
            WELLNESS_ENDPOINTS.BODY_BATTERY(startDate, endDate)
        );

        const data = response.data;

        if (!data || !Array.isArray(data)) {
            return null;
        }

        return data.map(entry => ({
            charged: entry.charged || 0,
            drained: entry.drained || 0,
            currentValue: entry.currentValue || 0,
        }));
    } catch (error) {
        console.error(`Failed to get body battery data:`, error);
        return null;
    }
}

/**
 * Get body battery for a single date
 * @param date - Date in YYYY-MM-DD format
 */
export async function getBodyBatterySingleDay(date: string): Promise<BodyBatteryData | null> {
    const data = await getBodyBattery(date, date);
    await db.logs.add({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `[Body Battery API] Response for ${date}: ${JSON.stringify(data, null, 2)}`,
    });
    return data?.[0] || null;
}

/**
 * Get steps data for a specific date
 * @param date - Date in YYYY-MM-DD format
 */
export async function getStepsData(date: string): Promise<StepsData | null> {
    try {
        // Daily Summary endpoint requires displayName in URL path
        const displayName = await garminAuth.getDisplayNameAsync();
        const response = await garminHttp.get<StepsDataResponse>(
            WELLNESS_ENDPOINTS.DAILY_SUMMARY(displayName, date)
        );

        const data = response.data;

        if (!data) {
            return null;
        }

        return {
            totalSteps: data.totalSteps || 0,
            stepGoal: data.stepGoal,
            totalDistanceMeters: data.totalDistance,
        };
    } catch (error) {
        console.error(`Failed to get steps data for ${date}:`, error);
        return null;
    }
}

/**
 * Get hydration data for a specific date
 * @param date - Date in YYYY-MM-DD format
 */
export async function getHydrationData(date: string): Promise<HydrationData | null> {
    try {
        const response = await garminHttp.get<HydrationDataResponse>(
            USER_SUMMARY_ENDPOINTS.HYDRATION(date)
        );

        const data = response.data;

        if (!data) {
            return null;
        }

        return {
            valueInML: data.valueInML || 0,
            goalInML: data.goalInML,
        };
    } catch (error) {
        console.error(`Failed to get hydration data for ${date}:`, error);
        return null;
    }
}

/**
 * Get complete daily summary for a specific date
 * @param date - Date in YYYY-MM-DD format
 */
export async function getUserSummary(date: string): Promise<DailySummary | null> {
    try {
        // User Summary endpoint requires displayName in URL path
        const displayName = await garminAuth.getDisplayNameAsync();
        const response = await garminHttp.get<DailySummaryResponse>(
            USER_SUMMARY_ENDPOINTS.USER_SUMMARY(displayName, date)
        );

        const data = response.data;

        if (!data) {
            return null;
        }

        return {
            totalSteps: data.totalSteps || 0,
            stepGoal: data.stepGoal || 0,
            totalDistanceMeters: data.totalDistance || 0,
            totalKilocalories: data.totalKilocalories || 0,
            activeKilocalories: data.activeKilocalories || 0,
            floorsAscended: data.floorsAscended || 0,
            floorsDescended: data.floorsDescended || 0,
            moderateIntensityMinutes: data.moderateIntensityMinutes || 0,
            vigorousIntensityMinutes: data.vigorousIntensityMinutes || 0,
        };
    } catch (error) {
        console.error(`Failed to get user summary for ${date}:`, error);
        return null;
    }
}
