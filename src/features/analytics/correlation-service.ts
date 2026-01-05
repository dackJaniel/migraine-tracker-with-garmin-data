import { db } from '@/lib/db';
import { format, getHours } from 'date-fns';

export interface CorrelationResult {
    title: string;
    description: string;
    percentage: number;
    sampleSize: number;
    isSignificant: boolean;
    pValue?: number;
    type: 'sleep' | 'stress' | 'hrv' | 'trigger' | 'bodyBattery' | 'nightOnset';
}

/**
 * Analysiert die Korrelation zwischen Schlafmangel und Migräne-Episoden
 */
export async function analyzeSleepCorrelation(): Promise<CorrelationResult | null> {
    const episodes = await db.episodes.toArray();
    if (episodes.length < 5) return null;

    let daysWithLowSleep = 0;
    let episodesAfterLowSleep = 0;

    for (const episode of episodes) {
        // Schlaf-Daten vom Vortag holen
        const previousDay = format(
            new Date(new Date(episode.startTime).getTime() - 24 * 60 * 60 * 1000),
            'yyyy-MM-dd'
        );

        const garminData = await db.garminData.get(previousDay);

        if (garminData?.sleepStages) {
            const totalSleepMinutes =
                garminData.sleepStages.deep +
                garminData.sleepStages.light +
                garminData.sleepStages.rem;
            const sleepHours = totalSleepMinutes / 60;

            if (sleepHours < 6) {
                daysWithLowSleep++;
                episodesAfterLowSleep++;
            }
        }
    }

    if (daysWithLowSleep === 0) return null;

    // Baseline: Wie viele Tage mit >6h Schlaf hatten Episoden?
    const allGarminDays = await db.garminData.toArray();
    let daysWithGoodSleep = 0;
    let episodesAfterGoodSleep = 0;

    for (const garminDay of allGarminDays) {
        if (!garminDay.sleepStages) continue;

        const totalSleepMinutes =
            garminDay.sleepStages.deep +
            garminDay.sleepStages.light +
            garminDay.sleepStages.rem;
        const sleepHours = totalSleepMinutes / 60;

        if (sleepHours >= 6) {
            daysWithGoodSleep++;

            // Prüfe ob am Folgetag eine Episode war
            const nextDay = format(
                new Date(new Date(garminDay.date).getTime() + 24 * 60 * 60 * 1000),
                'yyyy-MM-dd'
            );
            const hasEpisode = episodes.some(
                (ep) => format(new Date(ep.startTime), 'yyyy-MM-dd') === nextDay
            );
            if (hasEpisode) episodesAfterGoodSleep++;
        }
    }

    const lowSleepRate =
        daysWithLowSleep > 0 ? (episodesAfterLowSleep / daysWithLowSleep) * 100 : 0;
    const goodSleepRate =
        daysWithGoodSleep > 0 ? (episodesAfterGoodSleep / daysWithGoodSleep) * 100 : 0;

    const increasePercentage =
        goodSleepRate > 0
            ? Math.round(((lowSleepRate - goodSleepRate) / goodSleepRate) * 100)
            : 0;

    // Chi-Square Test (vereinfacht)
    const pValue = calculateChiSquare(
        episodesAfterLowSleep,
        daysWithLowSleep - episodesAfterLowSleep,
        episodesAfterGoodSleep,
        daysWithGoodSleep - episodesAfterGoodSleep
    );

    return {
        title: 'Schlafmangel & Migräne',
        description: `An Tagen mit weniger als 6 Stunden Schlaf hattest du ${increasePercentage > 0 ? increasePercentage + '% mehr' : 'keine signifikant mehr'} Migräne-Episoden (${episodesAfterLowSleep} von ${daysWithLowSleep} Tagen)`,
        percentage: Math.round(lowSleepRate),
        sampleSize: daysWithLowSleep,
        isSignificant: pValue < 0.05 && increasePercentage > 20,
        pValue,
        type: 'sleep',
    };
}

/**
 * Analysiert die Korrelation zwischen hohem Stress und Migräne-Episoden
 */
export async function analyzeStressCorrelation(): Promise<CorrelationResult | null> {
    const episodes = await db.episodes.toArray();
    if (episodes.length < 5) return null;

    let daysWithHighStress = 0;
    let episodesWithHighStress = 0;

    for (const episode of episodes) {
        const episodeDate = format(new Date(episode.startTime), 'yyyy-MM-dd');
        const garminData = await db.garminData.get(episodeDate);

        if (garminData?.stressLevel?.average) {
            if (garminData.stressLevel.average > 70) {
                daysWithHighStress++;
                episodesWithHighStress++;
            }
        }
    }

    if (daysWithHighStress === 0) return null;

    const percentage = Math.round((episodesWithHighStress / daysWithHighStress) * 100);

    return {
        title: 'Hoher Stress & Migräne',
        description: `Bei ${daysWithHighStress} Episoden lag ein hoher Stress-Level (>70) vor. Das entspricht ${percentage}% aller Episoden mit Stress-Daten.`,
        percentage,
        sampleSize: daysWithHighStress,
        isSignificant: percentage > 50,
        type: 'stress',
    };
}

