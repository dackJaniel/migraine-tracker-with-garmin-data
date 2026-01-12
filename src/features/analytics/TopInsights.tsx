import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  analyzeAllCorrelations,
  type CorrelationResult,
} from './correlation-service';
import {
  Activity,
  AlertCircle,
  Battery,
  Brain,
  Cloud,
  Droplets,
  Heart,
  Moon,
  Thermometer,
  TrendingUp,
  Zap,
  Footprints,
} from 'lucide-react';

export function TopInsights() {
  const [correlations, setCorrelations] = useState<CorrelationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  // Get top 3 significant correlations sorted by percentage
  const topInsights = correlations
    .filter((c) => c.isSignificant)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Analysiere Muster...</p>
        </CardContent>
      </Card>
    );
  }

  if (topInsights.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Erkenntnisse
          </CardTitle>
          <CardDescription>
            Muster zwischen Gesundheitsdaten und Migräne
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 space-y-3">
          <p className="text-muted-foreground text-center">
            Noch keine signifikanten Muster erkannt
          </p>
          <p className="text-sm text-muted-foreground text-center">
            Erfasse mehr Episoden mit Garmin-Daten, um Zusammenhänge zu entdecken
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Top Erkenntnisse
        </CardTitle>
        <CardDescription>
          Wichtigste Zusammenhänge mit deiner Migräne
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {topInsights.map((insight, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
          >
            <div className="text-primary mt-0.5">{getIcon(insight.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm truncate">{insight.title}</h4>
                <span className="text-lg font-bold text-primary">
                  {insight.percentage}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {insight.description}
              </p>
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={() => navigate('/analytics?tab=correlations')}
        >
          Alle Korrelationen anzeigen
        </Button>
      </CardContent>
    </Card>
  );
}
