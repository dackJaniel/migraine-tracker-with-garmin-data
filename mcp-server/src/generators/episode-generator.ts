import { faker } from '@faker-js/faker';

export interface Episode {
    startTime: string; // ISO 8601 Date String
    endTime?: string; // ISO 8601 Date String
    intensity: number; // 1-10
    triggers: string[]; // ["stress", "weather", "caffeine"]
    medicines: string[]; // ["ibuprofen 400mg", "sumatriptan"]
    symptoms: {
        nausea: boolean;
        photophobia: boolean;
        phonophobia: boolean;
        aura: boolean;
    };
    notes?: string;
    createdAt: string; // ISO 8601 Date String
    updatedAt: string; // ISO 8601 Date String
}

const AVAILABLE_TRIGGERS = [
    'stress',
    'weather',
    'caffeine',
    'sleep',
    'food',
    'alcohol',
    'noise',
    'bright_lights',
    'exercise',
    'dehydration',
    'hormonal',
    'skipped_meal'
];

const AVAILABLE_MEDICINES = [
    'ibuprofen 400mg',
    'ibuprofen 600mg',
    'sumatriptan 50mg',
    'sumatriptan 100mg',
    'aspirin 500mg',
    'paracetamol 500mg',
    'naproxen 500mg',
    'rizatriptan 10mg',
    'metoclopramid 10mg'
];

const SYMPTOM_NOTES = [
    'Starke Kopfschmerzen auf der rechten Seite',
    'Pochende Schmerzen, konnte nicht arbeiten',
    'Übelkeit war besonders schlimm',
    'Aura mit visuellen Störungen ca. 20 Minuten vor Beginn',
    'Musste mich übergeben',
    'Konnte kein Licht ertragen',
    'Geräusche waren unerträglich',
    'Attacke begann nach dem Aufwachen',
    'Linke Kopfseite betroffen',
    'Medikament wirkte nach ca. 45 Minuten',
    'Keine vollständige Linderung trotz Medikation',
    'Musste mich hinlegen'
];

/**
 * Generiert eine einzelne realistische Migräne-Episode
 */
function generateSingleEpisode(startDate: Date): Episode {
    const intensity = faker.number.int({ min: 1, max: 10 });

    // Dauer: 2-72 Stunden (häufiger 4-24h)
    const durationHours = faker.helpers.weightedArrayElement([
        { weight: 2, value: faker.number.int({ min: 2, max: 4 }) },
        { weight: 5, value: faker.number.int({ min: 4, max: 12 }) },
        { weight: 4, value: faker.number.int({ min: 12, max: 24 }) },
        { weight: 2, value: faker.number.int({ min: 24, max: 48 }) },
        { weight: 1, value: faker.number.int({ min: 48, max: 72 }) }
    ]);

    const start = new Date(startDate);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    // Trigger: 1-4 verschiedene Trigger (gewichtet)
    const numTriggers = faker.helpers.weightedArrayElement([
        { weight: 3, value: 1 },
        { weight: 4, value: 2 },
        { weight: 2, value: 3 },
        { weight: 1, value: 4 }
    ]);
    const triggers = faker.helpers.arrayElements(AVAILABLE_TRIGGERS, numTriggers);

    // Medikamente: Höhere Intensität → mehr/stärkere Medikamente
    let medicines: string[] = [];
    if (intensity >= 7) {
        // Schwere Attacke: Triptan + Schmerzmittel
        medicines = faker.helpers.arrayElements(
            AVAILABLE_MEDICINES.filter(m => m.includes('sumatriptan') || m.includes('rizatriptan')),
            1
        );
        if (faker.datatype.boolean()) {
            medicines.push(faker.helpers.arrayElement(['metoclopramid 10mg', 'ibuprofen 400mg']));
        }
    } else if (intensity >= 4) {
        // Mittlere Attacke: Standard-Schmerzmittel
        medicines = faker.helpers.arrayElements(
            AVAILABLE_MEDICINES.filter(m => !m.includes('sumatriptan') && !m.includes('rizatriptan')),
            faker.number.int({ min: 1, max: 2 })
        );
    } else {
        // Leichte Attacke: Oft nur ein Medikament oder keins
        if (faker.datatype.boolean(0.7)) {
            medicines = [faker.helpers.arrayElement(['ibuprofen 400mg', 'aspirin 500mg', 'paracetamol 500mg'])];
        }
    }

    // Symptome: Höhere Intensität → mehr Symptome
    const symptomProbability = intensity / 10;
    const symptoms = {
        nausea: faker.datatype.boolean(Math.min(0.9, symptomProbability + 0.2)),
        photophobia: faker.datatype.boolean(Math.min(0.95, symptomProbability + 0.3)),
        phonophobia: faker.datatype.boolean(Math.min(0.9, symptomProbability + 0.2)),
        aura: faker.datatype.boolean(Math.min(0.3, symptomProbability * 0.4)) // Aura ist seltener
    };

    // Notes: Höhere Intensität → häufiger Notizen
    const notes = faker.datatype.boolean(symptomProbability * 0.6)
        ? faker.helpers.arrayElement(SYMPTOM_NOTES)
        : undefined;

    const createdAt = new Date(start.getTime() + faker.number.int({ min: 0, max: 2 * 60 * 60 * 1000 }));

    return {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        intensity,
        triggers,
        medicines,
        symptoms,
        notes,
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString()
    };
}

/**
 * Generiert mehrere realistische Migräne-Episoden innerhalb eines Zeitraums
 * @param count Anzahl der zu generierenden Episoden
 * @param dateRange Start- und Enddatum
 * @returns Array von Episode-Objekten
 */
export function generateEpisodes(
    count: number,
    dateRange: { start: Date; end: Date }
): Episode[] {
    const episodes: Episode[] = [];
    const { start, end } = dateRange;

    // Validierung
    if (count <= 0) {
        throw new Error('Count must be greater than 0');
    }
    if (start >= end) {
        throw new Error('Start date must be before end date');
    }

    // Generiere count Episoden mit zufälligen Zeitpunkten im Bereich
    const timeRange = end.getTime() - start.getTime();

    for (let i = 0; i < count; i++) {
        const randomOffset = faker.number.int({ min: 0, max: timeRange });
        const episodeStart = new Date(start.getTime() + randomOffset);

        episodes.push(generateSingleEpisode(episodeStart));
    }

    // Sortiere chronologisch
    return episodes.sort((a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
}

/**
 * Generiert eine aktive (laufende) Episode ohne Endzeit
 */
export function generateActiveEpisode(startDate?: Date): Episode {
    const start = startDate || faker.date.recent({ days: 1 });
    const episode = generateSingleEpisode(start);

    // Entferne endTime für aktive Episode
    delete episode.endTime;

    return episode;
}

/**
 * Generiert Episoden mit realistischer Häufigkeit (8-12 pro Jahr)
 * @param year Jahr für das Episoden generiert werden sollen
 * @returns Array von Episode-Objekten
 */
export function generateEpisodesForYear(year: number): Episode[] {
    const count = faker.number.int({ min: 8, max: 12 });
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    return generateEpisodes(count, { start, end });
}
