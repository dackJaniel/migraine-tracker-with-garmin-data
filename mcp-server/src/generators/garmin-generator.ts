import { faker } from '@faker-js/faker';

export interface GarminData {
    date: string; // YYYY-MM-DD (Primary Key)
    sleepScore?: number;
    sleepStages?: {
        deep: number; // minutes
        light: number;
        rem: number;
        awake: number;
    };
    stressLevel?: {
        average: number; // 0-100
        max: number;
    };
    restingHR?: number;
    maxHR?: number;
    hrv?: number;
    bodyBattery?: {
        charged: number;
        drained: number;
        current: number;
    };
    steps?: number;
    hydration?: number; // ml
    respirationRate?: number; // breaths per minute
    spo2?: number; // oxygen saturation percentage
    syncedAt: string; // ISO 8601 Date String
}

/**
 * Berechnet korrelierte Body Battery Werte basierend auf Schlaf und Stress
 */
function calculateBodyBattery(sleepScore: number, stressAverage: number): {
    charged: number;
    drained: number;
    current: number;
} {
    // Guter Schlaf → mehr charged, weniger drained
    // Hoher Stress → mehr drained
    const sleepFactor = sleepScore / 100;
    const stressFactor = stressAverage / 100;

    const charged = Math.round(faker.number.int({ min: 30, max: 70 }) * sleepFactor + faker.number.int({ min: 0, max: 30 }));
    const drained = Math.round(faker.number.int({ min: 20, max: 50 }) * stressFactor + faker.number.int({ min: 0, max: 20 }));
    const current = Math.max(0, Math.min(100, charged - drained + faker.number.int({ min: -10, max: 10 })));

    return { charged, drained, current };
}

/**
 * Berechnet korrelierte HRV basierend auf Schlaf und Stress
 */
function calculateHRV(sleepScore: number, stressAverage: number): number {
    // Guter Schlaf & niedriger Stress → höhere HRV
    const sleepFactor = sleepScore / 100;
    const stressFactor = 1 - (stressAverage / 100);

    const baseHRV = faker.number.int({ min: 30, max: 60 });
    const bonus = Math.round((sleepFactor + stressFactor) * 20);

    return Math.max(20, Math.min(100, baseHRV + bonus));
}

/**
 * Berechnet realistische Schlafphasen basierend auf Gesamtschlafdauer
 */
function calculateSleepStages(totalMinutes: number): {
    deep: number;
    light: number;
    rem: number;
    awake: number;
} {
    // Typische Verteilung: Light 50-55%, Deep 15-20%, REM 20-25%, Awake 5-10%
    const awake = Math.round(totalMinutes * faker.number.float({ min: 0.05, max: 0.10 }));
    const sleepMinutes = totalMinutes - awake;

    const deep = Math.round(sleepMinutes * faker.number.float({ min: 0.15, max: 0.20 }));
    const rem = Math.round(sleepMinutes * faker.number.float({ min: 0.20, max: 0.25 }));
    const light = sleepMinutes - deep - rem;

    return { deep, light, rem, awake };
}

/**
 * Generiert realistische Garmin-Daten für einen einzelnen Tag
 * @param date Datum für das die Daten generiert werden
 * @param options Optionale Parameter zur Beeinflussung der generierten Werte
 */
