/**
 * Mock Data Generators für Migraine Tracker MCP Server
 * 
 * Exportiert realistische Generator-Funktionen für:
 * - Migräne-Episoden (episode-generator.ts)
 * - Garmin Gesundheitsmetriken (garmin-generator.ts)
 * 
 * Alle Generatoren nutzen @faker-js/faker für Varianz und Realismus
 * und implementieren realistische Korrelationen zwischen Metriken.
 */

// Episode Generators
export {
    generateEpisodes,
    generateActiveEpisode,
    generateEpisodesForYear,
    type Episode
} from './episode-generator.js';

// Garmin Data Generators
export {
    generateGarminData,
    generateGarminDataForDate,
    generateGarminDataForYear,
    generateHighRiskGarminData,
    generateIncompleteGarminData,
    type GarminData
} from './garmin-generator.js';

/**
 * Utility: Generiert vollständigen Datensatz für Testing
 * 
 * @param options Konfiguration für den Datensatz
 * @returns Objekt mit Episodes und GarminData
 * 
 * @example
 * const testData = generateTestDataset({
 *   year: 2025,
 *   episodeCount: 10
 * });
 * // Gibt { episodes: Episode[], garminData: GarminData[] } zurück
 */
export function generateTestDataset(options: {
    year: number;
    episodeCount?: number;
}): {
    episodes: import('./episode-generator.js').Episode[];
    garminData: import('./garmin-generator.js').GarminData[];
} {
    const { year, episodeCount } = options;

    // Importiere benötigte Funktionen
    const { generateEpisodesForYear } = require('./episode-generator.js');
    const { generateGarminDataForYear } = require('./garmin-generator.js');

    // Generiere Episoden (8-12 pro Jahr oder spezifische Anzahl)
    const episodes = episodeCount
        ? (() => {
            const { generateEpisodes } = require('./episode-generator.js');
            return generateEpisodes(episodeCount, {
                start: new Date(year, 0, 1),
                end: new Date(year, 11, 31)
            });
        })()
        : generateEpisodesForYear(year);

    // Generiere Garmin-Daten für das ganze Jahr
    const garminData = generateGarminDataForYear(year);

    return {
        episodes,
        garminData
    };
}
