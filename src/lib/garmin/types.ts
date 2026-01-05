// Garmin API Types
// Based on python-garminconnect API responses

export interface GarminAuthTokens {
  oauth1Token: string;
  oauth2Token: string;
}

export interface GarminProfile {
  displayName: string;
  fullName: string;
  email: string;
}

export interface GarminLoginResponse {
  tokens: GarminAuthTokens;
  profile: GarminProfile;
  sessionId?: string;
}

export interface GarminMFAState {
  clientState: string;
  requiresMFA: boolean;
  email?: string;  // Store email for profile fetch after MFA
}

// Sleep Data Types
export interface SleepStages {
  deepSeconds: number;
  lightSeconds: number;
  remSeconds: number;
  awakeSeconds: number;
}

export interface SleepDataResponse {
  dailySleepDTO?: {
    sleepTimeSeconds: number;
    deepSleepSeconds: number;
    lightSleepSeconds: number;
    remSleepSeconds: number;
    awakeSleepSeconds: number;
    sleepScore?: number;
  };
}

// Stress Data Types
export interface StressDataResponse {
  stressValuesArray?: Array<[number, number]>; // [timestamp, value]
  avgStressLevel?: number;
  maxStressLevel?: number;
}

// Heart Rate Types
export interface HeartRateDataResponse {
  restingHeartRate?: number;
  maxHeartRate?: number;
  heartRateValues?: Array<[number, number]>;
}

// HRV Types
export interface HRVDataResponse {
  hrvValue?: number;
  lastNightAverage?: number;
  weeklyAverage?: number;
  status?: string;
}

// Body Battery Types
export interface BodyBatteryDataResponse {
  charged?: number;
  drained?: number;
  currentValue?: number;
}

// Steps & Activity Types
export interface StepsDataResponse {
  totalSteps?: number;
  stepGoal?: number;
  totalDistance?: number; // meters
}

export interface DailySummaryResponse {
  totalSteps?: number;
  stepGoal?: number;
  totalDistance?: number;
  totalKilocalories?: number;
  activeKilocalories?: number;
  floorsAscended?: number;
  floorsDescended?: number;
  moderateIntensityMinutes?: number;
  vigorousIntensityMinutes?: number;
}

// Hydration Types
export interface HydrationDataResponse {
  valueInML?: number;
  goalInML?: number;
}

// Respiration Types
export interface RespirationDataResponse {
  avgSleepRespirationValue?: number;
  avgWakingRespirationValue?: number;
}

// SpO2 Types
export interface SpO2DataResponse {
  averageSpO2?: number;
  lowestSpO2?: number;
}

// Training Readiness Types
export interface TrainingReadinessResponse {
  score?: number;
  status?: string;
}

// API Error Types
export interface GarminAPIError {
  statusCode: number;
  message: string;
  endpoint?: string;
}

// Session State
export interface GarminSessionState {
  tokens: GarminAuthTokens;
  profile: GarminProfile;
  lastSync?: Date;
  isValid: boolean;
}