/**
 * Analysiert die Korrelation zwischen niedriger HRV und Migräne-Episoden
 */
export async function analyzeHRVCorrelation(): Promise<CorrelationResult | null> {
    const episodes = await db.episodes.toArray();
    if (episodes.length < 5) return null;

    // HRV Durchschnitt berechnen
    const allGarminData = await db.garminData.toArray();
    const hrvValues = allGarminData.filter((d) => d.hrv).map((d) => d.hrv!);

    if (hrvValues.length < 10) return null;

    const avgHRV = hrvValues.reduce((sum, val) => sum + val, 0) / hrvValues.length;
    const lowHRVThreshold = avgHRV * 0.8; // 20% unter Durchschnitt

    let daysWithLowHRV = 0;
    let episodesAfterLowHRV = 0;

    for (const episode of episodes) {
        const previousDay = format(
            new Date(new Date(episode.startTime).getTime() - 24 * 60 * 60 * 1000),
            'yyyy-MM-dd'
        );

        const garminData = await db.garminData.get(previousDay);

        if (garminData?.hrv && garminData.hrv < lowHRVThreshold) {
            daysWithLowHRV++;
            episodesAfterLowHRV++;
        }
    }

    if (daysWithLowHRV === 0) return null;

    const percentage = Math.round((episodesAfterLowHRV / daysWithLowHRV) * 100);

    return {
        title: 'Niedrige HRV & Migräne',
        description: `An Tagen mit niedriger Herzratenvariabilität (HRV < ${Math.round(lowHRVThreshold)}) hattest du in ${percentage}% der Fälle am Folgetag eine Migräne (${episodesAfterLowHRV} von ${daysWithLowHRV} Tagen)`,
        percentage,
        sampleSize: daysWithLowHRV,
        isSignificant: percentage > 40,
        type: 'hrv',
    };
}

/**
 * Analysiert die Korrelation zwischen Body Battery und Migräne-Episoden
 */
export async function analyzeBodyBatteryCorrelation(): Promise<CorrelationResult | null> {
    const episodes = await db.episodes.toArray();
    if (episodes.length < 5) return null;

    let daysWithLowBattery = 0;
    let episodesWithLowBattery = 0;

    for (const episode of episodes) {
        const episodeDate = format(new Date(episode.startTime), 'yyyy-MM-dd');
        const garminData = await db.garminData.get(episodeDate);

        if (garminData?.bodyBattery?.current) {
            if (garminData.bodyBattery.current < 30) {
                daysWithLowBattery++;
                episodesWithLowBattery++;
            }
        }
    }

    if (daysWithLowBattery === 0) return null;

    const percentage = Math.round((episodesWithLowBattery / daysWithLowBattery) * 100);

    return {
        title: 'Niedrige Body Battery & Migräne',
        description: `Bei ${episodesWithLowBattery} Episoden war die Body Battery niedrig (<30). Das sind ${percentage}% aller Episoden mit Body Battery Daten.`,
        percentage,
        sampleSize: daysWithLowBattery,
        isSignificant: percentage > 50,
        type: 'bodyBattery',
    };
}

/**
 * Analysiert Trigger-Muster
 */
export async function analyzeTriggerPatterns(): Promise<CorrelationResult[]> {
    const episodes = await db.episodes.toArray();
    if (episodes.length < 5) return [];

    const triggerMap = new Map<string, { total: number; intense: number }>();

    episodes.forEach((ep) => {
        ep.triggers.forEach((trigger) => {
            const current = triggerMap.get(trigger) || { total: 0, intense: 0 };
            triggerMap.set(trigger, {
                total: current.total + 1,
                intense: current.intense + (ep.intensity >= 7 ? 1 : 0),
            });
        });
    });

    return Array.from(triggerMap.entries())
        .filter(([, stats]) => stats.total >= 3) // Mind. 3 Vorkommen
        .map(([trigger, stats]) => ({
            title: `Trigger: ${trigger}`,
            description: `In ${stats.intense} von ${stats.total} Fällen (${Math.round((stats.intense / stats.total) * 100)}%) führte "${trigger}" zu einer starken Migräne (Intensität ≥7)`,
            percentage: Math.round((stats.intense / stats.total) * 100),
            sampleSize: stats.total,
            isSignificant: stats.total >= 5 && stats.intense / stats.total > 0.5,
            type: 'trigger' as const,
        }))
        .sort((a, b) => b.percentage - a.percentage);
}

/**
 * Analysiert Nacht-Onset Muster (PAKET 10)
 * Gibt Statistiken über Migränen, die nachts beginnen
 */
