// Garmin API Client - Simplified MVP Version
import { Preferences } from '@capacitor/preferences';
import { SESSION_CONFIG } from './constants';
import type { GarminAuthTokens, GarminProfile, GarminLoginResponse, GarminSessionState } from './types';

export class GarminClient {
  private tokens: GarminAuthTokens | null = null;
  private profile: GarminProfile | null = null;

  constructor() {
    this.loadSession();
  }

  private async loadSession(): Promise<void> {
    try {
      const tokensData = await Preferences.get({ key: SESSION_CONFIG.PREFERENCES_KEY_TOKENS });
      const profileData = await Preferences.get({ key: SESSION_CONFIG.PREFERENCES_KEY_PROFILE });
      if (tokensData.value) this.tokens = JSON.parse(tokensData.value);
      if (profileData.value) this.profile = JSON.parse(profileData.value);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }

  private async saveSession(): Promise<void> {
    if (this.tokens) {
      await Preferences.set({ key: SESSION_CONFIG.PREFERENCES_KEY_TOKENS, value: JSON.stringify(this.tokens) });
    }
    if (this.profile) {
      await Preferences.set({ key: SESSION_CONFIG.PREFERENCES_KEY_PROFILE, value: JSON.stringify(this.profile) });
    }
  }

  private async clearSession(): Promise<void> {
    this.tokens = null;
    this.profile = null;
    await Preferences.remove({ key: SESSION_CONFIG.PREFERENCES_KEY_TOKENS });
    await Preferences.remove({ key: SESSION_CONFIG.PREFERENCES_KEY_PROFILE });
  }

  async login(email: string, _password: string): Promise<GarminLoginResponse> {
    // MVP: Simplified login (full OAuth flow to be implemented)
    const mockTokens: GarminAuthTokens = {
      oauth1Token: 'mock_oauth1',
      oauth2Token: 'mock_oauth2',
    };
    const mockProfile: GarminProfile = {
      displayName: email.split('@')[0],
      fullName: 'Test User',
      email,
    };
    this.tokens = mockTokens;
    this.profile = mockProfile;
    await this.saveSession();
    return { tokens: mockTokens, profile: mockProfile };
  }

  async isSessionValid(): Promise<boolean> {
    return !!this.tokens && !!this.profile;
  }

  async logout(): Promise<void> {
    await this.clearSession();
  }

  async getSessionState(): Promise<GarminSessionState | null> {
    if (!this.tokens || !this.profile) return null;
    return {
      tokens: this.tokens,
      profile: this.profile,
      isValid: await this.isSessionValid(),
    };
  }

  getProfile(): GarminProfile | null {
    return this.profile;
  }

  async authenticatedRequest<T>(_url: string): Promise<T> {
    // MVP: Simplified request
    return {} as T;
  }
}

export const garminClient = new GarminClient();