export function generateGarminDataForDate(
    date: Date,
    options?: {
        poorSleep?: boolean; // Schlechter Schlaf für Korrelation mit Migräne
        highStress?: boolean; // Hoher Stress für Korrelation
    }
): GarminData {
    // Schlaf: Score und Stages
    const sleepScore = options?.poorSleep
        ? faker.number.int({ min: 20, max: 50 }) // Schlechter Schlaf
        : faker.number.int({ min: 60, max: 95 }); // Normaler bis guter Schlaf

    const totalSleepMinutes = options?.poorSleep
        ? faker.number.int({ min: 240, max: 360 }) // 4-6h
        : faker.number.int({ min: 360, max: 540 }); // 6-9h

    const sleepStages = calculateSleepStages(totalSleepMinutes);

    // Stress
    const stressAverage = options?.highStress
        ? faker.number.int({ min: 60, max: 90 })
        : faker.number.int({ min: 20, max: 60 });

    const stressMax = Math.min(100, stressAverage + faker.number.int({ min: 10, max: 30 }));

    // Heart Rate: Korreliert mit Stress
    const restingHR = options?.highStress
        ? faker.number.int({ min: 65, max: 80 })
        : faker.number.int({ min: 45, max: 70 });

    const maxHR = faker.number.int({ min: 150, max: 200 });

    // HRV: Korreliert mit Schlaf und Stress
    const hrv = calculateHRV(sleepScore, stressAverage);

    // Body Battery: Korreliert mit Schlaf und Stress
    const bodyBattery = calculateBodyBattery(sleepScore, stressAverage);

    // Steps: Niedriger bei schlechtem Schlaf/hohem Stress
    const stepsBase = options?.poorSleep || options?.highStress
        ? faker.number.int({ min: 2000, max: 6000 })
        : faker.number.int({ min: 5000, max: 15000 });

    // Hydration: 1-3 Liter
    const hydration = faker.number.int({ min: 1000, max: 3000 });

    // Respiration: 12-20 breaths/min
    const respirationRate = faker.number.int({ min: 12, max: 20 });

    // SpO2: 95-100%
    const spo2 = faker.number.int({ min: 95, max: 100 });

    // SyncedAt: Irgendwann am gleichen Tag oder am nächsten Morgen
    const syncTime = new Date(date);
    syncTime.setHours(faker.number.int({ min: 6, max: 23 }));
    syncTime.setMinutes(faker.number.int({ min: 0, max: 59 }));

    return {
        date: date.toISOString().split('T')[0], // YYYY-MM-DD
        sleepScore,
        sleepStages,
        stressLevel: {
            average: stressAverage,
            max: stressMax
        },
        restingHR,
        maxHR,
        hrv,
        bodyBattery,
        steps: stepsBase,
        hydration,
        respirationRate,
        spo2,
        syncedAt: syncTime.toISOString()
    };
}

/**
 * Generiert Garmin-Daten für einen Zeitraum
 * @param dateRange Start- und Enddatum
 * @returns Array von GarminData-Objekten
 */
export function generateGarminData(
    dateRange: { start: Date; end: Date }
): GarminData[] {
    const { start, end } = dateRange;

    // Validierung
    if (start >= end) {
        throw new Error('Start date must be before end date');
    }

    const data: GarminData[] = [];
    const currentDate = new Date(start);

    // Generiere Daten für jeden Tag
    while (currentDate <= end) {
        // Gelegentlich schlechte Tage simulieren (15% Chance)
        const poorSleep = faker.datatype.boolean(0.15);
        const highStress = faker.datatype.boolean(0.15);

        data.push(generateGarminDataForDate(new Date(currentDate), {
            poorSleep,
            highStress
        }));

        // Nächster Tag
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
}

/**
 * Generiert Garmin-Daten mit erhöhtem Risiko (für Korrelation mit Migräne)
 * Nützlich um Trigger-Tage vor Episoden zu simulieren
 */
export function generateHighRiskGarminData(date: Date): GarminData {
    return generateGarminDataForDate(date, {
        poorSleep: true,
        highStress: faker.datatype.boolean(0.7) // 70% Chance auf hohen Stress
    });
}

/**
 * Generiert Garmin-Daten für ein ganzes Jahr
 */
export function generateGarminDataForYear(year: number): GarminData[] {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);

    return generateGarminData({ start, end });
}

/**
 * Generiert fehlende Metriken (simuliert Geräte-Ausfall oder Sync-Probleme)
 * Gibt teilweise unvollständige Daten zurück
 */
export function generateIncompleteGarminData(date: Date): GarminData {
    const fullData = generateGarminDataForDate(date);

    // Entferne zufällig 1-3 Metriken
    const fieldsToRemove = faker.helpers.arrayElements(
        ['sleepScore', 'sleepStages', 'hrv', 'bodyBattery', 'hydration', 'spo2'],
        faker.number.int({ min: 1, max: 3 })
    );

    fieldsToRemove.forEach(field => {
        delete (fullData as any)[field];
    });

    return fullData;
}
