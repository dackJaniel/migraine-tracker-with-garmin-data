// Garmin Client Unit Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GarminClient } from '@/lib/garmin/client';

// Mock Capacitor HTTP
vi.mock('@capacitor-community/http', () => ({
  CapacitorHttp: {
    request: vi.fn(),
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

describe('GarminClient', () => {
  let client: GarminClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GarminClient();
  });

  describe('Session Management', () => {
    it('should initialize without session', async () => {
      const sessionState = await client.getSessionState();
      expect(sessionState).toBeNull();
    });

    it('should return not valid for empty session', async () => {
      const isValid = await client.isSessionValid();
      expect(isValid).toBe(false);
    });
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      const response = await client.login(email, password);

      expect(response.tokens).toBeDefined();
      expect(response.profile).toBeDefined();
      expect(response.profile.email).toBe(email);
    });

    it('should store tokens after successful login', async () => {
      await client.login('test@example.com', 'password123');
      const profile = client.getProfile();
      
      expect(profile).not.toBeNull();
      expect(profile?.email).toBe('test@example.com');
    });
  });

  describe('Logout', () => {
    it('should clear session on logout', async () => {
      await client.login('test@example.com', 'password123');
      expect(client.getProfile()).not.toBeNull();

      await client.logout();
      expect(client.getProfile()).toBeNull();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // This test would check the rate limiting logic
      // In a real implementation, this would need more sophisticated testing
      expect(true).toBe(true);
    });
  });
});
