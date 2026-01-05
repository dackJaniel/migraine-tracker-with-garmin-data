/**
 * Garmin Data View Page - PAKET 4
 * Ansicht der synchronisierten Garmin-Gesundheitsdaten
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, subDays, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  Moon,
  Brain,
  Heart,
  Activity,
  Zap,
  Footprints,
  Droplets,
  Wind,
  Eye,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { db, type GarminData } from '@/lib/db';
import { garminClient } from '@/lib/garmin/client';
import { syncSingleDate } from '@/lib/garmin/sync-service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Metric Card Component
interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  subValue?: string;
  color?: string;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  subValue,
  color = 'text-slate-600',
}: MetricCardProps) {
  const hasValue = value !== null && value !== undefined && value !== '';

  return (
    <Card className={cn(!hasValue && 'opacity-60')}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg bg-slate-100', color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-600">{label}</p>
            {hasValue ? (
              <>
                <p className="text-2xl font-bold">
                  {value}
                  {unit && (
                    <span className="text-sm font-normal ml-1">{unit}</span>
                  )}
                </p>
                {subValue && (
                  <p className="text-xs text-slate-500 mt-0.5">{subValue}</p>
                )}
              </>
            ) : (
              <p className="text-lg text-slate-400">Keine Daten</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Sleep Stages Component
interface SleepStagesProps {
  stages?: {
    deep: number;
    light: number;
    rem: number;
    awake: number;
  };
}

function SleepStages({ stages }: SleepStagesProps) {
  if (!stages) return null;

  const total = stages.deep + stages.light + stages.rem + stages.awake;
  if (total === 0) return null;

  const formatMinutes = (min: number) => {
    const hours = Math.floor(min / 60);
    const mins = min % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const segments = [
    { label: 'Tiefschlaf', value: stages.deep, color: 'bg-indigo-600' },
    { label: 'Leichtschlaf', value: stages.light, color: 'bg-blue-400' },
    { label: 'REM', value: stages.rem, color: 'bg-purple-500' },
    { label: 'Wach', value: stages.awake, color: 'bg-amber-400' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex h-4 rounded-full overflow-hidden">
        {segments.map(seg => (
          <div
            key={seg.label}
            className={cn(seg.color)}
            style={{ width: `${(seg.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <div className={cn('w-3 h-3 rounded', seg.color)} />
            <span className="text-slate-600">{seg.label}:</span>
            <span className="font-medium">{formatMinutes(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GarminDataView() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isResyncing, setIsResyncing] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Format date for query
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Query Garmin data for selected date
  const garminData = useLiveQuery<GarminData | undefined>(
    () => db.garminData.get(dateStr),
    [dateStr]
  );

  // Get all dates with data for calendar highlighting
  const datesWithData = useLiveQuery<string[]>(
    () => db.garminData.toCollection().primaryKeys() as Promise<string[]>,
    []
  );

  // Navigation handlers
  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    const tomorrow = subDays(new Date(), -1);
    if (selectedDate < tomorrow) {
      setSelectedDate(prev => subDays(prev, -1));
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Resync single day
  const handleResync = async () => {
    const isValid = await garminClient.isSessionValid();
    if (!isValid) {
      toast.error('Bitte zuerst mit Garmin verbinden');
      navigate('/garmin');
      return;
    }

    setIsResyncing(true);
    try {
      await syncSingleDate(dateStr);
      toast.success(
        `Daten für ${format(selectedDate, 'dd.MM.yyyy', { locale: de })} aktualisiert`
      );
    } catch (error) {
      toast.error('Synchronisierung fehlgeschlagen');
      console.error(error);
    } finally {
      setIsResyncing(false);
    }
  };

  // Check if date has data
  const hasDataForDate = (date: Date) => {
    const d = format(date, 'yyyy-MM-dd');
    return datesWithData?.includes(d) ?? false;
  };

  const isToday =
    format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/garmin')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Garmin Daten</h1>
            <p className="text-slate-600 mt-1">
              Detailansicht deiner Gesundheitsdaten
            </p>
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[200px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(selectedDate, 'EEEE, dd. MMMM yyyy', {
                      locale: de,
                    })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={date => {
                      if (date) {
                        setSelectedDate(date);
                        setCalendarOpen(false);
                      }
                    }}
                    disabled={date => date > new Date()}
                    modifiers={{
                      hasData: (date: Date) => hasDataForDate(date),
                    }}
                    modifiersClassNames={{
                      hasData: 'bg-green-100 text-green-900 font-semibold',
                    }}
                    locale={de}
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="icon"
                onClick={goToNextDay}
                disabled={isToday}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {!isToday && (
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Heute
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleResync}
                disabled={isResyncing}
              >
                {isResyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Neu laden
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Display */}
      {garminData ? (
        <div className="space-y-6">
          {/* Synced Info */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Database className="h-4 w-4" />
            <span>
              Synchronisiert:{' '}
              {garminData.syncedAt
                ? format(
                    parseISO(garminData.syncedAt),
                    "dd.MM.yyyy 'um' HH:mm",
                    {
                      locale: de,
                    }
                  )
                : 'Unbekannt'}
            </span>
          </div>

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
      ) : (
        /* No Data State */
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-slate-900">
                  Keine Daten für diesen Tag
                </h3>
                <p className="text-slate-600 mt-1">
                  Für den{' '}
                  {format(selectedDate, 'dd. MMMM yyyy', { locale: de })} sind
                  keine Garmin-Daten vorhanden.
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => navigate('/garmin')}>
                  Zu Garmin Einstellungen
                </Button>
                <Button onClick={handleResync} disabled={isResyncing}>
                  {isResyncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Jetzt synchronisieren
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
