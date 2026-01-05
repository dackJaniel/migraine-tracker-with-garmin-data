import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { analyzeTypicalIntensityPattern } from '@/features/episodes/episode-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingDown, Clock, BarChart3 } from 'lucide-react';

interface IntensityPatternData {
  avgInitial: number;
  avgPeak: number;
  avgFinal: number;
  avgDurationToPeakMinutes: number;
  avgImprovementRate: number;
  episodesWithHistory: number;
}

/**
 * IntensityAnalytics Component
 * Zeigt aggregierte Statistiken über Intensitätsverläufe
 */
export function IntensityAnalytics() {
  const [data, setData] = useState<IntensityPatternData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const pattern = await analyzeTypicalIntensityPattern();
        setData(pattern);
      } catch (error) {
        console.error('Failed to load intensity analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-pulse">Lade Intensitätsanalyse...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.episodesWithHistory === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Intensitätsverlauf-Analyse
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">
            Noch keine Episoden mit Intensitätsverlauf vorhanden.
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Aktualisiere die Intensität während einer Episode, um den Verlauf zu dokumentieren.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Chart-Daten für typischen Verlauf
  const chartData = [
    { name: 'Start', value: data.avgInitial, color: '#fbbf24' },
    { name: 'Peak', value: data.avgPeak, color: '#ef4444' },
    { name: 'Ende', value: data.avgFinal, color: '#22c55e' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Intensitätsverlauf-Analyse
          </span>
          <Badge variant="outline">
            {data.episodesWithHistory} Episoden
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">{data.avgInitial}</div>
            <div className="text-xs text-slate-600">Ø Start-Intensität</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{data.avgPeak}</div>
            <div className="text-xs text-slate-600">Ø Peak-Intensität</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{data.avgFinal}</div>
            <div className="text-xs text-slate-600">Ø End-Intensität</div>
          </div>
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">{data.avgImprovementRate}%</div>
            <div className="text-xs text-slate-600">Ø Verbesserung</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 10]} 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 12 }}
                width={25}
              />
              <Tooltip
                formatter={(value: number) => [`${value}/10`, 'Intensität']}
                contentStyle={{ borderRadius: '8px' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        <div className="space-y-3">
          <h4 className="font-medium text-slate-700 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Erkenntnisse
          </h4>
          
          <div className="grid gap-3">
            {/* Zeit bis Peak */}
            {data.avgDurationToPeakMinutes > 0 && (
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <Clock className="h-5 w-5 text-slate-600 mt-0.5" />
                <div>
                  <div className="font-medium">Zeit bis Peak</div>
                  <div className="text-sm text-slate-600">
                    Durchschnittlich erreichst du den Höhepunkt der Schmerzen nach{' '}
                    <span className="font-semibold">
                      {data.avgDurationToPeakMinutes < 60
                        ? `${data.avgDurationToPeakMinutes} Minuten`
                        : `${Math.round(data.avgDurationToPeakMinutes / 60)} Stunden`
                      }
                    </span>.
                  </div>
                </div>
              </div>
            )}

            {/* Verbesserungsrate */}
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <TrendingDown className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium">Typische Besserung</div>
                <div className="text-sm text-slate-600">
                  {data.avgImprovementRate > 0 ? (
                    <>
                      Deine Schmerzen verbessern sich im Durchschnitt um{' '}
                      <span className="font-semibold text-green-600">
                        {data.avgImprovementRate}%
                      </span>{' '}
                      von Start bis Ende.
                    </>
                  ) : data.avgImprovementRate < 0 ? (
                    <>
                      Die Schmerzen verschlechtern sich im Durchschnitt um{' '}
                      <span className="font-semibold text-red-600">
                        {Math.abs(data.avgImprovementRate)}%
                      </span>.
                    </>
                  ) : (
                    'Die Schmerzintensität bleibt im Durchschnitt konstant.'
                  )}
                </div>
              </div>
            </div>

            {/* Peak vs. Start */}
            {data.avgPeak > data.avgInitial && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <Activity className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <div className="font-medium text-red-700">Eskalation beachten</div>
                  <div className="text-sm text-red-600">
                    Die Schmerzen steigen typischerweise von {data.avgInitial} auf {data.avgPeak}{' '}
                    (um {Math.round(((data.avgPeak - data.avgInitial) / data.avgInitial) * 100)}%),
                    bevor sie sich bessern.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default IntensityAnalytics;
