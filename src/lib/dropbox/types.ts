/**
 * Dropbox integration types
 */

/**
 * OAuth tokens from Dropbox authentication
 */
export interface DropboxTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
}

/**
 * Result of a Dropbox export operation
 */
export interface DropboxExportResult {
  success: boolean;
  path?: string;
  timestamp?: string;
  error?: string;
}

/**
 * Connection status for Dropbox
 */
export interface DropboxConnectionStatus {
  isConnected: boolean;
  accountEmail?: string;
  lastExport?: string | null;
}
