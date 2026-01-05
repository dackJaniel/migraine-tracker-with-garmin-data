/**
 * Symptom Service für benutzerdefinierte Symptome (PAKET 8)
 * 
 * Verwaltet:
 * - Speicherung aller jemals verwendeten Custom-Symptome
 * - Häufigkeitsanalyse für Autocomplete-Vorschläge
 */

import { db, getSetting, setSetting } from '@/lib/db';

const CUSTOM_SYMPTOMS_KEY = 'customSymptoms';

interface CustomSymptomStats {
    /** Alle jemals verwendeten Custom-Symptome mit Häufigkeit */
    symptoms: Record<string, number>;
    /** Letztes Update */
    updatedAt: string;
}

/**
 * Holt alle jemals verwendeten Custom-Symptome
 * @returns Array aller Custom-Symptome, sortiert nach Häufigkeit
 */
export async function getAllCustomSymptoms(): Promise<string[]> {
    const stats = await getSetting<CustomSymptomStats>(CUSTOM_SYMPTOMS_KEY, {
        symptoms: {},
        updatedAt: new Date().toISOString(),
    });

    // Sortiere nach Häufigkeit (absteigend)
    return Object.entries(stats.symptoms)
        .sort(([, a], [, b]) => b - a)
        .map(([symptom]) => symptom);
}

/**
 * Holt die Top N häufigsten Custom-Symptome
 * @param count Anzahl der Symptome (default: 5)
 * @returns Array der häufigsten Custom-Symptome
 */
export async function getCommonCustomSymptoms(count = 5): Promise<string[]> {
    const allSymptoms = await getAllCustomSymptoms();
    return allSymptoms.slice(0, count);
}

/**
 * Speichert neue Custom-Symptome und aktualisiert die Häufigkeit
 * @param symptoms Array von Custom-Symptomen
 */
export async function saveCustomSymptoms(symptoms: string[]): Promise<void> {
    if (symptoms.length === 0) return;

    const stats = await getSetting<CustomSymptomStats>(CUSTOM_SYMPTOMS_KEY, {
        symptoms: {},
        updatedAt: new Date().toISOString(),
    });

    // Aktualisiere Häufigkeit für jedes Symptom
    for (const symptom of symptoms) {
        const normalized = symptom.trim();
        if (normalized) {
            stats.symptoms[normalized] = (stats.symptoms[normalized] || 0) + 1;
        }
    }

    stats.updatedAt = new Date().toISOString();
    await setSetting(CUSTOM_SYMPTOMS_KEY, stats);
}

/**
 * Analysiert die Häufigkeit von Custom-Symptomen über alle Episoden
 * @returns Record mit Symptom -> Anzahl Mapping
 */
export async function analyzeCustomSymptomFrequency(): Promise<Record<string, number>> {
    const episodes = await db.episodes.toArray();
    const frequency: Record<string, number> = {};

    for (const episode of episodes) {
        if (episode.symptoms.custom) {
            for (const symptom of episode.symptoms.custom) {
                frequency[symptom] = (frequency[symptom] || 0) + 1;
            }
        }
    }

    return frequency;
}

/**
 * Synchronisiert die gespeicherten Custom-Symptome mit den tatsächlichen Daten
 * Nützlich nach Import oder DB-Reset
 */
export async function syncCustomSymptoms(): Promise<void> {
    const frequency = await analyzeCustomSymptomFrequency();

    await setSetting<CustomSymptomStats>(CUSTOM_SYMPTOMS_KEY, {
        symptoms: frequency,
        updatedAt: new Date().toISOString(),
    });
}

/**
 * Löscht ein Custom-Symptom aus den Vorschlägen
 * (Löscht es nicht aus bestehenden Episoden)
 * @param symptom Das zu löschende Symptom
 */
export async function removeCustomSymptom(symptom: string): Promise<void> {
    const stats = await getSetting<CustomSymptomStats>(CUSTOM_SYMPTOMS_KEY, {
        symptoms: {},
        updatedAt: new Date().toISOString(),
    });

    delete stats.symptoms[symptom];
    stats.updatedAt = new Date().toISOString();

    await setSetting(CUSTOM_SYMPTOMS_KEY, stats);
}

/**
 * Holt Symptom-Vorschläge basierend auf Eingabe
 * @param input Suchtext
 * @param maxResults Maximale Anzahl Ergebnisse
 * @returns Gefilterte und sortierte Vorschläge
 */
export async function getSymptomSuggestions(
    input: string,
    maxResults = 5
): Promise<string[]> {
    if (!input.trim()) {
        return getCommonCustomSymptoms(maxResults);
    }

    const allSymptoms = await getAllCustomSymptoms();
    const searchLower = input.toLowerCase();

    return allSymptoms
        .filter(symptom => symptom.toLowerCase().includes(searchLower))
        .slice(0, maxResults);
}
