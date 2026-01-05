import { db, type Episode, type IntensityEntry, addLog } from '@/lib/db';

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

/**
 * Episode nach ID abrufen
 */
export async function getEpisodeById(id: number): Promise<Episode | undefined> {
    try {
        return await db.episodes.get(id);
    } catch (error) {
        await addLog('error', 'Failed to get episode', { id, error });
        throw error;
    }
}

/**
 * Intensität einer Episode aktualisieren (PAKET 9)
 * Fügt einen neuen Eintrag zum IntensityHistory hinzu
 */
export async function updateEpisodeIntensity(
    id: number,
    newIntensity: number,
    note?: string
): Promise<void> {
    try {
        const episode = await db.episodes.get(id);
        if (!episode) {
            throw new Error(`Episode ${id} not found`);
        }

        const now = new Date().toISOString();
        const newEntry: IntensityEntry = {
            timestamp: now,
            intensity: newIntensity,
            note,
        };

        // Füge neuen Eintrag zum History hinzu
        const intensityHistory = [...(episode.intensityHistory || []), newEntry];

        await db.episodes.update(id, {
            intensity: newIntensity,
            intensityHistory,
            updatedAt: now,
        });

        await addLog('info', 'Episode intensity updated', {
            id,
            oldIntensity: episode.intensity,
            newIntensity,
            historyLength: intensityHistory.length,
        });
    } catch (error) {
        await addLog('error', 'Failed to update episode intensity', { id, error });
        throw error;
    }
}

/**
 * Intensitätsverlauf-Statistiken berechnen (PAKET 9)
 */
export function calculateIntensityStats(history: IntensityEntry[]) {
    if (!history || history.length === 0) {
        return {
            average: 0,
            peak: 0,
            peakTime: null as string | null,
            current: 0,
            trend: 'stable' as 'improving' | 'worsening' | 'stable',
            improvementRate: 0,
        };
    }

    const intensities = history.map(h => h.intensity);
    const average = intensities.reduce((sum, i) => sum + i, 0) / intensities.length;
    const peak = Math.max(...intensities);
    const peakEntry = history.find(h => h.intensity === peak);
    const current = history[history.length - 1].intensity;
    const initial = history[0].intensity;

    // Berechne Trend
    let trend: 'improving' | 'worsening' | 'stable' = 'stable';
    if (history.length >= 2) {
        const last = history[history.length - 1].intensity;
        const prev = history[history.length - 2].intensity;
        if (last < prev) trend = 'improving';
        else if (last > prev) trend = 'worsening';
    }

    // Verbesserungsrate (in Prozent von Initial zu Current)
    const improvementRate = initial > 0
        ? Math.round(((initial - current) / initial) * 100)
        : 0;

    return {
        average: Math.round(average * 10) / 10,
        peak,
        peakTime: peakEntry?.timestamp ?? null,
        current,
        trend,
        improvementRate,
    };
}

/**
 * Aggregierte Intensitätsverlauf-Analyse für alle Episoden (PAKET 9)
 * Berechnet typischen Verlauf
 */
export async function analyzeTypicalIntensityPattern(): Promise<{
    avgInitial: number;
    avgPeak: number;
    avgFinal: number;
    avgDurationToPeakMinutes: number;
    avgImprovementRate: number;
    episodesWithHistory: number;
}> {
    const episodes = await db.episodes.toArray();
    const episodesWithHistory = episodes.filter(
        e => e.intensityHistory && e.intensityHistory.length > 1
    );

    if (episodesWithHistory.length === 0) {
        return {
            avgInitial: 0,
            avgPeak: 0,
            avgFinal: 0,
            avgDurationToPeakMinutes: 0,
            avgImprovementRate: 0,
            episodesWithHistory: 0,
        };
    }

    let totalInitial = 0;
    let totalPeak = 0;
    let totalFinal = 0;
    let totalDurationToPeak = 0;
    let totalImprovement = 0;

    episodesWithHistory.forEach(episode => {
        const history = episode.intensityHistory!;
        const initial = history[0].intensity;
        const final = history[history.length - 1].intensity;
        const peak = Math.max(...history.map(h => h.intensity));
        const peakEntry = history.find(h => h.intensity === peak);

        totalInitial += initial;
        totalPeak += peak;
        totalFinal += final;

        if (peakEntry) {
            const peakTime = new Date(peakEntry.timestamp).getTime();
            const startTime = new Date(history[0].timestamp).getTime();
            totalDurationToPeak += (peakTime - startTime) / 60000; // In Minuten
        }

        if (initial > 0) {
            totalImprovement += ((initial - final) / initial) * 100;
        }
    });

    const count = episodesWithHistory.length;

    return {
        avgInitial: Math.round((totalInitial / count) * 10) / 10,
        avgPeak: Math.round((totalPeak / count) * 10) / 10,
        avgFinal: Math.round((totalFinal / count) * 10) / 10,
        avgDurationToPeakMinutes: Math.round(totalDurationToPeak / count),
        avgImprovementRate: Math.round(totalImprovement / count),
        episodesWithHistory: count,
    };
}
