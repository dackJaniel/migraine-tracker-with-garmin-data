/**
 * GarminDataDisplay Component - Display all Garmin metrics for a given date
 * Reusable component for showing Garmin health data
 */

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Moon,
  Brain,
  Heart,
  Activity,
  Zap,
  Footprints,
  Droplets,
  Wind,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { MetricCard } from './MetricCard';
import { SleepStages } from './SleepStages';

export interface GarminDataDisplayProps {
  date: string; // YYYY-MM-DD format
}

export function GarminDataDisplay({ date }: GarminDataDisplayProps) {
  // Query Garmin data for the specified date
  // useLiveQuery returns undefined while loading, then the actual value (or undefined if not found)
  const [isFirstRender, setIsFirstRender] = useState(true);
  const garminData = useLiveQuery(() => db.garminData.get(date), [date]);

  // Track if we've completed at least one query
  useEffect(() => {
    if (garminData !== undefined || !isFirstRender) {
      setIsFirstRender(false);
    }
    // Small delay to allow query to complete
    const timer = setTimeout(() => setIsFirstRender(false), 100);
    return () => clearTimeout(timer);
  }, [date, garminData, isFirstRender]);

  const isLoading = isFirstRender && garminData === undefined;

  // Loading State
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 text-slate-300 mx-auto animate-spin" />
            <p className="text-slate-600">Lade Daten...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No Data State
  if (!garminData) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-slate-300 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-slate-900">
                Keine Daten für diesen Tag
              </h3>
              <p className="text-slate-600 mt-1">
                Für dieses Datum sind keine Garmin-Daten vorhanden.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sleep Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Moon className="h-5 w-5 text-indigo-600" />
          Schlaf
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard
            icon={Moon}
            label="Sleep Score"
            value={garminData.sleepScore}
            unit="/100"
            color="text-indigo-600"
          />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Schlafphasen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SleepStages stages={garminData.sleepStages} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stress & Heart Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Herz & Stress
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={Brain}
            label="Stress Ø"
            value={garminData.stressLevel?.average}
            unit="/100"
            subValue={
              garminData.stressLevel?.max
                ? `Max: ${garminData.stressLevel.max}`
                : undefined
            }
            color="text-amber-600"
          />
          <MetricCard
            icon={Heart}
            label="Ruhe-HR"
            value={garminData.restingHR}
            unit="bpm"
            subValue={
              garminData.maxHR ? `Max: ${garminData.maxHR} bpm` : undefined
            }
            color="text-red-500"
          />
          <MetricCard
            icon={Activity}
            label="HRV"
            value={garminData.hrv}
            unit="ms"
            color="text-purple-600"
          />
          <MetricCard
            icon={Eye}
            label="SpO2"
            value={garminData.spo2}
            unit="%"
            color="text-blue-600"
          />
        </div>
      </div>

      {/* Activity Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Footprints className="h-5 w-5 text-green-600" />
          Aktivität & Energie
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={Footprints}
            label="Schritte"
            value={garminData.steps?.toLocaleString('de-DE')}
            color="text-green-600"
          />
          <MetricCard
            icon={Zap}
            label="Body Battery"
            value={garminData.bodyBattery?.current}
            unit="/100"
            subValue={
              garminData.bodyBattery
                ? `+${garminData.bodyBattery.charged} / -${garminData.bodyBattery.drained}`
                : undefined
            }
            color="text-yellow-600"
          />
          <MetricCard
            icon={Droplets}
            label="Hydration"
            value={
              garminData.hydration
                ? Math.round((garminData.hydration / 1000) * 10) / 10
                : null
            }
            unit="L"
            color="text-cyan-600"
          />
          <MetricCard
            icon={Wind}
            label="Atmung"
            value={garminData.respirationRate}
            unit="/min"
            color="text-teal-600"
          />
        </div>
      </div>
    </div>
  );
}
