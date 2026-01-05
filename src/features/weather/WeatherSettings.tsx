/**
 * Weather Settings Component - PAKET 12
 * Verwaltung von Standort und Wetter-Sync-Einstellungen
 */

import { useEffect, useState, useCallback } from 'react';
import {
  MapPin,
  Search,
  Loader2,
  Trash2,
  RefreshCw,
  CloudSun,
  Navigation,
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
import { Switch } from '@/components/ui/switch';
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
import {
  type Location,
  type WeatherSettings as WeatherSettingsType,
  getWeatherSettings,
  saveWeatherSettings,
  saveLocation,
  clearLocation,
  detectAndSaveLocation,
  searchCities,
  syncAllMissingWeather,
  clearWeatherData,
  getWeatherStats,
  PRESET_CITIES,
} from '@/lib/weather';
import { toast } from 'sonner';

export function WeatherSettings() {
  const [settings, setSettings] = useState<WeatherSettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [stats, setStats] = useState<{
    totalDays: number;
    oldestDate: string | null;
    newestDate: string | null;
  } | null>(null);

  // Lade Einstellungen
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [loadedSettings, loadedStats] = await Promise.all([
        getWeatherSettings(),
        getWeatherStats(),
      ]);
      setSettings(loadedSettings);
      setStats(loadedStats);
    } catch (error) {
      toast.error('Fehler beim Laden der Einstellungen');
    } finally {
      setIsLoading(false);
    }
  };

  // Stadt-Suche mit Debounce
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchCities(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // GPS-Standort erkennen
  const handleDetectLocation = async () => {
    setIsDetecting(true);
    try {
      const location = await detectAndSaveLocation();
      if (location) {
        toast.success(`Standort erkannt: ${location.name}`);
        await loadSettings();
      } else {
        toast.error('Standort konnte nicht ermittelt werden');
      }
    } catch (error) {
      toast.error('Fehler bei der Standorterkennung');
    } finally {
      setIsDetecting(false);
    }
  };

  // Stadt auswählen
  const handleSelectCity = async (location: Location) => {
    try {
      await saveLocation(location);
      toast.success(`Standort gesetzt: ${location.name}`);
      setLocationDialogOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      await loadSettings();
    } catch (error) {
      toast.error('Fehler beim Speichern des Standorts');
    }
  };

  // Standort löschen
  const handleClearLocation = async () => {
    try {
      await clearLocation();
      toast.success('Standort entfernt');
      await loadSettings();
    } catch (error) {
      toast.error('Fehler beim Entfernen des Standorts');
    }
  };

  // Einstellung ändern
  const handleToggle = async (
    key: keyof WeatherSettingsType,
    value: boolean
  ) => {
    try {
      await saveWeatherSettings({ [key]: value });
      setSettings(prev => (prev ? { ...prev, [key]: value } : prev));
      toast.success('Einstellung gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  // Wetterdaten synchronisieren
  const handleSync = async () => {
    if (!settings?.location) {
      toast.error('Bitte zuerst einen Standort festlegen');
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: 0 });

    try {
      const syncedDays = await syncAllMissingWeather((current, total) => {
        setSyncProgress({ current, total });
      });

      toast.success(`${syncedDays} Tage synchronisiert`);
      await loadSettings();
    } catch (error) {
      toast.error('Fehler bei der Synchronisation');
    } finally {
      setIsSyncing(false);
    }
  };

  // Wetterdaten löschen
  const handleClearData = async () => {
    try {
      await clearWeatherData();
      toast.success('Wetterdaten gelöscht');
      await loadSettings();
    } catch (error) {
      toast.error('Fehler beim Löschen');
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
      {/* Standort */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Standort
          </CardTitle>
          <CardDescription>
            Lege deinen Standort für Wetterdaten fest
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Aktueller Standort */}
          {settings?.location ? (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{settings.location.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClearLocation}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Kein Standort festgelegt
            </p>
          )}

          {/* Standort-Auswahl */}
          <div className="flex gap-2">
            <Dialog
              open={locationDialogOpen}
              onOpenChange={setLocationDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <Search className="h-4 w-4 mr-2" />
                  Stadt suchen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Stadt auswählen</DialogTitle>
                  <DialogDescription>
                    Suche nach einer Stadt oder wähle aus der Liste
                  </DialogDescription>
                </DialogHeader>

                {/* Suche */}
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Stadt suchen..."
                      value={searchQuery}
                      onChange={e => handleSearch(e.target.value)}
                      className="pl-9"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                    )}
                  </div>

                  {/* Suchergebnisse */}
                  {searchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {searchResults.map((city, index) => (
                        <button
                          key={`${city.lat}-${city.lon}-${index}`}
                          onClick={() => handleSelectCity(city)}
                          className="w-full text-left p-2 hover:bg-muted rounded-md text-sm flex items-center gap-2"
                        >
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                          {city.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Vorschläge */}
                  {!searchQuery && (
                    <>
                      <Label className="text-xs text-muted-foreground">
                        Beliebte Städte
                      </Label>
                      <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                        {PRESET_CITIES.map(city => (
                          <button
                            key={`${city.lat}-${city.lon}`}
                            onClick={() => handleSelectCity(city)}
                            className="text-left p-2 hover:bg-muted rounded-md text-sm truncate"
                          >
                            {city.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setLocationDialogOpen(false)}
                  >
                    Abbrechen
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={handleDetectLocation}
              disabled={isDetecting}
            >
              {isDetecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              GPS
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync-Einstellungen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudSun className="h-5 w-5" />
            Wetter-Sync
          </CardTitle>
          <CardDescription>
            Synchronisiere Wetterdaten für Korrelationsanalysen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Wetter-Tracking aktiviert</Label>
                <p className="text-xs text-muted-foreground">
                  Wetterdaten für Analysen sammeln
                </p>
              </div>
              <Switch
                checked={settings?.enabled ?? true}
                onCheckedChange={checked => handleToggle('enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Sync</Label>
                <p className="text-xs text-muted-foreground">
                  Täglich automatisch synchronisieren
                </p>
              </div>
              <Switch
                checked={settings?.autoSync ?? true}
                onCheckedChange={checked => handleToggle('autoSync', checked)}
              />
            </div>
          </div>

          {/* Statistiken */}
          {stats && stats.totalDays > 0 && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p>
                <strong>{stats.totalDays}</strong> Tage gespeichert
              </p>
              {stats.oldestDate && stats.newestDate && (
                <p className="text-muted-foreground">
                  {stats.oldestDate} bis {stats.newestDate}
                </p>
              )}
            </div>
          )}

          {/* Sync Progress */}
          {isSyncing && syncProgress.total > 0 && (
            <div className="space-y-2">
              <Progress
                value={(syncProgress.current / syncProgress.total) * 100}
              />
              <p className="text-xs text-muted-foreground text-center">
                {syncProgress.current} / {syncProgress.total} Tage
              </p>
            </div>
          )}

          {/* Aktionen */}
          <div className="flex gap-2">
            <Button
              onClick={handleSync}
              disabled={isSyncing || !settings?.location}
              className="flex-1"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isSyncing ? 'Synchronisiere...' : 'Letzte 90 Tage laden'}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!stats || stats.totalDays === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Wetterdaten löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Alle gespeicherten Wetterdaten werden gelöscht. Diese Aktion
                    kann nicht rückgängig gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearData}>
                    Löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
