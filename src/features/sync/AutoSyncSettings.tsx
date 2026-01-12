/**
 * Auto-Sync Settings Component
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAutoSyncStatus,
  setAutoSyncEnabled,
  performAutoSyncIfNeeded,
  type AutoSyncStatus,
} from '@/lib/auto-sync';

export function AutoSyncSettings() {
  const [status, setStatus] = useState<AutoSyncStatus>({
    enabled: true,
    lastSync: null,
    isSyncing: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await getAutoSyncStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load auto-sync status:', error);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      await setAutoSyncEnabled(enabled);
      setStatus(prev => ({ ...prev, enabled }));
      toast.success(enabled ? 'Auto-Sync aktiviert' : 'Auto-Sync deaktiviert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setStatus(prev => ({ ...prev, isSyncing: true }));
    try {
      const result = await performAutoSyncIfNeeded();
      if (result.synced) {
        toast.success('Sync erfolgreich');
      } else {
        toast.info('Kein Sync noetig - Daten sind aktuell');
      }
      await loadStatus();
    } catch (error) {
      toast.error('Sync fehlgeschlagen');
      console.error(error);
    } finally {
      setStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Auto-Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-sync-enabled">Beim App-Start synchronisieren</Label>
            <p className="text-sm text-slate-500">
              Synct automatisch wenn Daten aelter als 24h sind
            </p>
          </div>
          <Switch
            id="auto-sync-enabled"
            checked={status.enabled}
            onCheckedChange={handleToggle}
            disabled={loading}
          />
        </div>

        {/* Status Info */}
        <div className="pt-2 border-t">
          <div className="text-sm flex justify-between">
            <span className="text-slate-500">Letzter Auto-Sync:</span>
            <span>
              {status.lastSync
                ? new Date(status.lastSync).toLocaleString('de-DE')
                : 'Noch nie'}
            </span>
          </div>
        </div>

        {/* Manual Sync Button */}
        <button
          onClick={handleManualSync}
          disabled={status.isSyncing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${status.isSyncing ? 'animate-spin' : ''}`} />
          {status.isSyncing ? 'Synchronisiere...' : 'Jetzt synchronisieren'}
        </button>
      </CardContent>
    </Card>
  );
}
