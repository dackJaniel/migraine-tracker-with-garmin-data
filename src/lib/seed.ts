import { db, type Episode, type GarminData } from '@/lib/db';
import { subDays } from 'date-fns';

/**
 * Seed Script für Test-Daten
 * Generiert realistische Dummy-Daten für Entwicklung und Testing
 */

/**
 * Generiert Dummy Episoden für die letzten X Tage
 */
export async function seedEpisodes(days = 90): Promise<number> {
    const episodes: Omit<Episode, 'id'>[] = [];
    const now = new Date();

    const triggers = [
        'Stress',
        'Schlafmangel',
        'Wetter',
        'Alkohol',
        'Koffein',
        'Helles Licht',
        'Lärm',
        'Hormonschwankungen',
        'Bestimmte Lebensmittel',
        'Dehydrierung',
    ];

    const medicines = [
        'Ibuprofen 400mg',
        'Paracetamol 500mg',
        'Sumatriptan 50mg',
        'Aspirin 500mg',
    ];

    // Generiere zufällige Episoden (ca. 2-3 pro Monat)
    const episodeCount = Math.floor((days / 30) * 2.5);

    for (let i = 0; i < episodeCount; i++) {
        const daysAgo = Math.floor(Math.random() * days);
        const startDate = subDays(now, daysAgo);
        const duration = Math.floor(Math.random() * 12) + 2; // 2-14 Stunden

        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + duration);

        const intensity = Math.floor(Math.random() * 7) + 3; // 3-10

        // Zufällige Trigger (1-3)
        const triggerCount = Math.floor(Math.random() * 3) + 1;
        const selectedTriggers = triggers
            .sort(() => Math.random() - 0.5)
            .slice(0, triggerCount);

        // Zufällige Medikamente (0-2)
        const medicineCount = Math.random() > 0.3 ? Math.floor(Math.random() * 2) + 1 : 0;
        const selectedMedicines = medicines
            .sort(() => Math.random() - 0.5)
            .slice(0, medicineCount);

        episodes.push({
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            intensity,
            triggers: selectedTriggers,
            medicines: selectedMedicines,
            symptoms: {
                nausea: Math.random() > 0.5,
                photophobia: Math.random() > 0.4,
                phonophobia: Math.random() > 0.6,
                aura: Math.random() > 0.8,
            },
            notes:
                Math.random() > 0.7
                    ? 'Testnotiz für diese Episode'
                    : undefined,
            createdAt: startDate.toISOString(),
            updatedAt: startDate.toISOString(),
        });
    }

    await db.episodes.bulkAdd(episodes);
    return episodes.length;
}

/**
 * Generiert Dummy Garmin Daten für die letzten X Tage
 */
export async function seedGarminData(days = 30): Promise<number> {
    const garminData: GarminData[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
        const date = subDays(now, i);
        const dateStr = date.toISOString().split('T')[0];

        // Realistische Random-Werte
        const sleepMinutes = Math.floor(Math.random() * 120) + 360; // 6-8h
        const deepSleep = Math.floor(sleepMinutes * (0.15 + Math.random() * 0.1)); // 15-25%
        const lightSleep = Math.floor(sleepMinutes * (0.45 + Math.random() * 0.1)); // 45-55%
        const remSleep = Math.floor(sleepMinutes * (0.2 + Math.random() * 0.1)); // 20-30%
        const awakeSleep = sleepMinutes - deepSleep - lightSleep - remSleep;

        garminData.push({
            date: dateStr,
            sleepScore: Math.floor(Math.random() * 30) + 60, // 60-90
            sleepStages: {
                deep: deepSleep,
                light: lightSleep,
                rem: remSleep,
                awake: Math.max(0, awakeSleep),
            },
            stressLevel: {
                average: Math.floor(Math.random() * 40) + 30, // 30-70
                max: Math.floor(Math.random() * 30) + 70, // 70-100
            },
            restingHR: Math.floor(Math.random() * 15) + 55, // 55-70
            maxHR: Math.floor(Math.random() * 20) + 160, // 160-180
            hrv: Math.floor(Math.random() * 30) + 40, // 40-70
            bodyBattery: {
                charged: Math.floor(Math.random() * 20) + 70, // 70-90
                drained: Math.floor(Math.random() * 20) + 40, // 40-60
                current: Math.floor(Math.random() * 40) + 50, // 50-90
            },
            steps: Math.floor(Math.random() * 5000) + 5000, // 5000-10000
            hydration: Math.floor(Math.random() * 1000) + 1500, // 1500-2500ml
            respirationRate: Math.floor(Math.random() * 4) + 14, // 14-18
            spo2: Math.floor(Math.random() * 3) + 96, // 96-99%
            syncedAt: new Date().toISOString(),
        });
    }

    await db.garminData.bulkPut(garminData);
    return garminData.length;
}

/**
 * Löscht alle Daten (für Testing)
 */
export async function clearAllData(): Promise<void> {
    await db.episodes.clear();
    await db.garminData.clear();
    await db.logs.clear();
    await db.archivedEpisodes.clear();
}

/**
 * Seed alle Daten auf einmal
 */
export async function seedAllData(): Promise<{
    episodes: number;
    garminData: number;
}> {
    const episodes = await seedEpisodes(90);
    const garminData = await seedGarminData(30);

    return { episodes, garminData };
}
