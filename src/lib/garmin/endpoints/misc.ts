// Misc Health Endpoints - Real Garmin API Implementation
import { garminHttp } from '../http-client';
import { WELLNESS_ENDPOINTS, USER_SUMMARY_ENDPOINTS, TRAINING_ENDPOINTS } from '../constants';
import type {
    RespirationDataResponse,
    SpO2DataResponse,
    TrainingReadinessResponse
} from '../types';

export interface RespirationData {
    avgSleepRespirationValue?: number;
    avgWakingRespirationValue?: number;
}

export interface SpO2Data {
    averageSpO2?: number;
    lowestSpO2?: number;
}

export interface TrainingReadiness {
    score?: number;
    status?: string;
}

/**
 * Get respiration data for a specific date
 * @param date - Date in YYYY-MM-DD format
 */
export async function getRespirationData(date: string): Promise<RespirationData | null> {
    try {
        const response = await garminHttp.get<RespirationDataResponse>(
            WELLNESS_ENDPOINTS.RESPIRATION(date)
        );

        const data = response.data;

        if (!data) {
            return null;
        }

        return {
            avgSleepRespirationValue: data.avgSleepRespirationValue,
            avgWakingRespirationValue: data.avgWakingRespirationValue,
        };
    } catch (error) {
        console.error(`Failed to get respiration data for ${date}:`, error);
        return null;
    }
}

/**
 * Get SpO2 (blood oxygen) data for a specific date
 * @param date - Date in YYYY-MM-DD format
 */
export async function getSpo2Data(date: string): Promise<SpO2Data | null> {
    try {
        const response = await garminHttp.get<SpO2DataResponse>(
            USER_SUMMARY_ENDPOINTS.SPO2(date)
        );

        const data = response.data;

        if (!data) {
            return null;
        }

        return {
            averageSpO2: data.averageSpO2,
            lowestSpO2: data.lowestSpO2,
        };
    } catch (error) {
        console.error(`Failed to get SpO2 data for ${date}:`, error);
        return null;
    }
}

/**
 * Get training readiness for a specific date
 * @param date - Date in YYYY-MM-DD format
 */
export async function getTrainingReadiness(date: string): Promise<TrainingReadiness | null> {
    try {
        const response = await garminHttp.get<TrainingReadinessResponse>(
            TRAINING_ENDPOINTS.TRAINING_READINESS(date)
        );

        const data = response.data;

        if (!data) {
            return null;
        }

        return {
            score: data.score,
            status: data.status,
        };
    } catch (error) {
        console.error(`Failed to get training readiness for ${date}:`, error);
        return null;
    }
}
