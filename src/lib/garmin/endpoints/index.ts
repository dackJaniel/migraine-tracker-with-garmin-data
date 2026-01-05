// Garmin API Endpoints - Re-export all endpoint functions
export * from './sleep';
export * from './stress';
export * from './activity';
export * from './misc';

// Export types
export type { SleepData } from './sleep';
export type { StressData, HeartRateData, HRVData } from './stress';
export type { BodyBatteryData, StepsData, HydrationData, DailySummary } from './activity';
export type { RespirationData, SpO2Data, TrainingReadiness } from './misc';
