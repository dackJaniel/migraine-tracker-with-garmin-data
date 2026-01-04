import { subYears } from 'date-fns';
import { db, addLog } from '@/lib/db';

/**
 * Archivierungs-Service
 * Verschiebt Episoden älter als 2 Jahre in archivedEpisodes Tabelle
 */

/**
 * Archiviert alle Episoden älter als 2 Jahre
 */
export async function archiveOldEpisodes(): Promise<{
  archived: number;
  error?: string;
}> {
  try {
    const twoYearsAgo = subYears(new Date(), 2).toISOString();

    // Episoden älter als 2 Jahre finden
    const oldEpisodes = await db.episodes
      .where('startTime')
      .below(twoYearsAgo)
      .toArray();

    if (oldEpisodes.length === 0) {
      return { archived: 0 };
    }

    // In archivedEpisodes kopieren
    const archivedEpisodes = oldEpisodes.map(episode => ({
      ...episode,
      id: undefined, // Neue ID generieren lassen
      archivedAt: new Date().toISOString(),
    }));

    await db.archivedEpisodes.bulkAdd(archivedEpisodes);

    // Originale löschen
    const idsToDelete = oldEpisodes.map(ep => ep.id!);
    await db.episodes.bulkDelete(idsToDelete);

    await addLog('info', `Archived ${oldEpisodes.length} old episodes`);

    return { archived: oldEpisodes.length };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : 'Unknown error';
    await addLog('error', 'Failed to archive episodes', { error: errorMsg });
    return { archived: 0, error: errorMsg };
  }
}

/**
 * Gibt die Anzahl archivierter Episoden zurück
 */
export async function getArchivedCount(): Promise<number> {
  return await db.archivedEpisodes.count();
}

/**
 * Lädt archivierte Episoden (für Export oder Anzeige)
 */
export async function getArchivedEpisodes() {
  return await db.archivedEpisodes.orderBy('startTime').reverse().toArray();
}

/**
 * Prüft ob Episoden archiviert werden müssen
 */
export async function needsArchiving(): Promise<boolean> {
  const twoYearsAgo = subYears(new Date(), 2).toISOString();
  const count = await db.episodes.where('startTime').below(twoYearsAgo).count();
  return count > 0;
}
