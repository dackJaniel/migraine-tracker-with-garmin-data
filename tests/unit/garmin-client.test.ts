// Garmin Client Unit Tests
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { GarminClient } from '@/lib/garmin/client';

// Mock Capacitor Core (includes CapacitorHttp)
vi.mock('@capacitor/core', () => ({
    CapacitorHttp: {
        request: vi.fn(),
    },
    Capacitor: {
        isNativePlatform: vi.fn(() => false),
    },
}));

// Mock Capacitor Preferences
vi.mock('@capacitor/preferences', () => ({
    Preferences: {
        get: vi.fn().mockResolvedValue({ value: null }),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
    },
}));

// Mock garminAuth module
vi.mock('@/lib/garmin/auth', () => ({
    garminAuth: {
        login: vi.fn(),
        completeMFA: vi.fn(),
        isMFARequired: vi.fn(() => false),
        isSessionValid: vi.fn(() => Promise.resolve(false)),
        refreshSession: vi.fn(() => Promise.resolve(false)),
        logout: vi.fn(() => Promise.resolve()),
        getProfile: vi.fn(() => null),
        getTokens: vi.fn(() => null),
    },
}));

// Mock sync-service
vi.mock('@/lib/garmin/sync-service', () => ({
    syncAllMissingData: vi.fn(() => Promise.resolve({
        total: 0,
        completed: 0,
        currentDate: '',
        errors: [],
        status: 'completed',
    })),
    getSyncStatus: vi.fn(() => Promise.resolve({
        lastSyncDate: null,
        daysBehind: 0,
        totalDaysInDB: 0,
        isConnected: false,
    })),
    isSyncNeeded: vi.fn(() => Promise.resolve(true)),
    syncRecentDays: vi.fn(() => Promise.resolve({
        total: 7,
        completed: 7,
        currentDate: '',
        errors: [],
        status: 'completed',
    })),
}));

// Mock http-client
vi.mock('@/lib/garmin/http-client', () => ({
    garminHttp: {
        get: vi.fn(),
        post: vi.fn(),
        canMakeRequests: vi.fn(() => Promise.resolve(false)),
        getRateLimitStatus: vi.fn(() => ({ remaining: 120, resetIn: 60000 })),
    },
}));

import { garminAuth } from '@/lib/garmin/auth';

describe('GarminClient', () => {
    let client: GarminClient;

    beforeEach(() => {
        vi.clearAllMocks();
        client = new GarminClient();
    });

    describe('Session Management', () => {
        it('should check session validity', async () => {
            (garminAuth.isSessionValid as Mock).mockResolvedValueOnce(false);

            const isValid = await client.isSessionValid();
            expect(isValid).toBe(false);
            expect(garminAuth.isSessionValid).toHaveBeenCalled();
        });

        it('should return profile from auth service', () => {
            const mockProfile = {
                displayName: 'TestUser',
                fullName: 'Test User',
                email: 'test@example.com',
            };
            (garminAuth.getProfile as Mock).mockReturnValueOnce(mockProfile);

            const profile = client.getProfile();
            expect(profile).toEqual(mockProfile);
        });
    });

    describe('Login', () => {
        it('should delegate login to auth service', async () => {
            const mockResponse = {
                tokens: { oauth1Token: 'token1', oauth2Token: 'token2' },
                profile: { displayName: 'Test', fullName: 'Test User', email: 'test@example.com' },
            };
            (garminAuth.login as Mock).mockResolvedValueOnce(mockResponse);

            const response = await client.login('test@example.com', 'password123');

            expect(garminAuth.login).toHaveBeenCalledWith('test@example.com', 'password123');
            expect(response).toEqual(mockResponse);
        });

        it('should handle MFA required scenario', async () => {
            (garminAuth.isMFARequired as Mock).mockReturnValueOnce(true);

            const isMFARequired = client.isMFARequired();
            expect(isMFARequired).toBe(true);
        });

        it('should complete MFA verification', async () => {
            const mockResponse = {
                tokens: { oauth1Token: 'token1', oauth2Token: 'token2' },
                profile: { displayName: 'Test', fullName: 'Test User', email: 'test@example.com' },
            };
            (garminAuth.completeMFA as Mock).mockResolvedValueOnce(mockResponse);

            const response = await client.completeMFA('123456');

            expect(garminAuth.completeMFA).toHaveBeenCalledWith('123456');
            expect(response).toEqual(mockResponse);
        });
    });

    describe('Logout', () => {
        it('should delegate logout to auth service', async () => {
            await client.logout();
            expect(garminAuth.logout).toHaveBeenCalled();
        });
    });

    describe('Sync Operations', () => {
        it('should check if sync is needed', async () => {
            const needed = await client.isSyncNeeded();
            expect(needed).toBe(true);
        });

        it('should get sync status', async () => {
            const status = await client.getSyncStatus();

            expect(status).toHaveProperty('lastSyncDate');
            expect(status).toHaveProperty('daysBehind');
            expect(status).toHaveProperty('totalDaysInDB');
            expect(status).toHaveProperty('isConnected');
        });

        it('should get combined session state', async () => {
            const state = await client.getSessionState();

            expect(state).toHaveProperty('isValid');
            expect(state).toHaveProperty('profile');
            expect(state).toHaveProperty('tokens');
            expect(state).toHaveProperty('syncStatus');
        });
    });

    describe('Rate Limiting', () => {
        it('should get rate limit status', () => {
            const status = client.getRateLimitStatus();

            expect(status).toHaveProperty('remaining');
            expect(status).toHaveProperty('resetIn');
            expect(status.remaining).toBe(120);
        });
    });
});
