// Garmin API Client - Real Implementation
// Facade für Auth, HTTP und Sync Services
import { garminAuth } from './auth';
import { garminHttp } from './http-client';
import { syncAllMissingData, getSyncStatus, isSyncNeeded, syncRecentDays, type SyncProgress, type SyncStatus } from './sync-service';
import type { GarminAuthTokens, GarminProfile, GarminLoginResponse } from './types';

export class GarminClient {
  /**
   * Login to Garmin Connect
   */
  async login(email: string, password: string): Promise<GarminLoginResponse> {
    return garminAuth.login(email, password);
  }

  /**
   * Complete MFA verification
   */
  async completeMFA(mfaCode: string): Promise<GarminLoginResponse> {
    return garminAuth.completeMFA(mfaCode);
  }

  /**
   * Check if MFA is required
   */
  isMFARequired(): boolean {
    return garminAuth.isMFARequired();
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(): Promise<boolean> {
    return garminAuth.isSessionValid();
  }

  /**
   * Refresh the session if expired
   */
  async refreshSession(): Promise<boolean> {
    return garminAuth.refreshSession();
  }

  /**
   * Logout from Garmin Connect
   */
  async logout(): Promise<void> {
    return garminAuth.logout();
  }

  /**
   * Get current user profile
   */
  getProfile(): GarminProfile | null {
    return garminAuth.getProfile();
  }

  /**
   * Get current tokens
   */
  getTokens(): GarminAuthTokens | null {
    return garminAuth.getTokens();
  }

  /**
   * Check if sync is needed (>24h since last sync)
   */
  async isSyncNeeded(): Promise<boolean> {
    return isSyncNeeded();
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    return getSyncStatus();
  }

  /**
   * Sync all missing data
   */
  async syncAllMissingData(
    onProgress?: (progress: SyncProgress) => void,
    daysBack?: number
  ): Promise<SyncProgress> {
    return syncAllMissingData(onProgress, daysBack);
  }

  /**
   * Sync only recent days
   */
  async syncRecentDays(
    days: number,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncProgress> {
    return syncRecentDays(days, onProgress);
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): { remaining: number; resetIn: number } {
    return garminHttp.getRateLimitStatus();
  }

  /**
   * Get combined session state
   */
  async getSessionState(): Promise<{
    isValid: boolean;
    profile: GarminProfile | null;
    tokens: GarminAuthTokens | null;
    syncStatus: SyncStatus;
  }> {
    const [isValid, syncStatus] = await Promise.all([
      this.isSessionValid(),
      this.getSyncStatus(),
    ]);

    return {
      isValid,
      profile: this.getProfile(),
      tokens: this.getTokens(),
      syncStatus,
    };
  }
}

// Singleton instance
export const garminClient = new GarminClient();
