import Dexie, { type EntityTable } from 'dexie';

// TypeScript Interfaces für alle Tabellen

/**
 * Erweiterte Symptom-Struktur (PAKET 8)
 * Kategorisiert in: Schmerz, Sensorisch, Neurologisch, Allgemein, Eigene
 */
export interface Symptoms {
    // Kategorie: Allgemein
    nausea: boolean;           // Übelkeit
    vomiting: boolean;         // Erbrechen
    fatigue: boolean;          // Müdigkeit
    vertigo: boolean;          // Schwindel
    
    // Kategorie: Sensorisch
    photophobia: boolean;      // Lichtempfindlichkeit
    phonophobia: boolean;      // Lärmempfindlichkeit
    aura: boolean;             // Aura
    visualDisturbance: boolean; // Sehstörungen (z.B. Flimmern, Blitze)
    
    // Kategorie: Neurologisch
    concentration: boolean;    // Konzentrationsprobleme
    tinglingNumbness: boolean; // Kribbeln/Taubheit
    speechDifficulty: boolean; // Sprachschwierigkeiten
    
    // Kategorie: Schmerz
    neckPain: boolean;         // Nackenschmerzen
    
    // Benutzerdefinierte Symptome
    custom: string[];          // ["Augenflimmern", "Ohrensausen"]
}

/**
 * Erstellt ein leeres Symptoms-Objekt mit allen Defaults
 */
export function createEmptySymptoms(): Symptoms {
    return {
        nausea: false,
        vomiting: false,
        fatigue: false,
        vertigo: false,
        photophobia: false,
        phonophobia: false,
        aura: false,
        visualDisturbance: false,
        concentration: false,
        tinglingNumbness: false,
        speechDifficulty: false,
        neckPain: false,
        custom: [],
    };
}

/**
 * Einzelner Eintrag im Intensitätsverlauf (PAKET 9)
 * Ermöglicht das Dokumentieren der Schmerzintensität über die Zeit
 */
export interface IntensityEntry {
    timestamp: string; // ISO 8601 Date String
    intensity: number; // 1-10
    note?: string; // Optional: "Nach Medikament besser"
}

/**
 * Migriert alte Symptome (v1) zu neuem Format (v2)
 */
export function migrateSymptoms(oldSymptoms: {
    nausea: boolean;
    photophobia: boolean;
    phonophobia: boolean;
    aura: boolean;
}): Symptoms {
    return {
        ...createEmptySymptoms(),
        nausea: oldSymptoms.nausea,
        photophobia: oldSymptoms.photophobia,
        phonophobia: oldSymptoms.phonophobia,
        aura: oldSymptoms.aura,
    };
}

export interface Episode {
    id?: number;
    startTime: string; // ISO 8601 Date String
    endTime?: string; // ISO 8601 Date String
    intensity: number; // 1-10 (Aktuelle/letzte Intensität)
    intensityHistory: IntensityEntry[]; // Verlauf der Intensität über Zeit (PAKET 9)
    triggers: string[]; // ["stress", "weather", "caffeine"]
    medicines: string[]; // ["ibuprofen 400mg", "sumatriptan"]
    symptoms: Symptoms;
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
    intensityHistory: IntensityEntry[]; // Verlauf der Intensität über Zeit (PAKET 9)
    triggers: string[];
    medicines: string[];
    symptoms: Symptoms;
    notes?: string;
    // Night-Onset Tracking (PAKET 10)
    nightOnset?: boolean;
    nightEnd?: boolean;
    wokeUpWithMigraine?: boolean;
    sleepQualityBefore?: number;
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

        // Version 1: Initiales Schema
        this.version(1).stores({
            episodes:
                '++id, startTime, endTime, intensity, *triggers, *medicines, createdAt',
            garminData: 'date, syncedAt',
            logs: '++id, timestamp, level',
            settings: 'key',
            archivedEpisodes: '++id, startTime, archivedAt',
        });

        // Version 2: Erweiterte Symptome (PAKET 8)
        // Migration von altem 4-Feld Symptoms zu neuem 13-Feld + Custom Format
        this.version(2).stores({
            episodes:
                '++id, startTime, endTime, intensity, *triggers, *medicines, createdAt',
            garminData: 'date, syncedAt',
            logs: '++id, timestamp, level',
            settings: 'key',
            archivedEpisodes: '++id, startTime, archivedAt',
        }).upgrade(tx => {
            // Migriere bestehende Episoden
            return tx.table('episodes').toCollection().modify(episode => {
                const oldSymptoms = episode.symptoms;
                // Prüfe ob bereits neues Format (hat 'custom' Array)
                if (!('custom' in oldSymptoms)) {
                    episode.symptoms = migrateSymptoms(oldSymptoms);
                }
            });
        });

        // Version 3: IntensityHistory hinzufügen (PAKET 9)
        // Ermöglicht das Dokumentieren der Schmerzintensität über die Zeit
        this.version(3).stores({
            episodes:
                '++id, startTime, endTime, intensity, *triggers, *medicines, createdAt',
            garminData: 'date, syncedAt',
            logs: '++id, timestamp, level',
            settings: 'key',
            archivedEpisodes: '++id, startTime, archivedAt',
        }).upgrade(tx => {
            // Migriere bestehende Episoden mit initialem IntensityHistory
            return tx.table('episodes').toCollection().modify(episode => {
                if (!episode.intensityHistory) {
                    episode.intensityHistory = [{
                        timestamp: episode.startTime,
                        intensity: episode.intensity,
                        note: 'Initial',
                    }];
                }
            });
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
