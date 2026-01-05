import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { changePin, resetPin } from '@/features/auth/pin-service';
import { db } from '@/lib/db';
import { seedAllData, clearAllData } from '@/lib/seed';
import type { Log } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Lock,
  Database,
  AlertCircle,
  Copy,
  Trash2,
  Watch,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { WeatherSettings } from '@/features/weather';
import { BackupManager } from '@/features/backup/BackupManager';

export default function Settings() {
  const navigate = useNavigate();
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  // Logs aus DB laden
  const logs = useLiveQuery<Log[]>(
    () => db.logs.orderBy('timestamp').reverse().limit(100).toArray(),
    []
  );

  const handleChangePin = async () => {
    if (newPin !== confirmPin) {
      toast.error('PINs stimmen nicht überein');
      return;
    }

    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      toast.error('PIN muss 6 Ziffern enthalten');
      return;
    }

    setLoading(true);
    try {
      await changePin(oldPin, newPin);
      toast.success('PIN erfolgreich geändert');
      setChangePinOpen(false);
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (error) {
      toast.error('Fehler beim Ändern der PIN. Alte PIN korrekt?');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    setLoading(true);
    try {
      await seedAllData();
      toast.success('Dummy-Daten erfolgreich geladen');
    } catch (error) {
      toast.error('Fehler beim Laden der Dummy-Daten');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    setLoading(true);
    try {
      await clearAllData();
      toast.success('Alle Daten gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen der Daten');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await db.logs.clear();
      toast.success('Logs gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen der Logs');
      console.error(error);
    }
  };

  const handleCopyLogs = async () => {
    if (!logs || logs.length === 0) {
      toast.error('Keine Logs vorhanden');
      return;
    }

    const logsText = logs
      .map(
        log =>
          `[${new Date(log.timestamp).toLocaleString('de-DE')}] ${log.level.toUpperCase()}: ${log.message}`
      )
      .join('\n');

    try {
      await navigator.clipboard.writeText(logsText);
      toast.success('Logs in Zwischenablage kopiert');
    } catch (error) {
      toast.error('Fehler beim Kopieren der Logs');
      console.error(error);
    }
  };

  const handleResetPin = async () => {
    try {
      await resetPin();
      toast.success('PIN zurückgesetzt. App wird neu geladen...');
      setTimeout(() => {
        navigate('/pin-setup');
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error('Fehler beim Zurücksetzen der PIN');
      console.error(error);
    }
  };

  const handleDebugGarminData = async () => {
    try {
      const allData = await db.garminData.toArray();

      // Count which fields have data
      const stats = {
        total: allData.length,
        sleepScore: 0,
        sleepStages: 0,
        stressLevel: 0,
        restingHR: 0,
        hrv: 0,
        bodyBattery: 0,
        steps: 0,
        hydration: 0,
        respirationRate: 0,
        spo2: 0,
      };

      allData.forEach(entry => {
        if (entry.sleepScore !== undefined && entry.sleepScore !== null)
          stats.sleepScore++;
        if (entry.sleepStages !== undefined && entry.sleepStages !== null)
          stats.sleepStages++;
        if (entry.stressLevel !== undefined && entry.stressLevel !== null)
          stats.stressLevel++;
        if (entry.restingHR !== undefined && entry.restingHR !== null)
          stats.restingHR++;
        if (entry.hrv !== undefined && entry.hrv !== null) stats.hrv++;
        if (entry.bodyBattery !== undefined && entry.bodyBattery !== null)
          stats.bodyBattery++;
        if (entry.steps !== undefined && entry.steps !== null) stats.steps++;
        if (entry.hydration !== undefined && entry.hydration !== null)
          stats.hydration++;
        if (
          entry.respirationRate !== undefined &&
          entry.respirationRate !== null
        )
          stats.respirationRate++;
        if (entry.spo2 !== undefined && entry.spo2 !== null) stats.spo2++;
      });

      setDebugData({
        stats,
        latestEntry: allData[0] || null,
        sampleEntries: allData.slice(0, 3),
      });

      toast.success('Debug-Daten geladen');
    } catch (error) {
      console.error('Debug error:', error);
      toast.error('Fehler beim Laden der Debug-Daten');
    }
  };

  const handleDebugSync = async () => {
    try {
      const { syncSingleDate } = await import('@/lib/garmin/sync-service');
      const today = format(new Date(), 'yyyy-MM-dd');

      toast.info('Starte Debug-Sync... Schaue in die Logs');

      // Sync today's data with verbose logging
      const result = await syncSingleDate(today);

      if (result) {
        toast.success(`Sync erfolgreich! Daten: ${JSON.stringify(result)}`);
      } else {
        toast.warning('Sync ergab keine Daten (result = null)');
      }
    } catch (error) {
      console.error('Debug sync error:', error);
      toast.error(`Fehler: ${error}`);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Einstellungen</h1>
        <p className="text-slate-600 mt-1">
          Verwalte deine App-Einstellungen und Daten
        </p>
      </div>

      <Tabs defaultValue="security" className="space-y-4">
        <TabsList className="tabs-scrollable w-full justify-start">
          <TabsTrigger value="security">Sicherheit</TabsTrigger>
          <TabsTrigger value="garmin">Garmin</TabsTrigger>
          <TabsTrigger value="weather">Wetter</TabsTrigger>
          <TabsTrigger value="data">Daten</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
        </TabsList>

        {/* Sicherheit Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                PIN-Verwaltung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog open={changePinOpen} onOpenChange={setChangePinOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">PIN ändern</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>PIN ändern</DialogTitle>
                    <DialogDescription>
                      Gib deine alte und neue PIN ein
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="old-pin">Alte PIN</Label>
                      <Input
                        id="old-pin"
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={oldPin}
                        onChange={e => setOldPin(e.target.value)}
                        placeholder="●●●●●●"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-pin">Neue PIN (6 Ziffern)</Label>
                      <Input
                        id="new-pin"
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={newPin}
                        onChange={e => setNewPin(e.target.value)}
                        placeholder="●●●●●●"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-pin">PIN bestätigen</Label>
                      <Input
                        id="confirm-pin"
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={confirmPin}
                        onChange={e => setConfirmPin(e.target.value)}
                        placeholder="●●●●●●"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setChangePinOpen(false)}
                    >
                      Abbrechen
                    </Button>
                    <Button onClick={handleChangePin} disabled={loading}>
                      {loading ? 'Ändere...' : 'PIN ändern'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    PIN zurücksetzen (Achtung!)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      PIN wirklich zurücksetzen?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Dies setzt die PIN komplett zurück. Du musst eine neue PIN
                      erstellen. Die App wird neu geladen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetPin}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Zurücksetzen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Garmin Tab - Link zur vollständigen Garmin-Seite */}
        <TabsContent value="garmin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Watch className="h-5 w-5" />
                Garmin Connect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Verbinde dich mit Garmin Connect, um deine Gesundheitsdaten zu
                synchronisieren und Korrelationen mit deinen Migräne-Episoden zu
                analysieren.
              </p>
              <Button onClick={() => navigate('/garmin')} className="w-full">
                <Watch className="h-4 w-4 mr-2" />
                Garmin Einstellungen öffnen
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wetter Tab (PAKET 12) */}
        <TabsContent value="weather" className="space-y-4">
          <WeatherSettings />
        </TabsContent>

        {/* Daten Tab */}
        <TabsContent value="data" className="space-y-4">
          {/* Datensicherung */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="h-5 w-5" />
                Datensicherung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BackupManager />
            </CardContent>
          </Card>

          {/* Daten-Verwaltung */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Daten-Verwaltung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Test-Daten</h3>
                <p className="text-sm text-slate-600">
                  Generiere Dummy-Episoden und Garmin-Daten für Tests
                </p>
                <Button
                  onClick={handleSeedData}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Lädt...' : 'Dummy-Daten laden'}
                </Button>
              </div>

              <div className="border-t pt-4 mt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Alle Daten löschen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Alle Daten wirklich löschen?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Dies löscht alle Episoden und Garmin-Daten dauerhaft.
                        Diese Aktion kann nicht rückgängig gemacht werden.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearData}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debug Tab */}
        <TabsContent value="debug" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Garmin Datenbank Debug
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Zeige Garmin-Daten und prüfe welche Felder befüllt sind
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleDebugGarminData} className="w-full">
                  Debug DB Daten
                </Button>
                <Button
                  onClick={handleDebugSync}
                  variant="secondary"
                  className="w-full"
                >
                  Test-Sync Heute
                </Button>
              </div>

              {debugData && (
                <div className="space-y-4 mt-4">
                  {/* Statistics */}
                  <div className="border rounded-lg p-4 bg-slate-50">
                    <h3 className="font-semibold mb-2">Statistiken</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Gesamt Einträge:</div>
                      <div className="font-mono font-bold">
                        {debugData.stats.total}
                      </div>
                      <div>Sleep Score:</div>
                      <div className="font-mono">
                        {debugData.stats.sleepScore} / {debugData.stats.total}
                      </div>
                      <div>Sleep Stages:</div>
                      <div className="font-mono">
                        {debugData.stats.sleepStages} / {debugData.stats.total}
                      </div>
                      <div>Stress Level:</div>
                      <div className="font-mono">
                        {debugData.stats.stressLevel} / {debugData.stats.total}
                      </div>
                      <div>Resting HR:</div>
                      <div className="font-mono">
                        {debugData.stats.restingHR} / {debugData.stats.total}
                      </div>
                      <div>HRV:</div>
                      <div className="font-mono">
                        {debugData.stats.hrv} / {debugData.stats.total}
                      </div>
                      <div>Body Battery:</div>
                      <div className="font-mono">
                        {debugData.stats.bodyBattery} / {debugData.stats.total}
                      </div>
                      <div>Steps:</div>
                      <div className="font-mono">
                        {debugData.stats.steps} / {debugData.stats.total}
                      </div>
                      <div>Hydration:</div>
                      <div className="font-mono">
                        {debugData.stats.hydration} / {debugData.stats.total}
                      </div>
                      <div>Respiration:</div>
                      <div className="font-mono">
                        {debugData.stats.respirationRate} /{' '}
                        {debugData.stats.total}
                      </div>
                      <div>SpO2:</div>
                      <div className="font-mono">
                        {debugData.stats.spo2} / {debugData.stats.total}
                      </div>
                    </div>
                  </div>

                  {/* Latest Entry */}
                  {debugData.latestEntry && (
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <h3 className="font-semibold mb-2">
                        Neuester Eintrag ({debugData.latestEntry.date})
                      </h3>
                      <div className="space-y-1 text-sm font-mono">
                        <div>
                          sleepScore:{' '}
                          {JSON.stringify(debugData.latestEntry.sleepScore)}
                        </div>
                        <div>
                          sleepStages:{' '}
                          {JSON.stringify(debugData.latestEntry.sleepStages)}
                        </div>
                        <div>
                          stressLevel:{' '}
                          {JSON.stringify(debugData.latestEntry.stressLevel)}
                        </div>
                        <div>
                          restingHR:{' '}
                          {JSON.stringify(debugData.latestEntry.restingHR)}
                        </div>
                        <div>
                          hrv: {JSON.stringify(debugData.latestEntry.hrv)}
                        </div>
                        <div>
                          bodyBattery:{' '}
                          {JSON.stringify(debugData.latestEntry.bodyBattery)}
                        </div>
                        <div>
                          steps: {JSON.stringify(debugData.latestEntry.steps)}
                        </div>
                        <div>
                          hydration:{' '}
                          {JSON.stringify(debugData.latestEntry.hydration)}
                        </div>
                        <div>
                          respirationRate:{' '}
                          {JSON.stringify(
                            debugData.latestEntry.respirationRate
                          )}
                        </div>
                        <div>
                          spo2: {JSON.stringify(debugData.latestEntry.spo2)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Clear Debug Button */}
                  <Button
                    variant="outline"
                    onClick={() => setDebugData(null)}
                    className="w-full"
                  >
                    Debug-Daten ausblenden
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Debug Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={handleCopyLogs}
                  variant="outline"
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Logs kopieren
                </Button>
                <Button
                  onClick={handleClearLogs}
                  variant="outline"
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Logs löschen
                </Button>
              </div>

              {!logs || logs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Keine Logs vorhanden
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-4 bg-slate-50 font-mono text-xs">
                  {logs.map(log => (
                    <div
                      key={log.id}
                      className={`flex gap-2 ${
                        log.level === 'error'
                          ? 'text-red-600'
                          : log.level === 'warn'
                            ? 'text-yellow-600'
                            : 'text-slate-700'
                      }`}
                    >
                      <span className="text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString('de-DE')}
                      </span>
                      <span className="font-semibold uppercase">
                        [{log.level}]
                      </span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs text-slate-500 pt-2 border-t">
                <p>App Version: 0.0.0 (MVP)</p>
                <p>Build: {new Date().toLocaleDateString('de-DE')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
