import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Circle,
  FileArchive,
  Shield,
  Info,
} from 'lucide-react';
import {
  exportData,
  importData,
  validateBackup,
  validatePasswordStrength,
  type BackupData,
} from './backup-service';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

export function BackupManager() {
  const [exportPassword, setExportPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [backupPreview, setBackupPreview] = useState<BackupData | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [showReplaceWarning, setShowReplaceWarning] = useState(false);

  // Aktuelle Datenbank-Statistiken für Export-Vorschau
  const episodeCount = useLiveQuery(() => db.episodes.count(), []) ?? 0;
  const garminCount = useLiveQuery(() => db.garminData.count(), []) ?? 0;

  const passwordStrength = validatePasswordStrength(exportPassword);

  const handleExport = async () => {
    if (!passwordStrength.isValid) {
      toast.error('Passwort zu schwach', {
        description: passwordStrength.message,
      });
      return;
    }

    setIsExporting(true);
    try {
      await exportData(exportPassword);
      toast.success('Backup erstellt', {
        description: 'Deine Daten wurden erfolgreich exportiert',
      });
      setExportPassword('');
    } catch (error) {
      console.error('Export Fehler:', error);
      toast.error('Backup fehlgeschlagen', {
        description:
          error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
  };

  const handleValidateBackup = async () => {
    if (!importFile || !importPassword) {
      toast.error('Fehlende Eingaben', {
        description: 'Bitte Datei und Passwort eingeben',
      });
      return;
    }

    setIsImporting(true);
    try {
      const fileContent = await importFile.text();
      const backupData = await validateBackup(fileContent, importPassword);
      setBackupPreview(backupData);
      setShowImportDialog(true);
    } catch (error) {
      console.error('Validierung Fehler:', error);
      toast.error('Backup ungültig', {
        description:
          error instanceof Error
            ? error.message
            : 'Falsches Passwort oder beschädigte Datei',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile || !importPassword) return;

    if (importMode === 'replace') {
      setShowReplaceWarning(true);
      return;
    }

    await executeImport();
  };

  const executeImport = async () => {
    if (!importFile || !importPassword) return;

    setIsImporting(true);
    setShowImportDialog(false);
    setShowReplaceWarning(false);

    try {
      const fileContent = await importFile.text();
      const stats = await importData(fileContent, importPassword, importMode);

      toast.success('Import erfolgreich', {
        description: `${stats.episodes} Episoden, ${stats.garminData} Garmin-Einträge importiert`,
      });

      // Reset
      setImportFile(null);
      setImportPassword('');
      setBackupPreview(null);

      // Seite neu laden um Daten anzuzeigen
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Import Fehler:', error);
      toast.error('Import fehlgeschlagen', {
        description:
          error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Schritt-für-Schritt Anleitung */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-800 mb-1">
                So funktioniert die Datensicherung:
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Wähle ein sicheres Passwort (mindestens 8 Zeichen)</li>
                <li>
                  Das Backup wird als verschlüsselte .enc Datei gespeichert
                </li>
                <li>
                  Bewahre das Passwort sicher auf - ohne es kannst du das Backup
                  nicht wiederherstellen
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Download className="h-5 w-5" />
              Backup erstellen
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Exportiere alle Daten als verschlüsselte Backup-Datei
            </p>
          </div>
        </div>

        {/* Vorschau was exportiert wird */}
        <Card className="bg-green-50/50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <FileArchive className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Was wird exportiert:
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm">{episodeCount} Episoden</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm">{garminCount} Garmin-Einträge</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label
              htmlFor="export-password"
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Backup-Passwort
            </Label>
            <Input
              id="export-password"
              type="password"
              placeholder="Mindestens 8 Zeichen"
              value={exportPassword}
              onChange={e => setExportPassword(e.target.value)}
            />
            {exportPassword && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Progress
                    value={
                      passwordStrength.strength === 'strong'
                        ? 100
                        : passwordStrength.strength === 'medium'
                          ? 60
                          : 30
                    }
                    className="h-1"
                  />
                  <Badge
                    variant={
                      passwordStrength.strength === 'strong'
                        ? 'default'
                        : passwordStrength.strength === 'medium'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {passwordStrength.strength === 'strong'
                      ? 'Stark'
                      : passwordStrength.strength === 'medium'
                        ? 'Mittel'
                        : 'Schwach'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {passwordStrength.message}
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={handleExport}
            disabled={
              isExporting ||
              !passwordStrength.isValid ||
              (episodeCount === 0 && garminCount === 0)
            }
            className="w-full"
          >
            {isExporting ? 'Erstelle Backup...' : 'Backup jetzt erstellen'}
          </Button>
          {episodeCount === 0 && garminCount === 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Keine Daten zum Exportieren vorhanden
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">oder</span>
        </div>
      </div>

      {/* Import Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Backup wiederherstellen
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Importiere Daten aus einer verschlüsselten Backup-Datei
          </p>
        </div>

        {/* Import Schritte Anzeige */}
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`flex items-center gap-1 ${importFile ? 'text-green-600' : 'text-muted-foreground'}`}
          >
            {importFile ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
            <span>1. Datei</span>
          </div>
          <span className="text-muted-foreground">→</span>
          <div
            className={`flex items-center gap-1 ${importPassword ? 'text-green-600' : 'text-muted-foreground'}`}
          >
            {importPassword ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
            <span>2. Passwort</span>
          </div>
          <span className="text-muted-foreground">→</span>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Circle className="h-4 w-4" />
            <span>3. Validieren</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="import-file">Backup-Datei</Label>
            <Input
              id="import-file"
              type="file"
              accept=".enc"
              onChange={handleFileSelect}
            />
            {importFile && (
              <p className="text-xs text-muted-foreground">
                Datei: {importFile.name} ({(importFile.size / 1024).toFixed(1)}{' '}
                KB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-password">Backup-Passwort</Label>
            <Input
              id="import-password"
              type="password"
              placeholder="Passwort eingeben"
              value={importPassword}
              onChange={e => setImportPassword(e.target.value)}
            />
          </div>

          <Button
            onClick={handleValidateBackup}
            disabled={isImporting || !importFile || !importPassword}
            className="w-full"
          >
            {isImporting ? 'Validiere...' : 'Backup validieren'}
          </Button>
        </div>
      </div>

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup-Vorschau</DialogTitle>
            <DialogDescription>
              Überprüfe den Inhalt des Backups vor dem Import
            </DialogDescription>
          </DialogHeader>

          {backupPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Episoden</p>
                  <p className="text-2xl font-bold">
                    {backupPreview.episodes.length}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Garmin-Daten</p>
                  <p className="text-2xl font-bold">
                    {backupPreview.garminData.length}
                  </p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-sm font-medium">Erstellt am</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(backupPreview.createdAt).toLocaleString('de-DE')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Import-Modus</Label>
                <div className="flex gap-2">
                  <Button
                    variant={importMode === 'merge' ? 'default' : 'outline'}
                    onClick={() => setImportMode('merge')}
                    className="flex-1"
                  >
                    Zusammenführen
                  </Button>
                  <Button
                    variant={importMode === 'replace' ? 'default' : 'outline'}
                    onClick={() => setImportMode('replace')}
                    className="flex-1"
                  >
                    Ersetzen
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {importMode === 'merge'
                    ? 'Neue Daten werden zu bestehenden hinzugefügt'
                    : 'Alle bestehenden Daten werden gelöscht'}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
            >
              Abbrechen
            </Button>
            <Button onClick={handleImport}>Jetzt importieren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Warning Dialog */}
      <AlertDialog
        open={showReplaceWarning}
        onOpenChange={setShowReplaceWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Achtung: Alle Daten werden gelöscht
            </AlertDialogTitle>
            <AlertDialogDescription>
              Du bist dabei, alle bestehenden Daten zu löschen und durch das
              Backup zu ersetzen. Diese Aktion kann nicht rückgängig gemacht
              werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeImport}
              className="bg-destructive"
            >
              Trotzdem fortfahren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