export async function analyzeNightOnsetCorrelation(): Promise<CorrelationResult | null> {
    const episodes = await db.episodes.toArray();
    if (episodes.length < 5) return null;

    // Zähle Episoden nach Tageszeit
    let nightOnsetCount = 0;
    let wokeUpWithMigraineCount = 0;
    let morningCount = 0;  // 06:00-12:00
    let afternoonCount = 0; // 12:00-18:00
    let eveningCount = 0;   // 18:00-22:00
    let nightCount = 0;     // 22:00-06:00

    for (const episode of episodes) {
        const startHour = getHours(new Date(episode.startTime));

        // Kategorisiere nach Tageszeit
        if (startHour >= 6 && startHour < 12) {
            morningCount++;
        } else if (startHour >= 12 && startHour < 18) {
            afternoonCount++;
        } else if (startHour >= 18 && startHour < 22) {
            eveningCount++;
        } else {
            nightCount++;
        }

        // Zähle Night-Onset und wokeUpWithMigraine
        if (episode.nightOnset) {
            nightOnsetCount++;
        }
        if (episode.wokeUpWithMigraine) {
            wokeUpWithMigraineCount++;
        }
    }

    const totalEpisodes = episodes.length;
    const nightPercentage = Math.round((nightCount / totalEpisodes) * 100);
    const wokeUpPercentage = Math.round((wokeUpWithMigraineCount / totalEpisodes) * 100);

    // Korrelation mit Garmin Sleep Score bei Nacht-Migränen
    let lowSleepScoreNightMigraine = 0;
    let nightMigraineWithSleepData = 0;

    for (const episode of episodes) {
        if (episode.nightOnset || episode.wokeUpWithMigraine) {
            const previousDay = format(
                new Date(new Date(episode.startTime).getTime() - 24 * 60 * 60 * 1000),
                'yyyy-MM-dd'
            );
            const garminData = await db.garminData.get(previousDay);

            if (garminData?.sleepScore) {
                nightMigraineWithSleepData++;
                if (garminData.sleepScore < 70) {
                    lowSleepScoreNightMigraine++;
                }
            }
        }
    }

    const sleepCorrelation = nightMigraineWithSleepData > 0
        ? Math.round((lowSleepScoreNightMigraine / nightMigraineWithSleepData) * 100)
        : 0;

    return {
        title: 'Nachtzeit-Migräne',
        description: `${nightPercentage}% deiner Migränen beginnen nachts (22-06 Uhr). ${wokeUpPercentage}% wachst du mit Migräne auf.${sleepCorrelation > 50 ? ` Bei ${sleepCorrelation}% der Nacht-Migränen war der Schlaf-Score des Vortags niedrig (<70).` : ''}`,
        percentage: nightPercentage,
        sampleSize: totalEpisodes,
        isSignificant: nightPercentage > 30 || wokeUpPercentage > 30,
        type: 'nightOnset',
    };
}

/**
 * Analysiert Verteilung nach Tageszeit (PAKET 10)
 */
export async function analyzeTimeOfDayDistribution(): Promise<{
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
    total: number;
}> {
    const episodes = await db.episodes.toArray();

    let morning = 0;
    let afternoon = 0;
    let evening = 0;
    let night = 0;

    for (const episode of episodes) {
        const startHour = getHours(new Date(episode.startTime));

        if (startHour >= 6 && startHour < 12) {
            morning++;
        } else if (startHour >= 12 && startHour < 18) {
            afternoon++;
        } else if (startHour >= 18 && startHour < 22) {
            evening++;
        } else {
            night++;
        }
    }

    return { morning, afternoon, evening, night, total: episodes.length };
}

/**
 * Führt alle Korrelationsanalysen durch
 */
export async function analyzeAllCorrelations(): Promise<CorrelationResult[]> {
    const results = await Promise.all([
        analyzeSleepCorrelation(),
        analyzeStressCorrelation(),
        analyzeHRVCorrelation(),
        analyzeBodyBatteryCorrelation(),
        analyzeNightOnsetCorrelation(),
        analyzeTriggerPatterns(),
    ]);

    return results.flat().filter((r): r is CorrelationResult => r !== null);
}

/**
 * Chi-Square Test (vereinfacht)
 * Berechnet p-value für 2x2 Kontingenztabelle
 */
function calculateChiSquare(a: number, b: number, c: number, d: number): number {
    const n = a + b + c + d;
    const chiSquare =
        (n * Math.pow(a * d - b * c, 2)) / ((a + b) * (c + d) * (a + c) * (b + d));

    // Approximation für p-value (df=1)
    if (chiSquare > 6.635) return 0.01; // Hoch signifikant
    if (chiSquare > 3.841) return 0.05; // Signifikant bei 95%
    return 0.1; // Nicht signifikant
}
