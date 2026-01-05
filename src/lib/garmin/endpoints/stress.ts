// Stress & Heart Rate Endpoints - Real Garmin API Implementation
import { garminHttp } from '../http-client';
import { WELLNESS_ENDPOINTS, HRV_ENDPOINTS } from '../constants';
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
 * Get stress data for a specific date
 * @param date - Date in YYYY-MM-DD format
 */
export async function getStressData(date: string): Promise<StressData | null> {
    try {
        const response = await garminHttp.get<StressDataResponse>(
            WELLNESS_ENDPOINTS.STRESS_DATA(date)
        );

        const data = response.data;

        if (!data) {
            return null;
        }

        return {
            avgStressLevel: data.avgStressLevel || 0,
            maxStressLevel: data.maxStressLevel || 0,
            stressValues: data.stressValuesArray?.map(([timestamp, value]) => ({
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
        const response = await garminHttp.get<HeartRateDataResponse>(
            WELLNESS_ENDPOINTS.HEART_RATE(date)
        );

        const data = response.data;

        if (!data) {
            return null;
        }

        return {
            restingHeartRate: data.restingHeartRate,
            maxHeartRate: data.maxHeartRate,
            heartRateValues: data.heartRateValues?.map(([timestamp, value]) => ({
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

        return response.data?.restingHeartRate || null;
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

        const data = response.data;

        if (!data) {
            return null;
        }

        return {
            hrvValue: data.hrvValue,
            lastNightAverage: data.lastNightAverage,
            weeklyAverage: data.weeklyAverage,
            status: data.status,
        };
    } catch (error) {
        console.error(`Failed to get HRV data for ${date}:`, error);
        return null;
    }
}
