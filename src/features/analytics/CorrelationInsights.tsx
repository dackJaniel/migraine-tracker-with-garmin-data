import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import {
  analyzeAllCorrelations,
  type CorrelationResult,
} from './correlation-service';
import {
  TrendingUp,
  AlertCircle,
  Activity,
  Brain,
  Battery,
  Zap,
  Moon,
  Cloud,
  Thermometer,
  Droplets,
  Heart,
  Footprints,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Get confidence level badge based on sample size
 */
function getConfidenceBadge(sampleSize: number): { label: string; variant: 'secondary' | 'outline' | 'default' } {
  if (sampleSize < 10) {
    return { label: 'Wenige Daten', variant: 'secondary' };
  }
  if (sampleSize <= 30) {
    return { label: 'Moderat', variant: 'outline' };
  }
  return { label: 'Belastbar', variant: 'default' };
}

export function CorrelationInsights() {
  const [correlations, setCorrelations] = useState<CorrelationResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCorrelations();
  }, []);

  const loadCorrelations = async () => {
    setLoading(true);
    try {
      const results = await analyzeAllCorrelations();
      setCorrelations(results);
    } catch (error) {
      console.error('Fehler beim Laden der Korrelationen:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: CorrelationResult['type']) => {
    switch (type) {
      case 'sleep':
        return <Moon className="h-5 w-5" />;
      case 'stress':
        return <AlertCircle className="h-5 w-5" />;
      case 'hrv':
        return <Activity className="h-5 w-5" />;
      case 'bodyBattery':
        return <Battery className="h-5 w-5" />;
      case 'trigger':
        return <Zap className="h-5 w-5" />;
      case 'nightOnset':
        return <Moon className="h-5 w-5" />;
      case 'weather':
        return <Cloud className="h-5 w-5" />;
      case 'pressure':
        return <TrendingUp className="h-5 w-5" />;
      case 'temperature':
        return <Thermometer className="h-5 w-5" />;
      case 'humidity':
        return <Droplets className="h-5 w-5" />;
      case 'steps':
        return <Footprints className="h-5 w-5" />;
      case 'restingHR':
        return <Heart className="h-5 w-5" />;
      case 'hydration':
        return <Droplets className="h-5 w-5" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  const significantCorrelations = correlations.filter(c => c.isSignificant);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Analysiere Zusammenhänge...</p>
        </CardContent>
      </Card>
    );
  }

  if (correlations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-2">
          <Brain className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nicht genügend Daten für Korrelationsanalyse
          </p>
          <p className="text-sm text-muted-foreground">
            Erfasse mindestens 5 Episoden mit Garmin-Daten
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Zusammenfassung */}
      {significantCorrelations.length > 0 && (
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertTitle>🔍 Muster erkannt</AlertTitle>
          <AlertDescription>
            Es wurden {significantCorrelations.length} signifikante
            Zusammenhänge zwischen deinen Gesundheitsdaten und Migräne-Episoden
            gefunden.
          </AlertDescription>
        </Alert>
      )}

      {/* Signifikante Korrelationen */}
      {significantCorrelations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Signifikante Zusammenhänge</CardTitle>
            <CardDescription>
              Diese Muster traten bei deinen Migräne-Tagen auffällig häufig auf
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {significantCorrelations.map((correlation, index) => {
              const confidence = getConfidenceBadge(correlation.sampleSize);
              return (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 sm:block">
                    <div className="text-primary">
                      {getIcon(correlation.type)}
                    </div>
                    <div className="text-2xl font-bold text-primary sm:hidden">
                      {correlation.percentage}%
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{correlation.title}</h4>
                      <Badge variant="default">Signifikant</Badge>
                      <Badge variant={confidence.variant}>{confidence.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {correlation.percentage}% deiner Migräne-Tage hatten dieses Merkmal
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {correlation.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                      <span>Datenbasis: {correlation.sampleSize} Einträge</span>
                      {correlation.pValue && (
                        <span>p-Wert: {correlation.pValue.toFixed(3)}</span>
                      )}
                    </div>
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="text-2xl font-bold text-primary">
                      {correlation.percentage}%
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Alle Korrelationen */}
      <Card>
        <CardHeader>
          <CardTitle>Weitere Analysen</CardTitle>
          <CardDescription>
            Weitere untersuchte Zusammenhänge - noch nicht statistisch auffällig
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {correlations
            .filter(c => !c.isSignificant)
            .map((correlation, index) => {
              const confidence = getConfidenceBadge(correlation.sampleSize);
              return (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 sm:block">
                    <div className="text-muted-foreground">
                      {getIcon(correlation.type)}
                    </div>
                    <div className="text-xl font-semibold text-muted-foreground sm:hidden">
                      {correlation.percentage}%
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{correlation.title}</h4>
                      <Badge variant={confidence.variant}>{confidence.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {correlation.percentage}% deiner Migräne-Tage hatten dieses Merkmal
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {correlation.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Datenbasis: {correlation.sampleSize} Einträge
                    </p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="text-xl font-semibold text-muted-foreground">
                      {correlation.percentage}%
                    </div>
                  </div>
                </div>
              );
            })}
          {correlations.filter(c => !c.isSignificant).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Alle gefundenen Zusammenhänge sind signifikant
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info-Box */}
      <Card>
        <CardHeader>
          <CardTitle>Hinweis zur Interpretation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            Diese Analyse zeigt statistische Zusammenhänge zwischen deinen
            Gesundheitsdaten und Migräne-Episoden. Ein Zusammenhang bedeutet
            nicht automatisch eine Ursache-Wirkungs-Beziehung.
          </p>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Datenbasis-Badges:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Wenige Daten</strong> (unter 10 Einträge): Vorläufige Tendenz</li>
              <li><strong>Moderat</strong> (10-30 Einträge): Aufkommende Muster</li>
              <li><strong>Belastbar</strong> (über 30 Einträge): Statistisch aussagekräftig</li>
            </ul>
          </div>
          <p>
            <strong>Signifikant:</strong> Muster mit hoher statistischer
            Aussagekraft (p-Wert &lt; 0.05) und deutlichem Unterschied zur
            Baseline.
          </p>
          <p>
            Nutze diese Erkenntnisse als Hinweise für Gespräche mit
            medizinischem Fachpersonal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
