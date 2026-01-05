/**
 * DB Seed Tool
 * Generiert Test-Daten für die Migraine Tracker DB
 */

import { z } from 'zod';
import {
    generateEpisodes,
    generateGarminData,
    generateTestDataset
} from '../generators/index.js';

const DbSeedArgsSchema = z.object({
    type: z.enum(['episodes', 'garmin', 'both', 'full']).default('both'),
    count: z.number().optional(),
    dateRange: z.object({
        start: z.string(),
        end: z.string()
    }).optional(),
    preset: z.enum(['minimal', 'realistic', 'extensive']).optional(),
});

export type DbSeedArgs = z.infer<typeof DbSeedArgsSchema>;

export interface DbSeedResult {
    success: boolean;
    generated: {
        episodes?: number;
        garminData?: number;
    };
    data?: any;
    browserScript?: string;
    instructions?: string;
}

/**
 * Generiert und gibt Test-Daten zurück
 */
export async function seedDatabase(args: DbSeedArgs): Promise<DbSeedResult> {
    const validated = DbSeedArgsSchema.parse(args);

    // Bestimme Preset
    const preset = validated.preset || 'realistic';
    const presetConfig = getPresetConfig(preset);

    // Bestimme Date Range
    const dateRange = validated.dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 Tage zurück
        end: new Date().toISOString()
    };

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    let episodes: any[] = [];
    let garminData: any[] = [];

    // Generiere Daten basierend auf Type
    if (validated.type === 'full') {
        const dataset = generateTestDataset({
            episodeCount: presetConfig.episodeCount,
            year: new Date().getFullYear(),
        });
        episodes = dataset.episodes;
        garminData = dataset.garminData;
    } else {
        if (validated.type === 'episodes' || validated.type === 'both') {
            const count = validated.count || presetConfig.episodeCount;
            episodes = generateEpisodes(count, { start: startDate, end: endDate });
        }

        if (validated.type === 'garmin' || validated.type === 'both') {
            garminData = generateGarminData({ start: startDate, end: endDate });
        }
    }

    // Generiere Browser-Script zum Einfügen der Daten
    const browserScript = generateSeedScript(episodes, garminData);

    return {
        success: true,
        generated: {
            episodes: episodes.length,
            garminData: garminData.length,
        },
        data: {
            episodes: episodes.slice(0, 3), // Nur Sample in Response
            garminData: garminData.slice(0, 3),
        },
        browserScript,
        instructions: 'Führe das browserScript in den Browser DevTools aus, um die Daten einzufügen. Die vollständigen Daten sind im Script enthalten.'
    };
}

/**
 * Preset-Konfigurationen
 */
function getPresetConfig(preset: string) {
    switch (preset) {
        case 'minimal':
            return {
                episodeCount: 5,
                garminDays: 7,
            };
        case 'extensive':
            return {
                episodeCount: 50,
                garminDays: 90,
            };
        case 'realistic':
        default:
            return {
                episodeCount: 15,
                garminDays: 30,
            };
    }
}

/**
 * Generiert Browser-Script zum Seeden
 */
function generateSeedScript(episodes: any[], garminData: any[]): string {
    return `
// DB Seed Script - Migraine Tracker
(async () => {
  const { db } = await import('/src/lib/db.ts');
  
  console.log('🌱 Seeding database...');
  
  // Episodes
  const episodes = ${JSON.stringify(episodes, null, 2)};
  
  // Konvertiere Date Strings zu Date Objects
  const processedEpisodes = episodes.map(ep => ({
    ...ep,
    startTime: new Date(ep.startTime),
    endTime: ep.endTime ? new Date(ep.endTime) : undefined,
    createdAt: new Date(ep.createdAt),
    updatedAt: new Date(ep.updatedAt),
  }));
  
  // Garmin Data
  const garminData = ${JSON.stringify(garminData, null, 2)};
  
  const processedGarminData = garminData.map(gd => ({
    ...gd,
    syncedAt: new Date(gd.syncedAt),
  }));
  
  // Insert into DB
  try {
    if (processedEpisodes.length > 0) {
      await db.episodes.bulkAdd(processedEpisodes);
      console.log('✅ Inserted', processedEpisodes.length, 'episodes');
    }
    
    if (processedGarminData.length > 0) {
      await db.garminData.bulkPut(processedGarminData); // bulkPut für upsert
      console.log('✅ Inserted', processedGarminData.length, 'garmin data entries');
    }
    
    console.log('🎉 Seeding complete!');
    
    // Stats
    const stats = {
      totalEpisodes: await db.episodes.count(),
      totalGarminData: await db.garminData.count(),
    };
    console.table(stats);
    
    return stats;
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
})();
  `.trim();
}

/**
 * Quick Seed Presets
 */
export async function quickSeed(preset: 'demo' | 'test' | 'stress-test'): Promise<DbSeedResult> {
    switch (preset) {
        case 'demo':
            return seedDatabase({
                type: 'both',
                preset: 'realistic',
                dateRange: {
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    end: new Date().toISOString()
                }
            });

        case 'test':
            return seedDatabase({
                type: 'both',
                preset: 'minimal',
                dateRange: {
                    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    end: new Date().toISOString()
                }
            });

        case 'stress-test':
            return seedDatabase({
                type: 'full',
                preset: 'extensive',
            });

        default:
            throw new Error(`Unknown preset: ${preset}`);
    }
}
