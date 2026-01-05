/**
 * Weather Card Component - PAKET 12
 * Zeigt aktuelle Wetterdaten auf dem Dashboard an
 */

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Droplets,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  Thermometer,
  AlertTriangle,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db, type WeatherData } from '@/lib/db';
import {
  syncTodayWeather,
  getSavedLocation,
  type Location,
} from '@/lib/weather';
import { toast } from 'sonner';

interface WeatherCardProps {
  className?: string;
}

export function WeatherCard({ className }: WeatherCardProps) {
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Heutiges Wetter aus DB laden
  const today = format(new Date(), 'yyyy-MM-dd');
  const weather = useLiveQuery(() => db.weatherData.get(today), [today]);

  useEffect(() => {
    getSavedLocation().then(loc => setLocation(loc ?? null));
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await syncTodayWeather();
      toast.success('Wetterdaten aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Laden der Wetterdaten');
    } finally {
      setIsLoading(false);
    }
  };

  // Keine Location gesetzt
  if (!location) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Wetter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Kein Standort festgelegt.
            <br />
            Gehe zu Einstellungen → Wetter um einen Standort auszuwählen.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Keine Wetterdaten vorhanden
  if (!weather) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Wetter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Keine Wetterdaten für heute.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
            />
            Jetzt laden
          </Button>
        </CardContent>
      </Card>
    );
  }

  const pressureTrend = getPressureTrend(weather.pressureChange);
  const migraineWarning = checkMigraineWarning(weather);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <WeatherIcon code={weather.weatherCode} className="h-5 w-5" />
            Wetter heute
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 mr-1" />
          {location.name}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Migräne-Warnung */}
        {migraineWarning && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{migraineWarning}</span>
          </div>
        )}

        {/* Hauptinfo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WeatherIcon code={weather.weatherCode} className="h-10 w-10" />
            <div>
              <div className="text-2xl font-bold">
                {Math.round(weather.temperature.avg)}°C
              </div>
              <div className="text-xs text-muted-foreground">
                {weather.weatherDescription}
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Thermometer className="h-3 w-3" />
              {Math.round(weather.temperature.min)}° /{' '}
              {Math.round(weather.temperature.max)}°
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          {/* Luftdruck */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Gauge className="h-3 w-3" />
              <span className="text-xs">Druck</span>
            </div>
            <div className="font-medium text-sm flex items-center justify-center gap-1">
              {Math.round(weather.pressure)} hPa
              {pressureTrend.icon}
            </div>
            {weather.pressureChange && (
              <div
                className={`text-xs ${
                  Math.abs(weather.pressureChange) > 10
                    ? 'text-amber-600 font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {weather.pressureChange > 0 ? '+' : ''}
                {weather.pressureChange.toFixed(1)} hPa
              </div>
            )}
          </div>

          {/* Luftfeuchtigkeit */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Droplets className="h-3 w-3" />
              <span className="text-xs">Feuchte</span>
            </div>
            <div className="font-medium text-sm">
              {Math.round(weather.humidity)}%
            </div>
          </div>

          {/* Wind */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Wind className="h-3 w-3" />
              <span className="text-xs">Wind</span>
            </div>
            <div className="font-medium text-sm">
              {Math.round(weather.windSpeed)} km/h
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Gibt das passende Wetter-Icon basierend auf WMO Code zurück
 */
function WeatherIcon({
  code,
  className,
}: {
  code: number;
  className?: string;
}) {
  // Klar/Sonnig
  if (code === 0 || code === 1) {
    return <Sun className={`text-amber-500 ${className}`} />;
  }
  // Bewölkt
  if (code === 2 || code === 3) {
    return <Cloud className={`text-slate-500 ${className}`} />;
  }
  // Nebel
  if (code === 45 || code === 48) {
    return <Cloud className={`text-slate-400 ${className}`} />;
  }
  // Regen/Niesel
  if (code >= 51 && code <= 67) {
    return <CloudRain className={`text-blue-500 ${className}`} />;
  }
  // Schnee
  if (code >= 71 && code <= 86) {
    return <CloudSnow className={`text-blue-300 ${className}`} />;
  }
  // Gewitter
  if (code >= 95) {
    return <CloudLightning className={`text-purple-500 ${className}`} />;
  }
  // Default
  return <Cloud className={className} />;
}

/**
 * Bestimmt den Luftdruck-Trend
 */
function getPressureTrend(change?: number): {
  icon: React.ReactNode;
  label: string;
} {
  if (!change) {
    return { icon: null, label: 'stabil' };
  }
  if (change > 3) {
    return {
      icon: <TrendingUp className="h-3 w-3 text-green-600" />,
      label: 'steigend',
    };
  }
  if (change < -3) {
    return {
      icon: <TrendingDown className="h-3 w-3 text-red-600" />,
      label: 'fallend',
    };
  }
  return {
    icon: <Minus className="h-3 w-3 text-muted-foreground" />,
    label: 'stabil',
  };
}

/**
 * Prüft ob Wetterbedingungen für Migräne kritisch sind
 */
function checkMigraineWarning(weather: WeatherData): string | null {
  const warnings: string[] = [];

  // Starker Druckabfall (> 10 hPa)
  if (weather.pressureChange && weather.pressureChange < -10) {
    warnings.push('Starker Druckabfall');
  }

  // Gewitter
  if (weather.weatherCode >= 95) {
    warnings.push('Gewitter');
  }

  // Sehr hohe Luftfeuchtigkeit
  if (weather.humidity > 85) {
    warnings.push('Hohe Luftfeuchtigkeit');
  }

  // Extreme Temperaturen
  if (weather.temperature.max > 30) {
    warnings.push('Hitze');
  }

  if (warnings.length === 0) return null;

  return `Migräne-Risiko: ${warnings.join(', ')}`;
}
