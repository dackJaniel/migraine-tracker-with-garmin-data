/**
 * DB Inspector Tool
 * Liest IndexedDB Daten aus der Migraine Tracker DB
 */

import { z } from 'zod';

const DbInspectArgsSchema = z.object({
  database: z.string().default('MigraineDB'),
  table: z.enum(['episodes', 'garminData', 'logs', 'settings', 'archivedEpisodes', 'all']).optional(),
  limit: z.number().optional(),
  filter: z.record(z.any()).optional(),
});

export type DbInspectArgs = z.infer<typeof DbInspectArgsSchema>;

export interface DbInspectResult {
  database: string;
  table?: string;
  count: number;
  data: any[];
  metadata?: {
    lastSync?: string;
    encryption?: boolean;
  };
}

/**
 * Inspiziert IndexedDB Daten
 * 
 * WICHTIG: Diese Funktion kann nicht direkt auf IndexedDB zugreifen,
 * da der MCP Server in Node.js läuft. Sie gibt stattdessen Instruktionen
 * zurück, wie die Daten aus dem Browser extrahiert werden können.
 */
export async function inspectDatabase(args: DbInspectArgs): Promise<DbInspectResult> {
  const validated = DbInspectArgsSchema.parse(args);
  
  // Da wir im Node.js Context sind, können wir nicht direkt auf IndexedDB zugreifen
  // Stattdessen geben wir ein JavaScript Snippet zurück, das im Browser ausgeführt werden kann
  
  const browserScript = generateBrowserInspectionScript(validated);
  
  return {
    database: validated.database,
    table: validated.table,
    count: 0,
    data: [],
    metadata: {
      encryption: true,
      lastSync: new Date().toISOString(),
    },
    // @ts-ignore - Zusätzliches Feld für Browser-Script
    browserScript,
    // @ts-ignore
    instructions: 'Führe das browserScript in den DevTools der PWA aus, um die Daten zu extrahieren.'
  };
}

/**
 * Generiert ein Browser-Script zur DB-Inspektion
 */
function generateBrowserInspectionScript(args: DbInspectArgs): string {
  const { table, limit, filter } = args;
  
  if (table === 'all' || !table) {
    return `
// IndexedDB Inspector - Alle Tabellen
(async () => {
  const { db } = await import('/src/lib/db.ts');
  const tables = ['episodes', 'garminData', 'logs', 'settings', 'archivedEpisodes'];
  const result = {};
  
  for (const tableName of tables) {
    try {
      const data = await db[tableName].toArray();
      result[tableName] = {
        count: data.length,
        sample: data.slice(0, ${limit || 5})
      };
    } catch (e) {
      result[tableName] = { error: e.message };
    }
  }
  
  console.table(result);
  return result;
})();
    `.trim();
  }
  
  return `
// IndexedDB Inspector - Tabelle: ${table}
(async () => {
  const { db } = await import('/src/lib/db.ts');
  
  let query = db.${table};
  
  ${filter ? `
  // Filter anwenden
  const filterKey = Object.keys(${JSON.stringify(filter)})[0];
  const filterValue = Object.values(${JSON.stringify(filter)})[0];
  query = query.where(filterKey).equals(filterValue);
  ` : ''}
  
  ${limit ? `query = query.limit(${limit});` : ''}
  
  const data = await query.toArray();
  
  console.log('Table: ${table}');
  console.log('Count:', data.length);
  console.table(data);
  
  return {
    table: '${table}',
    count: data.length,
    data
  };
})();
  `.trim();
}

/**
 * Gibt Schema-Informationen zurück
 */
export async function getDbSchema(): Promise<any> {
  return {
    database: 'MigraineDB',
    version: 1,
    tables: {
      episodes: {
        keyPath: 'id',
        autoIncrement: true,
        indexes: ['startTime', 'endTime', 'intensity', 'triggers', 'medicines']
      },
      garminData: {
        keyPath: 'date',
        indexes: ['sleepScore', 'stressLevel', 'restingHR', 'hrv', 'bodyBattery', 'steps']
      },
      logs: {
        keyPath: 'id',
        autoIncrement: true,
        indexes: ['timestamp', 'level']
      },
      settings: {
        keyPath: 'key'
      },
      archivedEpisodes: {
        keyPath: 'id',
        autoIncrement: true,
        indexes: ['startTime', 'endTime']
      }
    },
    encrypted: true,
    encryptionMethod: 'dexie-encrypted (AES-256)'
  };
}

/**
 * Statistiken über die DB
 */
export async function getDbStats(): Promise<any> {
  return {
    instructions: 'Führe folgendes Script in den Browser DevTools aus:',
    browserScript: `
(async () => {
  const { db } = await import('/src/lib/db.ts');
  
  const stats = {
    episodes: await db.episodes.count(),
    archivedEpisodes: await db.archivedEpisodes.count(),
    garminData: await db.garminData.count(),
    logs: await db.logs.count(),
    settings: await db.settings.count(),
  };
  
  // Zusätzliche Statistiken
  const latestEpisode = await db.episodes.orderBy('startTime').last();
  const latestGarmin = await db.garminData.orderBy('date').last();
  
  stats.latestEpisode = latestEpisode?.startTime;
  stats.latestGarminSync = latestGarmin?.date;
  
  console.table(stats);
  return stats;
})();
    `.trim()
  };
}
