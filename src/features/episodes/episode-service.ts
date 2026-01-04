import { db, type Episode, addLog } from '@/lib/db';

/**
 * Episode erstellen
 */
export async function createEpisode(
    episode: Omit<Episode, 'id' | 'createdAt' | 'updatedAt'>
): Promise<number> {
    const now = new Date().toISOString();

    try {
        const id = await db.episodes.add({
            ...episode,
            createdAt: now,
            updatedAt: now,
        });

        await addLog('info', 'Episode created', { id });
        return id as number;
    } catch (error) {
        await addLog('error', 'Failed to create episode', { error });
        throw error;
    }
}

/**
 * Episode aktualisieren
 */
export async function updateEpisode(
    id: number,
    updates: Partial<Omit<Episode, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
    try {
        await db.episodes.update(id, {
            ...updates,
            updatedAt: new Date().toISOString(),
        });

        await addLog('info', 'Episode updated', { id });
    } catch (error) {
        await addLog('error', 'Failed to update episode', { id, error });
        throw error;
    }
}

/**
 * Episode löschen
 */
export async function deleteEpisode(id: number): Promise<void> {
    try {
        await db.episodes.delete(id);
        await addLog('info', 'Episode deleted', { id });
    } catch (error) {
        await addLog('error', 'Failed to delete episode', { id, error });
        throw error;
    }
}

/**
 * Alle Trigger abrufen (für Autocomplete)
 */
export async function getAllTriggers(): Promise<string[]> {
    const episodes = await db.episodes.toArray();
    const triggers = new Set<string>();

    episodes.forEach(episode => {
        episode.triggers.forEach(trigger => triggers.add(trigger));
    });

    return Array.from(triggers).sort();
}

/**
 * Alle Medikamente abrufen (für Autocomplete)
 */
export async function getAllMedicines(): Promise<string[]> {
    const episodes = await db.episodes.toArray();
    const medicines = new Set<string>();

    episodes.forEach(episode => {
        episode.medicines.forEach(medicine => medicines.add(medicine));
    });

    return Array.from(medicines).sort();
}
