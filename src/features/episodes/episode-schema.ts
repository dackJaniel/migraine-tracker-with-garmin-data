import { z } from 'zod';

/**
 * Symptom-Kategorien für UI-Gruppierung
 */
export const SYMPTOM_CATEGORIES = {
    allgemein: {
        label: 'Allgemein',
        symptoms: ['nausea', 'vomiting', 'fatigue', 'vertigo'] as const,
    },
    sensorisch: {
        label: 'Sensorisch',
        symptoms: ['photophobia', 'phonophobia', 'aura', 'visualDisturbance'] as const,
    },
    neurologisch: {
        label: 'Neurologisch',
        symptoms: ['concentration', 'tinglingNumbness', 'speechDifficulty'] as const,
    },
    schmerz: {
        label: 'Schmerz',
        symptoms: ['neckPain'] as const,
    },
} as const;

/**
 * Mapping von Symptom-Keys zu deutschen Labels
 */
export const SYMPTOM_LABELS: Record<string, string> = {
    // Allgemein
    nausea: 'Übelkeit',
    vomiting: 'Erbrechen',
    fatigue: 'Müdigkeit',
    vertigo: 'Schwindel',
    // Sensorisch
    photophobia: 'Lichtempfindlichkeit',
    phonophobia: 'Lärmempfindlichkeit',
    aura: 'Aura',
    visualDisturbance: 'Sehstörungen',
    // Neurologisch
    concentration: 'Konzentrationsprobleme',
    tinglingNumbness: 'Kribbeln/Taubheit',
    speechDifficulty: 'Sprachschwierigkeiten',
    // Schmerz
    neckPain: 'Nackenschmerzen',
};

/**
 * Zod Schema für erweiterte Symptome (PAKET 8)
 */
export const symptomsSchema = z.object({
    // Allgemein
    nausea: z.boolean(),
    vomiting: z.boolean(),
    fatigue: z.boolean(),
    vertigo: z.boolean(),
    // Sensorisch
    photophobia: z.boolean(),
    phonophobia: z.boolean(),
    aura: z.boolean(),
    visualDisturbance: z.boolean(),
    // Neurologisch
    concentration: z.boolean(),
    tinglingNumbness: z.boolean(),
    speechDifficulty: z.boolean(),
    // Schmerz
    neckPain: z.boolean(),
    // Benutzerdefiniert
    custom: z.array(z.string()),
});

/**
 * Zod Schema für Episode Form Validierung
 */
export const episodeSchema = z.object({
    startTime: z.date({
        message: 'Startzeit ist erforderlich',
    }),
    endTime: z.date().optional().nullable(),
    intensity: z
        .number()
        .min(1, 'Intensität muss mindestens 1 sein')
        .max(10, 'Intensität darf maximal 10 sein'),
    triggers: z.array(z.string()),
    medicines: z.array(z.string()),
    symptoms: symptomsSchema,
    notes: z.string().optional(),
    isOngoing: z.boolean(),
    // Night-Onset Tracking (PAKET 10)
    nightOnset: z.boolean().optional(),
    wokeUpWithMigraine: z.boolean().optional(),
    sleepQualityBefore: z.number().min(1).max(5).optional().nullable(),
});

export type SymptomsFormData = z.infer<typeof symptomsSchema>;
export type EpisodeFormData = z.infer<typeof episodeSchema>;

/**
 * Prüft ob eine Zeit in der Nacht liegt (22:00-06:00)
 */
export function isNightTime(date: Date): boolean {
    const hours = date.getHours();
    return hours >= 22 || hours < 6;
}

/**
 * Schlafqualität Labels
 */
export const SLEEP_QUALITY_LABELS: Record<number, string> = {
    1: 'Sehr schlecht',
    2: 'Schlecht',
    3: 'Mittelmäßig',
    4: 'Gut',
    5: 'Sehr gut',
};

/**
 * Default-Werte für leeres Symptom-Objekt
 */
export const DEFAULT_SYMPTOMS: SymptomsFormData = {
    nausea: false,
    vomiting: false,
    fatigue: false,
    vertigo: false,
    photophobia: false,
    phonophobia: false,
    aura: false,
    visualDisturbance: false,
    concentration: false,
    tinglingNumbness: false,
    speechDifficulty: false,
    neckPain: false,
    custom: [],
};
