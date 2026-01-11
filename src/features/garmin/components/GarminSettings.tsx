/**
 * GarminSettings Component
 *
 * Self-contained Garmin connection management for the Settings page.
 * Handles login, MFA, sync controls, and disconnect.
 * Following the WeatherSettings pattern.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Watch,
  LogIn,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Database,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { garminClient } from '@/lib/garmin/client';
import type { SyncProgress, SyncStatus } from '@/lib/garmin/sync-service';
import type { GarminProfile } from '@/lib/garmin/types';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { seedGarminData } from '@/lib/seed';

// Check if running in browser (dev mode)
const isWebDev = !Capacitor.isNativePlatform();

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

export function GarminSettings() {
  // Session State
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [profile, setProfile] = useState<GarminProfile | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // Login State
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // MFA State
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  // Demo Mode State
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  // Load session state on mount
  const loadSessionState = useCallback(async () => {
    setIsLoading(true);
    try {
      const state = await garminClient.getSessionState();
      setIsConnected(state.isValid);
      setProfile(state.profile);
      setSyncStatus(state.syncStatus);
    } catch (error) {
      console.error('Failed to load session state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessionState();
  }, [loadSessionState]);

  // Reset Login Form
  const resetLoginForm = () => {
    setEmail('');
    setPassword('');
    setMfaCode('');
    setMfaRequired(false);
    setLoginError(null);
  };

  // Login Handler
  const handleLogin = async () => {
    if (!email || !password) {
      setLoginError('Bitte E-Mail und Passwort eingeben');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const response = await garminClient.login(email, password);

      if (garminClient.isMFARequired()) {
        setMfaRequired(true);
        toast.info('Zwei-Faktor-Authentifizierung erforderlich');
        return;
      }

      setIsConnected(true);
      setProfile(response.profile);
      setLoginDialogOpen(false);
      resetLoginForm();
      toast.success(`Verbunden als ${response.profile.email || response.profile.displayName}`);

      const status = await garminClient.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Login fehlgeschlagen';

      if (message === 'MFA_SETUP_REQUIRED') {
        setLoginError(
          'Du musst zuerst 2FA in deinem Garmin-Konto aktivieren. Gehe zu connect.garmin.com und aktiviere "Zweistufige Überprüfung" unter Einstellungen > Sicherheit.'
        );
        toast.error('2FA-Einrichtung erforderlich');
        setIsLoggingIn(false);
        return;
      }

      if (message === 'MFA_REQUIRED') {
        setMfaRequired(true);
        setLoginError(null);
        toast.info('Zwei-Faktor-Authentifizierung erforderlich');
        setIsLoggingIn(false);
        return;
      }

      setLoginError(message);
      toast.error(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // MFA Handler
  const handleMFA = async () => {
    if (!mfaCode || mfaCode.length !== 6) {
      setLoginError('Bitte 6-stelligen Code eingeben');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const response = await garminClient.completeMFA(mfaCode);
      setIsConnected(true);
      setProfile(response.profile);
      setMfaRequired(false);
      setLoginDialogOpen(false);
      resetLoginForm();
      toast.success(`Verbunden als ${response.profile.email || response.profile.displayName}`);

      const status = await garminClient.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'MFA-Verifizierung fehlgeschlagen';
      setLoginError(message);
      toast.error(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await garminClient.logout();
      setIsConnected(false);
      setProfile(null);
      setSyncStatus(null);
      toast.success('Verbindung getrennt');
    } catch (error) {
      toast.error('Fehler beim Trennen der Verbindung');
      console.error(error);
    }
  };

  // Full Sync Handler
  const handleFullSync = async () => {
    if (!isConnected) {
      toast.error('Bitte zuerst mit Garmin verbinden');
      return;
    }

    setIsSyncing(true);
    setSyncProgress({
      total: 0,
      completed: 0,
      currentDate: '',
      errors: [],
      status: 'syncing',
    });

    try {
      const result = await garminClient.syncAllMissingData(progress => {
        setSyncProgress({ ...progress });
      });

      if (result.status === 'completed') {
        toast.success(
          `Synchronisierung abgeschlossen: ${result.completed} Tage`
        );
      } else if (result.errors.length > 0) {
        toast.warning(`Sync abgeschlossen mit ${result.errors.length} Fehlern`);
      }

      const status = await garminClient.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      toast.error('Synchronisierung fehlgeschlagen');
      console.error(error);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  // Quick Sync (last 7 days)
  const handleQuickSync = async () => {
    if (!isConnected) {
      toast.error('Bitte zuerst mit Garmin verbinden');
      return;
    }

    setIsSyncing(true);

    try {
      const result = await garminClient.syncRecentDays(7, progress => {
        setSyncProgress({ ...progress });
      });

      toast.success(`${result.completed} Tage synchronisiert`);

      const status = await garminClient.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      toast.error('Quick-Sync fehlgeschlagen');
      console.error(error);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  // Demo Mode Handler
  const handleLoadDemoData = async () => {
    setIsLoadingDemo(true);
    try {
      const count = await seedGarminData(30);
      toast.success(`${count} Tage Demo-Daten geladen!`);

      // Refresh sync status to show new data count
      const status = await garminClient.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load demo data:', error);
      toast.error('Fehler beim Laden der Demo-Daten');
    } finally {
      setIsLoadingDemo(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card className={isConnected ? 'bg-green-50 border-green-200' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
            {isConnected ? 'Verbunden' : 'Nicht verbunden'}
          </CardTitle>
          <CardDescription>
            {isConnected
              ? `Angemeldet als ${profile?.email || profile?.displayName || 'User'}`
              : 'Verbinde dich mit Garmin Connect um deine Gesundheitsdaten zu synchronisieren'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Browser Dev Mode Warning */}
          {isWebDev && !isConnected && (
            <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
              <strong>Entwicklungsmodus:</strong> Die Garmin-Anmeldung
              funktioniert nur in der Android-App. Du kannst Demo-Daten laden,
              um die Funktionen zu testen.
            </div>
          )}

          {!isConnected ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <LogIn className="h-4 w-4 mr-2" />
                    Mit Garmin Connect anmelden
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Garmin Connect Login</DialogTitle>
                    <DialogDescription>
                      Melde dich mit deinen Garmin Connect Zugangsdaten an
                    </DialogDescription>
                  </DialogHeader>

                  {!mfaRequired ? (
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="garmin-email">E-Mail</Label>
                        <Input
                          id="garmin-email"
                          type="email"
                          placeholder="deine@email.de"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          disabled={isLoggingIn}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="garmin-password">Passwort</Label>
                        <Input
                          id="garmin-password"
                          type="password"
                          placeholder="********"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          disabled={isLoggingIn}
                        />
                      </div>
                      {loginError && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                          {loginError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 py-4">
                      <div className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg">
                        Ein Verifizierungscode wurde an deine E-Mail oder
                        Authenticator-App gesendet.
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="garmin-mfa">6-stelliger Code</Label>
                        <Input
                          id="garmin-mfa"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="123456"
                          value={mfaCode}
                          onChange={e =>
                            setMfaCode(e.target.value.replace(/\D/g, ''))
                          }
                          disabled={isLoggingIn}
                        />
                      </div>
                      {loginError && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                          {loginError}
                        </div>
                      )}
                    </div>
                  )}

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setLoginDialogOpen(false);
                        resetLoginForm();
                      }}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={mfaRequired ? handleMFA : handleLogin}
                      disabled={isLoggingIn}
                    >
                      {isLoggingIn && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {mfaRequired ? 'Verifizieren' : 'Anmelden'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Demo Mode Button */}
              <Button
                variant="outline"
                onClick={handleLoadDemoData}
                disabled={isLoadingDemo}
                className="w-full sm:w-auto"
              >
                {isLoadingDemo ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                Demo-Daten laden
              </Button>
            </div>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
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
                  <AlertDialogAction onClick={handleLogout}>
                    Trennen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

      {/* Sync Controls (when connected) */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
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
                onClick={handleFullSync}
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
                onClick={handleQuickSync}
                disabled={isSyncing}
                className="w-full sm:w-auto"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Letzte 7 Tage
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Watch className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">
                Hinweise zur Nutzung
              </h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>
                  Deine Zugangsdaten werden sicher lokal gespeichert
                </li>
                <li>
                  Nicht alle Metriken sind auf allen Garmin-Geräten verfügbar
                </li>
                <li>
                  HRV-Daten erfordern einen kompatiblen Garmin-Tracker
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
