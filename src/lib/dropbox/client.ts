/**
 * Dropbox Client with encrypted backup upload
 * Uses the same encryption pattern as backup-service.ts
 */

import { Dropbox } from 'dropbox';
import { db } from '@/lib/db';
import { format } from 'date-fns';
import type { BackupData } from '@/features/backup/backup-service';
import { authenticateDropbox, getValidAccessToken, clearTokens } from './auth';
import type { DropboxConnectionStatus, DropboxExportResult } from './types';

/**
 * Encrypt data using AES-GCM (same as backup-service)
 */
async function encryptData(
  data: string,
  password: string
): Promise<{ iv: string; data: string }> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const passwordHash = await crypto.subtle.digest('SHA-256', passwordBuffer);

  const key = await crypto.subtle.importKey(
    'raw',
    passwordHash,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const dataBuffer = encoder.encode(data);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  );

  return {
    iv: arrayBufferToBase64(iv.buffer),
    data: arrayBufferToBase64(encryptedBuffer),
  };
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Dropbox client class for managing connection and uploads
 */
class DropboxClient {
  private lastExportTimestamp: string | null = null;

  /**
   * Connect to Dropbox (initiates OAuth flow)
   */
  async connect(): Promise<void> {
    await authenticateDropbox();
  }

  /**
   * Disconnect from Dropbox (clears tokens)
   */
  async disconnect(): Promise<void> {
    await clearTokens();
    this.lastExportTimestamp = null;
  }

  /**
   * Get current connection status
   */
  async getConnectionStatus(): Promise<DropboxConnectionStatus> {
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      return { isConnected: false };
    }

    try {
      const dbx = new Dropbox({ accessToken });
      const account = await dbx.usersGetCurrentAccount();

      return {
        isConnected: true,
        accountEmail: account.result.email,
        lastExport: this.lastExportTimestamp,
      };
    } catch {
      return { isConnected: false };
    }
  }

  /**
   * Export encrypted backup to Dropbox
   */
  async exportBackup(password: string): Promise<DropboxExportResult> {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Nicht mit Dropbox verbunden' };
    }

    try {
      // Collect all data (same as backup-service)
      const episodes = await db.episodes.toArray();
      const garminData = await db.garminData.toArray();
      const settings = await db.settings.toArray();

      const backupData: BackupData = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        episodes,
        garminData,
        settings,
      };

      // Encrypt the backup
      const encrypted = await encryptData(JSON.stringify(backupData), password);

      // Create the encrypted backup wrapper (same format as local backups)
      const encryptedBackup = {
        version: '1.0.0',
        encrypted: true,
        algorithm: 'AES-GCM',
        iv: encrypted.iv,
        data: encrypted.data,
        exportedAt: new Date().toISOString(),
        source: 'dropbox-auto-export',
      };

      const fileContent = JSON.stringify(encryptedBackup, null, 2);
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
      const path = `/MigraineTracker/backup-${timestamp}.enc`;

      // Upload to Dropbox
      const dbx = new Dropbox({ accessToken });
      await dbx.filesUpload({
        path,
        contents: fileContent,
        mode: { '.tag': 'add' }, // Don't overwrite, create new file
        autorename: true,
      });

      this.lastExportTimestamp = new Date().toISOString();

      return {
        success: true,
        path,
        timestamp: this.lastExportTimestamp,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Export fehlgeschlagen';
      return { success: false, error: message };
    }
  }

  /**
   * Check if connected to Dropbox
   */
  async isConnected(): Promise<boolean> {
    const status = await this.getConnectionStatus();
    return status.isConnected;
  }
}

export const dropboxClient = new DropboxClient();
