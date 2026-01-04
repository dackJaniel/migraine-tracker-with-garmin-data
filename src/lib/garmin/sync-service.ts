// Simplified sync service stubs
import type { GarminData } from '../db';

export interface SyncProgress {
  total: number;
  completed: number;
  currentDate: string;
  errors: Array<{ date: string; error: string }>;
}

export async function syncAllMissingData(_onProgress?: (p: SyncProgress) => void): Promise<SyncProgress> {
  return { total: 0, completed: 0, currentDate: '', errors: [] };
}

export async function syncSingleDate(_date: string): Promise<GarminData | null> {
  return null;
}

export async function getSyncStatus() {
  return { lastSyncDate: null, daysBehind: 0, totalDaysInDB: 0 };
}
