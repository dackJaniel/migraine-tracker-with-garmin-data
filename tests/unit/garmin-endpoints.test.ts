// Garmin Endpoints Unit Tests
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mock http-client before importing endpoints
vi.mock('@/lib/garmin/http-client', () => ({
  garminHttp: {
    get: vi.fn(),
    post: vi.fn(),
    canMakeRequests: vi.fn(() => Promise.resolve(true)),
    getRateLimitStatus: vi.fn(() => ({ remaining: 120, resetIn: 60000 })),
  },
}));

// Mock db
vi.mock('@/lib/db', () => ({
  db: {
    logs: {
      add: vi.fn(() => Promise.resolve()),
    },
  },
}));

import { garminHttp } from '@/lib/garmin/http-client';
import { getSleepData } from '@/lib/garmin/endpoints/sleep';
import { getStressData, getHeartRates, getHRVData } from '@/lib/garmin/endpoints/stress';
import { getBodyBattery, getStepsData, getHydrationData } from '@/lib/garmin/endpoints/activity';
import { getRespirationData, getSpo2Data, getTrainingReadiness } from '@/lib/garmin/endpoints/misc';

describe('Garmin Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sleep Endpoints', () => {
    it('should fetch and transform sleep data', async () => {
      const mockResponse = {
        dailySleepDTO: {
          sleepTimeSeconds: 28800, // 8 hours
          deepSleepSeconds: 7200,  // 2 hours
          lightSleepSeconds: 14400, // 4 hours
          remSleepSeconds: 5400,   // 1.5 hours
          awakeSleepSeconds: 1800,  // 30 min
          sleepScore: 85,
        },
      };

      (garminHttp.get as Mock).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        headers: {},
      });

      const result = await getSleepData('2026-01-05');

      expect(result).not.toBeNull();
      expect(result?.sleepTimeMinutes).toBe(480); // 8 hours in minutes
      expect(result?.deepSleepMinutes).toBe(120);
      expect(result?.lightSleepMinutes).toBe(240);
      expect(result?.remSleepMinutes).toBe(90);
      expect(result?.awakeSleepMinutes).toBe(30);
      expect(result?.sleepScore).toBe(85);
    });

    it('should return null for missing sleep data', async () => {
      (garminHttp.get as Mock).mockResolvedValueOnce({
        data: {},
        status: 200,
        headers: {},
      });

      const result = await getSleepData('2026-01-05');
      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      (garminHttp.get as Mock).mockRejectedValueOnce(new Error('API Error'));

      const result = await getSleepData('2026-01-05');
      expect(result).toBeNull();
    });
  });

  describe('Stress & Heart Rate Endpoints', () => {
    it('should fetch stress data', async () => {
      const mockResponse = {
        avgStressLevel: 45,
        maxStressLevel: 78,
        stressValuesArray: [[1704456000000, 42], [1704459600000, 55]],
      };

      (garminHttp.get as Mock).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        headers: {},
      });

      const result = await getStressData('2026-01-05');

      expect(result).not.toBeNull();
      expect(result?.avgStressLevel).toBe(45);
      expect(result?.maxStressLevel).toBe(78);
      expect(result?.stressValues).toHaveLength(2);
    });

    it('should fetch heart rate data', async () => {
      const mockResponse = {
        restingHeartRate: 62,
        maxHeartRate: 145,
        heartRateValues: [[1704456000000, 65], [1704459600000, 72]],
      };

      (garminHttp.get as Mock).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        headers: {},
      });

      const result = await getHeartRates('2026-01-05');

      expect(result).not.toBeNull();
      expect(result?.restingHeartRate).toBe(62);
      expect(result?.maxHeartRate).toBe(145);
    });

    it('should fetch HRV data', async () => {
      const mockResponse = {
        hrvValue: 45,
        lastNightAverage: 48,
        weeklyAverage: 52,
        status: 'BALANCED',
      };

      (garminHttp.get as Mock).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        headers: {},
      });

      const result = await getHRVData('2026-01-05');

      expect(result).not.toBeNull();
      expect(result?.hrvValue).toBe(45);
      expect(result?.lastNightAverage).toBe(48);
      expect(result?.status).toBe('BALANCED');
    });
  });

  describe('Activity Endpoints', () => {
    it('should fetch body battery data', async () => {
      const mockResponse = [
        { charged: 85, drained: 45, currentValue: 65 },
      ];

      (garminHttp.get as Mock).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        headers: {},
      });

      const result = await getBodyBattery('2026-01-05', '2026-01-05');

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result?.[0].charged).toBe(85);
      expect(result?.[0].drained).toBe(45);
      expect(result?.[0].currentValue).toBe(65);
    });

    it('should fetch steps data', async () => {
      const mockResponse = {
        totalSteps: 8500,
        stepGoal: 10000,
        totalDistance: 6200,
      };

      (garminHttp.get as Mock).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        headers: {},
      });

      const result = await getStepsData('2026-01-05');

      expect(result).not.toBeNull();
      expect(result?.totalSteps).toBe(8500);
      expect(result?.stepGoal).toBe(10000);
    });

    it('should fetch hydration data', async () => {
      const mockResponse = {
        valueInML: 2500,
        goalInML: 3000,
      };

      (garminHttp.get as Mock).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        headers: {},
      });

      const result = await getHydrationData('2026-01-05');

      expect(result).not.toBeNull();
      expect(result?.valueInML).toBe(2500);
      expect(result?.goalInML).toBe(3000);
    });
  });

  describe('Misc Health Endpoints', () => {
    it('should fetch respiration data', async () => {
      const mockResponse = {
        avgSleepRespirationValue: 14.5,
        avgWakingRespirationValue: 16.2,
      };

      (garminHttp.get as Mock).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        headers: {},
      });

      const result = await getRespirationData('2026-01-05');

      expect(result).not.toBeNull();
      expect(result?.avgSleepRespirationValue).toBe(14.5);
      expect(result?.avgWakingRespirationValue).toBe(16.2);
    });

    it('should fetch SpO2 data', async () => {
      const mockResponse = {
        averageSpO2: 97,
        lowestSpO2: 94,
      };

      (garminHttp.get as Mock).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        headers: {},
      });

      const result = await getSpo2Data('2026-01-05');

      expect(result).not.toBeNull();
      expect(result?.averageSpO2).toBe(97);
      expect(result?.lowestSpO2).toBe(94);
    });

    it('should fetch training readiness', async () => {
      const mockResponse = {
        score: 78,
        status: 'PRODUCTIVE',
      };

      (garminHttp.get as Mock).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        headers: {},
      });

      const result = await getTrainingReadiness('2026-01-05');

      expect(result).not.toBeNull();
      expect(result?.score).toBe(78);
      expect(result?.status).toBe('PRODUCTIVE');
    });
  });
});
