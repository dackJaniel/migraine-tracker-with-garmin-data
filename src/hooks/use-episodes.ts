import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

/**
 * Custom Hook: Episoden abrufen mit optionalem Filter
 */
export function useEpisodes(filter?: {
    startDate?: Date;
    endDate?: Date;
    minIntensity?: number;
    triggers?: string[];
}) {
    return useLiveQuery(async () => {
        let query = db.episodes.orderBy('startTime').reverse();

        if (filter?.startDate) {
            query = query.filter(
                episode => new Date(episode.startTime) >= filter.startDate!
            );
        }

        if (filter?.endDate) {
            query = query.filter(
                episode => new Date(episode.startTime) <= filter.endDate!
            );
        }

        if (filter?.minIntensity) {
            query = query.filter(episode => episode.intensity >= filter.minIntensity!);
        }

        if (filter?.triggers && filter.triggers.length > 0) {
            query = query.filter(episode =>
                filter.triggers!.some(trigger => episode.triggers.includes(trigger))
            );
        }

        return await query.toArray();
    }, [filter]);
}

/**
 * Custom Hook: Garmin Daten für einen Datumsbereich
 */
export function useGarminData(startDate?: Date, endDate?: Date) {
    return useLiveQuery(async () => {
        if (!startDate || !endDate) {
            return await db.garminData.orderBy('date').reverse().limit(30).toArray();
        }

        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];

        return await db.garminData
            .where('date')
            .between(start, end, true, true)
            .toArray();
    }, [startDate, endDate]);
}

/**
 * Custom Hook: Statistiken über Episoden
 */
export function useStats() {
    return useLiveQuery(async () => {
        const allEpisodes = await db.episodes.toArray();

        if (allEpisodes.length === 0) {
            return {
                totalEpisodes: 0,
                averageIntensity: 0,
                daysSinceLastEpisode: null,
                mostCommonTriggers: [],
                episodesThisMonth: 0,
            };
        }

        // Total Episoden
        const totalEpisodes = allEpisodes.length;

        // Durchschnittliche Intensität
        const averageIntensity =
            allEpisodes.reduce((sum, ep) => sum + ep.intensity, 0) / totalEpisodes;

        // Tage seit letzter Episode
        const sortedEpisodes = allEpisodes.sort(
            (a, b) =>
                new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        const lastEpisode = sortedEpisodes[0];
        const daysSinceLastEpisode = Math.floor(
            (Date.now() - new Date(lastEpisode.startTime).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        // Häufigste Trigger
        const triggerCounts = new Map<string, number>();
        allEpisodes.forEach(episode => {
            episode.triggers.forEach(trigger => {
                triggerCounts.set(trigger, (triggerCounts.get(trigger) || 0) + 1);
            });
        });
        const mostCommonTriggers = Array.from(triggerCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([trigger, count]) => ({ trigger, count }));

        // Episoden diesen Monat
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const episodesThisMonth = allEpisodes.filter(
            ep => new Date(ep.startTime) >= firstDayOfMonth
        ).length;

        return {
            totalEpisodes,
            averageIntensity: Math.round(averageIntensity * 10) / 10,
            daysSinceLastEpisode,
            mostCommonTriggers,
            episodesThisMonth,
        };
    });
}

/**
 * Custom Hook: Einzelne Episode
 */
export function useEpisode(id?: number) {
    return useLiveQuery(async () => {
        if (!id) return null;
        return await db.episodes.get(id);
    }, [id]);
}

/**
 * Custom Hook: Garmin Daten für ein bestimmtes Datum
 */
export function useGarminDataForDate(date?: Date) {
    return useLiveQuery(async () => {
        if (!date) return null;
        const dateStr = date.toISOString().split('T')[0];
        return await db.garminData.get(dateStr);
    }, [date]);
}
