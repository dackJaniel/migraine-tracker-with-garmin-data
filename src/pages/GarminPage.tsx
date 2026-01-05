/**
 * GarminPage - Unified Garmin Experience
 *
 * Shows Garmin health data directly after login with sync controls below.
 * Replaces the previous GarminSettings.tsx page.
 */

import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Watch,
  LogIn,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertCircle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { garminClient } from '@/lib/garmin/client';
import { syncSingleDate } from '@/lib/garmin/sync-service';
import type { SyncProgress, SyncStatus } from '@/lib/garmin/sync-service';
import type { GarminProfile } from '@/lib/garmin/types';
import { toast } from 'sonner';
import { seedGarminData } from '@/lib/seed';
import { Capacitor } from '@capacitor/core';
import { db } from '@/lib/db';
import {
  GarminDataDisplay,
  DateNavigation,
  SyncControls,
} from '@/features/garmin/components';

// Prüfe ob wir im Browser (Dev) sind
const isWebDev = !Capacitor.isNativePlatform();

export default function GarminPage() {
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

  // Date Navigation State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isResyncing, setIsResyncing] = useState(false);

  // Get all dates with data for calendar highlighting
  const datesWithData =
    useLiveQuery(
      () => db.garminData.toCollection().primaryKeys() as Promise<string[]>,
      []
    ) ?? [];

  // Lade Session-Status beim Mount
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
      toast.success(`Verbunden als ${response.profile.displayName}`);

      const status = await garminClient.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Login fehlgeschlagen';

      if (message === 'MFA_SETUP_REQUIRED') {
        setLoginError(
          'Du musst zuerst 2FA in deinem Garmin-Konto aktivieren. Gehe zu connect.garmin.com und aktiviere "Zweistufige Überprüfung" unter Einstellungen → Sicherheit.'
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
      toast.success(`Verbunden als ${response.profile.displayName}`);

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

  // Sync Handler
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

  // Quick Sync (letzte 7 Tage)
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

  // Resync single day
  const handleResync = async () => {
    if (!isConnected) {
      toast.info('Lade Demo-Daten...');
      // Just reload from DB if not connected
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

  // Reset Login Form
  const resetLoginForm = () => {
    setEmail('');
    setPassword('');
    setMfaCode('');
    setMfaRequired(false);
    setLoginError(null);
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
          Garmin Connect
        </h1>
        <p className="text-slate-600 mt-1">
          Synchronisiere deine Gesundheitsdaten von Garmin
        </p>
      </div>

      {/* Connection Status Bar (when connected) */}
      {isConnected && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-green-800">
                  Verbunden als{' '}
                  <strong>
                    {profile?.displayName || profile?.email || 'User'}
                  </strong>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-green-700 hover:text-green-900 hover:bg-green-100"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Trennen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not Connected - Login Section */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Nicht verbunden
            </CardTitle>
            <CardDescription>
              Verbinde dich mit Garmin Connect um deine Gesundheitsdaten zu
              synchronisieren
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Browser Dev Mode Warning */}
            {isWebDev && (
              <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <strong>⚠️ Entwicklungsmodus:</strong> Die Garmin-Anmeldung
                funktioniert nur in der Android-App. Du kannst Demo-Daten laden,
                um die Funktionen zu testen.
              </div>
            )}

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
                        <Label htmlFor="email">E-Mail</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="deine@email.de"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          disabled={isLoggingIn}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Passwort</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
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
                        <Label htmlFor="mfa">6-stelliger Code</Label>
                        <Input
                          id="mfa"
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
          </CardContent>
        </Card>
      )}

      {/* Date Navigation (always visible when we have data or are connected) */}
      {(isConnected || (datesWithData && datesWithData.length > 0)) && (
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
      {(isConnected || (datesWithData && datesWithData.length > 0)) && (
        <GarminDataDisplay date={format(selectedDate, 'yyyy-MM-dd')} />
      )}

      {/* Sync Controls (when connected) */}
      {isConnected && (
        <SyncControls
          syncStatus={syncStatus}
          syncProgress={syncProgress}
          isSyncing={isSyncing}
          onFullSync={handleFullSync}
          onQuickSync={handleQuickSync}
          onDisconnect={handleLogout}
        />
      )}

      {/* Info Card */}
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
                  Die Synchronisierung erfolgt automatisch alle 24 Stunden
                </li>
                <li>
                  Nicht alle Metriken sind auf allen Garmin-Geräten verfügbar
                </li>
                <li>HRV-Daten erfordern einen kompatiblen Garmin-Tracker</li>
                <li>Deine Zugangsdaten werden sicher lokal gespeichert</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
