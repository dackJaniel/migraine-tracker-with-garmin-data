import { db } from '@/lib/db';
import { differenceInDays, format } from 'date-fns';

export interface CorrelationResult {
  title: string;
  description: string;
  percentage: number;
  sampleSize: number;
  isSignificant: boolean;
  pValue?: number;
  type: 'sleep' | 'stress' | 'hrv' | 'trigger' | 'bodyBattery';
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
    const episodeDate = format(episode.startTime, 'yyyy-MM-dd');
    
    // Schlaf-Daten vom Vortag holen
    const previousDay = format(
      new Date(episode.startTime.getTime() - 24 * 60 * 60 * 1000),
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
        (ep) => format(ep.startTime, 'yyyy-MM-dd') === nextDay
      );
      if (hasEpisode) episodesAfterGoodSleep++;
    }
  }

  const lowSleepRate = daysWithLowSleep > 0 ? (episodesAfterLowSleep / daysWithLowSleep) * 100 : 0;
  const goodSleepRate = daysWithGoodSleep > 0 ? (episodesAfterGoodSleep / daysWithGoodSleep) * 100 : 0;

  const increasePercentage = goodSleepRate > 0 
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
    const episodeDate = format(episode.startTime, 'yyyy-MM-dd');
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
      new Date(episode.startTime.getTime() - 24 * 60 * 60 * 1000),
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
    const episodeDate = format(episode.startTime, 'yyyy-MM-dd');
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
    .filter(([_, stats]) => stats.total >= 3) // Mind. 3 Vorkommen
    .map(([trigger, stats]) => ({
      title: `Trigger: ${trigger}`,
      description: `In ${stats.intense} von ${stats.total} Fällen (${Math.round((stats.intense / stats.total) * 100)}%) führte "${trigger}" zu einer starken Migräne (Intensität ≥7)`,
      percentage: Math.round((stats.intense / stats.total) * 100),
      sampleSize: stats.total,
      isSignificant: stats.total >= 5 && (stats.intense / stats.total) > 0.5,
      type: 'trigger' as const,
    }))
    .sort((a, b) => b.percentage - a.percentage);
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
  // Für präzise Werte würde man eine Chi-Square Verteilungstabelle nutzen
  if (chiSquare > 3.841) return 0.05; // Signifikant bei 95%
  if (chiSquare > 6.635) return 0.01; // Hoch signifikant
  return 0.1; // Nicht signifikant
}
