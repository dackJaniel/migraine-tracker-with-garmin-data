/**
 * Garmin Settings Page - PAKET 4
 * Login, Sync-Status und Verbindungsverwaltung für Garmin Connect
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Watch,
  LogIn,
  LogOut,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Database,
  Activity,
  Heart,
  Moon,
  Zap,
  Footprints,
  Droplets,
  Wind,
  Brain,
  Eye,
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
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

// Verfügbare Metriken
const AVAILABLE_METRICS = [
  { icon: Moon, label: 'Schlaf', description: 'Score & Phasen' },
  { icon: Brain, label: 'Stress', description: 'Durchschnitt & Maximum' },
  { icon: Heart, label: 'Herzfrequenz', description: 'Ruhe-HR & Maximum' },
  { icon: Activity, label: 'HRV', description: 'Herzratenvariabilität' },
  { icon: Zap, label: 'Body Battery', description: 'Energie-Level' },
  { icon: Footprints, label: 'Schritte', description: 'Tägliche Aktivität' },
  { icon: Droplets, label: 'Hydration', description: 'Flüssigkeitsaufnahme' },
  { icon: Wind, label: 'Atmung', description: 'Atemfrequenz' },
  { icon: Eye, label: 'SpO2', description: 'Sauerstoffsättigung' },
];

export default function GarminSettings() {
  const navigate = useNavigate();
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

      // Check for MFA
      if (garminClient.isMFARequired()) {
        setMfaRequired(true);
        toast.info('Zwei-Faktor-Authentifizierung erforderlich');
        return;
      }

      // Success
      setIsConnected(true);
      setProfile(response.profile);
      setLoginDialogOpen(false);
      resetLoginForm();
      toast.success(`Verbunden als ${response.profile.displayName}`);

      // Refresh sync status
      const status = await garminClient.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Login fehlgeschlagen';
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
  const handleSync = async () => {
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

      // Refresh sync status
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

  // Reset Login Form
  const resetLoginForm = () => {
    setEmail('');
    setPassword('');
    setMfaCode('');
    setMfaRequired(false);
    setLoginError(null);
  };

  // Format last sync date
  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Nie';
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: de,
      });
    } catch {
      return 'Unbekannt';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Watch className="h-8 w-8" />
            Garmin Connect
          </h1>
          <p className="text-slate-600 mt-1">
            Synchronisiere deine Gesundheitsdaten von Garmin
          </p>
        </div>
        {isConnected && (
          <Button variant="outline" onClick={() => navigate('/garmin/data')}>
            <Eye className="h-4 w-4 mr-2" />
            Daten ansehen
          </Button>
        )}
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
            Verbindungsstatus
          </CardTitle>
          <CardDescription>
            {isConnected
              ? `Verbunden als ${profile?.displayName || profile?.email || 'Unbekannt'}`
              : 'Nicht mit Garmin Connect verbunden'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <>
              {/* Sync Status */}
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
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSync} disabled={isSyncing}>
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
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Letzte 7 Tage
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
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
              </div>
            </>
          ) : (
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
                    {isLoggingIn ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {mfaRequired ? 'Verifizieren' : 'Anmelden'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Available Metrics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Verfügbare Metriken
          </CardTitle>
          <CardDescription>
            Diese Gesundheitsdaten werden von Garmin synchronisiert
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AVAILABLE_METRICS.map(metric => (
              <div
                key={metric.label}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
              >
                <metric.icon className="h-5 w-5 text-slate-600" />
                <div>
                  <div className="font-medium">{metric.label}</div>
                  <div className="text-xs text-slate-500">
                    {metric.description}
                  </div>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
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
