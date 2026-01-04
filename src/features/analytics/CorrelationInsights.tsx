import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { analyzeAllCorrelations, CorrelationResult } from './correlation-service';
import { TrendingUp, AlertCircle, Activity, Brain, Battery, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
        return <Activity className="h-5 w-5" />;
      case 'stress':
        return <AlertCircle className="h-5 w-5" />;
      case 'hrv':
        return <Activity className="h-5 w-5" />;
      case 'bodyBattery':
        return <Battery className="h-5 w-5" />;
      case 'trigger':
        return <Zap className="h-5 w-5" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  const significantCorrelations = correlations.filter((c) => c.isSignificant);

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
          <p className="text-muted-foreground">Nicht genügend Daten für Korrelationsanalyse</p>
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
            Es wurden {significantCorrelations.length} signifikante Zusammenhänge zwischen deinen
            Gesundheitsdaten und Migräne-Episoden gefunden.
          </AlertDescription>
        </Alert>
      )}

      {/* Signifikante Korrelationen */}
      {significantCorrelations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Signifikante Zusammenhänge</CardTitle>
            <CardDescription>
              Diese Muster zeigen einen deutlichen Einfluss auf deine Migräne
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {significantCorrelations.map((correlation, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="mt-1 text-primary">{getIcon(correlation.type)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{correlation.title}</h4>
                    <Badge variant="default">Signifikant</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{correlation.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <span>Datenbasis: {correlation.sampleSize} Einträge</span>
                    {correlation.pValue && (
                      <span>p-Wert: {correlation.pValue.toFixed(3)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {correlation.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Alle Korrelationen */}
      <Card>
        <CardHeader>
          <CardTitle>Weitere Analysen</CardTitle>
          <CardDescription>
            Alle untersuchten Zusammenhänge zwischen Gesundheitsmetriken und Migräne
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {correlations
            .filter((c) => !c.isSignificant)
            .map((correlation, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="mt-1 text-muted-foreground">{getIcon(correlation.type)}</div>
                <div className="flex-1 space-y-1">
                  <h4 className="font-semibold">{correlation.title}</h4>
                  <p className="text-sm text-muted-foreground">{correlation.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Datenbasis: {correlation.sampleSize} Einträge
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold text-muted-foreground">
                    {correlation.percentage}%
                  </div>
                </div>
              </div>
            ))}
          {correlations.filter((c) => !c.isSignificant).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Alle gefundenen Zusammenhänge sind signifikant
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info-Box */}
      <Card>
        <CardHeader>
          <CardTitle>ℹ️ Hinweis zur Interpretation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Diese Analyse zeigt statistische Zusammenhänge zwischen deinen Gesundheitsdaten und
            Migräne-Episoden. Ein Zusammenhang bedeutet nicht automatisch eine Ursache-Wirkungs-Beziehung.
          </p>
          <p>
            <strong>Signifikant:</strong> Muster mit hoher statistischer Aussagekraft (p-Wert &lt; 0.05)
            und mindestens 20% Unterschied zur Baseline.
          </p>
          <p>
            Nutze diese Erkenntnisse als Hinweise für Gespräche mit medizinischem Fachpersonal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
