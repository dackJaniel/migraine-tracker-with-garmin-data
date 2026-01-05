import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';

export default function Settings() {
  const navigate = useNavigate();
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Einstellungen</h1>
        <p className="text-slate-600 mt-1">
          Verwalte deine App-Einstellungen und Daten
        </p>
      </div>

      <Tabs defaultValue="security" className="space-y-4">
        <TabsList>
          <TabsTrigger value="security">Sicherheit</TabsTrigger>
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

        {/* Daten Tab */}
        <TabsContent value="data" className="space-y-4">
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

              <div className="space-y-2">
                <h3 className="font-semibold">Datensicherung</h3>
                <p className="text-sm text-slate-600">
                  Backups findest du unter Analyse & Statistiken
                </p>
                <Button
                  onClick={() => navigate('/analytics?tab=export')}
                  className="w-full"
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Zur Datensicherung
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
