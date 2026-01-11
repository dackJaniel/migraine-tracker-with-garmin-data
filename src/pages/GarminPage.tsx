/**
 * GarminPage - Garmin Health Data Viewer
 *
 * Pure data display page. Connection management moved to Settings > Garmin tab.
 * Shows health data when connected or demo data exists, otherwise directs to Settings.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Watch,
  Loader2,
  Settings,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { garminClient } from '@/lib/garmin/client';
import { syncSingleDate } from '@/lib/garmin/sync-service';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import {
  GarminDataDisplay,
  DateNavigation,
} from '@/features/garmin/components';

export default function GarminPage() {
  const navigate = useNavigate();

  // Session State (minimal - just for checking connection)
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Date Navigation State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isResyncing, setIsResyncing] = useState(false);

  // Get all dates with data for calendar highlighting
  const datesWithData =
    useLiveQuery(
      () => db.garminData.toCollection().primaryKeys() as Promise<string[]>,
      []
    ) ?? [];

  // Check if we have any data (connected or demo)
  const hasData = datesWithData && datesWithData.length > 0;

  // Load session state on mount
  const loadSessionState = useCallback(async () => {
    setIsLoading(true);
    try {
      const state = await garminClient.getSessionState();
      setIsConnected(state.isValid);
    } catch (error) {
      console.error('Failed to load session state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessionState();
  }, [loadSessionState]);

  // Resync single day (data-focused action, kept on this page)
  const handleResync = async () => {
    if (!isConnected) {
      toast.info('Verbinde dich zuerst mit Garmin in den Einstellungen');
      return;
    }

    setIsResyncing(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await syncSingleDate(dateStr);
      toast.success(
        `Daten für ${format(selectedDate, 'dd.MM.yyyy')} aktualisiert`
      );
    } catch (error) {
      toast.error('Synchronisierung fehlgeschlagen');
      console.error(error);
    } finally {
      setIsResyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Watch className="h-8 w-8" />
          Garmin Daten
        </h1>
        <p className="text-slate-600 mt-1">
          Deine Gesundheitsdaten von Garmin Connect
        </p>
      </div>

      {/* Not Connected AND No Data - Direct to Settings */}
      {!isConnected && !hasData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Keine Daten verfügbar
            </CardTitle>
            <CardDescription>
              Verbinde dich mit Garmin Connect in den Einstellungen, um deine
              Gesundheitsdaten zu synchronisieren.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/settings')} className="w-full sm:w-auto">
              <Settings className="h-4 w-4 mr-2" />
              Zu den Einstellungen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Date Navigation (visible when we have data) */}
      {hasData && (
        <Card>
          <CardContent className="pt-4">
            <DateNavigation
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onResync={handleResync}
              datesWithData={datesWithData}
              isResyncing={isResyncing}
            />
          </CardContent>
        </Card>
      )}

      {/* Garmin Data Display */}
      {hasData && (
        <GarminDataDisplay date={format(selectedDate, 'yyyy-MM-dd')} />
      )}

      {/* Info Card (always visible when we have data) */}
      {hasData && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-blue-900">
                  Hinweise zur Nutzung
                </h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>
                    Nicht alle Metriken sind auf allen Garmin-Geräten verfügbar
                  </li>
                  <li>HRV-Daten erfordern einen kompatiblen Garmin-Tracker</li>
                  <li>
                    Verbindung und Synchronisation verwaltest du unter{' '}
                    <button
                      onClick={() => navigate('/settings')}
                      className="underline hover:text-blue-900"
                    >
                      Einstellungen → Garmin
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
