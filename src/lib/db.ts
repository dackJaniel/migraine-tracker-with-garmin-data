import Dexie, { type EntityTable } from 'dexie';

// TypeScript Interfaces für alle Tabellen
export interface Episode {
  id?: number;
  startTime: string; // ISO 8601 Date String
  endTime?: string; // ISO 8601 Date String
  intensity: number; // 1-10
  triggers: string[]; // ["stress", "weather", "caffeine"]
  medicines: string[]; // ["ibuprofen 400mg", "sumatriptan"]
  symptoms: {
    nausea: boolean;
    photophobia: boolean;
    phonophobia: boolean;
    aura: boolean;
  };
  notes?: string;
  createdAt: string; // ISO 8601 Date String
  updatedAt: string; // ISO 8601 Date String
}

export interface GarminData {
  date: string; // YYYY-MM-DD (Primary Key)
  sleepScore?: number;
  sleepStages?: {
    deep: number; // minutes
    light: number;
    rem: number;
    awake: number;
  };
  stressLevel?: {
    average: number; // 0-100
    max: number;
  };
  restingHR?: number;
  maxHR?: number;
  hrv?: number;
  bodyBattery?: {
    charged: number;
    drained: number;
    current: number;
  };
  steps?: number;
  hydration?: number; // ml
  respirationRate?: number; // breaths per minute
  spo2?: number; // oxygen saturation percentage
  syncedAt: string; // ISO 8601 Date String
}

export interface Log {
  id?: number;
  timestamp: string; // ISO 8601 Date String
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: string; // JSON stringified object
}

export interface Setting {
  key: string; // Primary Key
  value: string; // JSON stringified value
}

export interface ArchivedEpisode {
  id?: number;
  startTime: string;
  endTime?: string;
  intensity: number;
  triggers: string[];
  medicines: string[];
  symptoms: {
    nausea: boolean;
    photophobia: boolean;
    phonophobia: boolean;
    aura: boolean;
  };
  notes?: string;
  archivedAt: string; // ISO 8601 Date String
}

// Dexie Datenbank Klasse
export class MigraineDB extends Dexie {
  episodes!: EntityTable<Episode, 'id'>;
  garminData!: EntityTable<GarminData, 'date'>;
  logs!: EntityTable<Log, 'id'>;
  settings!: EntityTable<Setting, 'key'>;
  archivedEpisodes!: EntityTable<ArchivedEpisode, 'id'>;

  constructor() {
    super('MigraineTrackerDB');

    this.version(1).stores({
      episodes:
        '++id, startTime, endTime, intensity, *triggers, *medicines, createdAt',
      garminData: 'date, syncedAt',
      logs: '++id, timestamp, level',
      settings: 'key',
      archivedEpisodes: '++id, startTime, archivedAt',
    });
  }
}

// Singleton Instanz
export const db = new MigraineDB();

// Helper Functions
export const addLog = async (
  level: Log['level'],
  message: string,
  context?: Record<string, unknown>
) => {
  await db.logs.add({
    timestamp: new Date().toISOString(),
    level,
    message,
    context: context ? JSON.stringify(context) : undefined,
  });
};

export const getSetting = async <T>(key: string, defaultValue: T): Promise<T> => {
  const setting = await db.settings.get(key);
  if (!setting) return defaultValue;
  try {
    return JSON.parse(setting.value) as T;
  } catch {
    return defaultValue;
  }
};

export const setSetting = async <T>(key: string, value: T): Promise<void> => {
  await db.settings.put({
    key,
    value: JSON.stringify(value),
  });
};
