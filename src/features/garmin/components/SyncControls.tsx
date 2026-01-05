import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { RefreshCw, Loader2, Calendar, Database, LogOut } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { SyncStatus, SyncProgress } from '@/lib/garmin/sync-service';

export interface SyncControlsProps {
  syncStatus: SyncStatus | null;
  syncProgress: SyncProgress | null;
  isSyncing: boolean;
  onFullSync: () => Promise<void>;
  onQuickSync: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

/**
 * Format the last sync date in a human-readable way (German locale)
 */
function formatLastSync(dateStr: string | null): string {
  if (!dateStr) return 'Noch nie';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Unbekannt';
    return formatDistanceToNow(date, { addSuffix: true, locale: de });
  } catch {
    return 'Unbekannt';
  }
}

/**
 * SyncControls Component
 *
 * Shows sync status, statistics and action buttons for Garmin data synchronization.
 * Includes progress bar during sync and confirmation dialog for disconnection.
 */
export function SyncControls({
  syncStatus,
  syncProgress,
  isSyncing,
  onFullSync,
  onQuickSync,
  onDisconnect,
}: SyncControlsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Datensynchronisation
        </CardTitle>
        <CardDescription>
          Synchronisiere deine Garmin-Gesundheitsdaten mit der lokalen Datenbank
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Statistics */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-slate-600">Letzter Sync</div>
            <div className="text-lg font-semibold">
              {formatLastSync(syncStatus?.lastSyncDate || null)}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-slate-600">Tage in DB</div>
            <div className="text-lg font-semibold">
              {syncStatus?.totalDaysInDB ?? 0}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-slate-600">Tage hinterher</div>
            <div className="text-lg font-semibold">
              {syncStatus?.daysBehind ?? 0}
            </div>
          </div>
        </div>

        {/* Sync Progress */}
        {isSyncing && syncProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Synchronisiere...</span>
              <span>
                {syncProgress.completed}/{syncProgress.total}
              </span>
            </div>
            <Progress
              value={
                syncProgress.total > 0
                  ? (syncProgress.completed / syncProgress.total) * 100
                  : 0
              }
            />
            {syncProgress.currentDate && (
              <p className="text-xs text-slate-500">
                Aktuell: {syncProgress.currentDate}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={onFullSync}
            disabled={isSyncing}
            className="w-full sm:w-auto"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Vollständig synchronisieren
          </Button>
          <Button
            variant="outline"
            onClick={onQuickSync}
            disabled={isSyncing}
            className="w-full sm:w-auto"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Letzte 7 Tage
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <LogOut className="h-4 w-4 mr-2" />
                Verbindung trennen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Verbindung wirklich trennen?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Du wirst von Garmin Connect abgemeldet. Bereits
                  synchronisierte Daten bleiben erhalten.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={onDisconnect}>
                  Trennen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
