/**
 * DB Clear Tool
 * Löscht Daten aus der Migraine Tracker DB
 */

import { z } from 'zod';

const DbClearArgsSchema = z.object({
  tables: z.array(z.enum(['episodes', 'garminData', 'logs', 'settings', 'archivedEpisodes', 'all'])).default(['all']),
  confirm: z.boolean().default(false),
});

export type DbClearArgs = z.infer<typeof DbClearArgsSchema>;

export interface DbClearResult {
  success: boolean;
  cleared: string[];
  browserScript?: string;
  instructions?: string;
  warning?: string;
}

/**
 * Löscht Tabellen-Daten
 */
export async function clearDatabase(args: DbClearArgs): Promise<DbClearResult> {
  const validated = DbClearArgsSchema.parse(args);

  if (!validated.confirm) {
    return {
      success: false,
      cleared: [],
      warning: 'Confirmation required. Set confirm: true to proceed with deletion.',
      instructions: 'This will permanently delete data. Use with caution!',
    };
  }

  const tablesToClear = validated.tables.includes('all')
    ? ['episodes', 'garminData', 'logs', 'archivedEpisodes']
    : validated.tables.filter(t => t !== 'all'); // Exclude 'settings' by default

  const browserScript = generateClearScript(tablesToClear as string[]);

  return {
    success: true,
    cleared: tablesToClear,
    browserScript,
    instructions: 'Führe das browserScript in den Browser DevTools aus, um die Daten zu löschen.',
    warning: `⚠️ Dies wird ${tablesToClear.join(', ')} unwiderruflich löschen!`,
  };
}

/**
 * Generiert Browser-Script zum Löschen
 */
function generateClearScript(tables: string[]): string {
  return `
// DB Clear Script - Migraine Tracker
(async () => {
  const { db } = await import('/src/lib/db.ts');
  
  console.log('🗑️  Clearing database tables...');
  console.warn('⚠️  This will delete:', ${JSON.stringify(tables)});
  
  const tablesToClear = ${JSON.stringify(tables)};
  const results = {};
  
  for (const tableName of tablesToClear) {
    try {
      const countBefore = await db[tableName].count();
      await db[tableName].clear();
      const countAfter = await db[tableName].count();
      
      results[tableName] = {
        deletedRows: countBefore,
        remainingRows: countAfter,
        status: '✅ Cleared'
      };
      
      console.log(\`✅ Cleared \${tableName}: \${countBefore} rows deleted\`);
    } catch (error) {
      results[tableName] = {
        status: '❌ Error',
        error: error.message
      };
      console.error(\`❌ Failed to clear \${tableName}:\`, error);
    }
  }
  
  console.log('🎉 Clear operation complete!');
  console.table(results);
  
  return results;
})();
  `.trim();
}

/**
 * Reset-Optionen
 */
export async function resetDatabase(type: 'soft' | 'hard'): Promise<DbClearResult> {
  if (type === 'soft') {
    // Soft Reset: Nur user data, keep settings
    return clearDatabase({
      tables: ['episodes', 'garminData', 'logs', 'archivedEpisodes'],
      confirm: true,
    });
  } else {
    // Hard Reset: Alles außer verschlüsseltem Schema
    return clearDatabase({
      tables: ['all'],
      confirm: true,
    });
  }
}

/**
 * Clear nur Logs (für Debugging)
 */
export async function clearLogs(): Promise<DbClearResult> {
  return clearDatabase({
    tables: ['logs'],
    confirm: true,
  });
}

/**
 * Clear nur Test-Daten (altes Zeug)
 */
export async function clearOldData(daysOld: number = 30): Promise<DbClearResult> {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  const browserScript = `
// Clear Old Data Script - Migraine Tracker
(async () => {
  const { db } = await import('/src/lib/db.ts');
  
  const cutoffDate = new Date('${cutoffDate.toISOString()}');
  console.log('🗑️  Clearing data older than:', cutoffDate);
  
  // Delete old episodes
  const oldEpisodes = await db.episodes
    .where('startTime')
    .below(cutoffDate)
    .toArray();
    
  await db.episodes
    .where('startTime')
    .below(cutoffDate)
    .delete();
    
  // Delete old garmin data
  const oldGarminData = await db.garminData
    .where('date')
    .below(cutoffDate.toISOString().split('T')[0])
    .toArray();
    
  await db.garminData
    .where('date')
    .below(cutoffDate.toISOString().split('T')[0])
    .delete();
  
  console.log(\`✅ Deleted \${oldEpisodes.length} old episodes\`);
  console.log(\`✅ Deleted \${oldGarminData.length} old garmin entries\`);
  
  return {
    deletedEpisodes: oldEpisodes.length,
    deletedGarminData: oldGarminData.length,
  };
})();
  `.trim();

  return {
    success: true,
    cleared: [`Data older than ${daysOld} days`],
    browserScript,
    instructions: 'Führe das browserScript aus, um alte Daten zu löschen.',
  };
}
