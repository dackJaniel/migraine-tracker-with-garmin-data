import { useMemo } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { IntensityEntry } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Minus, Clock, Activity } from 'lucide-react';

// Intensität Emojis
const INTENSITY_EMOJIS: Record<number, string> = {
  1: '😊',
  2: '🙂',
  3: '😐',
  4: '😕',
  5: '😟',
  6: '😣',
  7: '😖',
  8: '😫',
  9: '😩',
  10: '😱',
};

interface IntensityTimelineProps {
  history: IntensityEntry[];
  startTime: string;
  endTime?: string;
  showChart?: boolean;
}

/**
 * Berechnet Statistiken aus dem Intensitätsverlauf
 */
function calculateStats(history: IntensityEntry[]) {
  if (history.length === 0) {
    return {
      average: 0,
      peak: 0,
      peakTime: null as string | null,
      current: 0,
      trend: 'stable' as 'improving' | 'worsening' | 'stable',
      durationToPeak: 0,
    };
  }

  const intensities = history.map(h => h.intensity);
  const average =
    intensities.reduce((sum, i) => sum + i, 0) / intensities.length;
  const peak = Math.max(...intensities);
  const peakEntry = history.find(h => h.intensity === peak);
  const current = history[history.length - 1].intensity;

  // Berechne Trend basierend auf den letzten 3 Einträgen
  let trend: 'improving' | 'worsening' | 'stable' = 'stable';
  if (history.length >= 2) {
    const last = history[history.length - 1].intensity;
    const prev = history[history.length - 2].intensity;
    if (last < prev) trend = 'improving';
    else if (last > prev) trend = 'worsening';
  }

  // Dauer bis zum Peak (in Minuten)
  let durationToPeak = 0;
  if (peakEntry && history.length > 0) {
    durationToPeak = differenceInMinutes(
      new Date(peakEntry.timestamp),
      new Date(history[0].timestamp)
    );
  }

  return {
    average: Math.round(average * 10) / 10,
    peak,
    peakTime: peakEntry?.timestamp ?? null,
    current,
    trend,
    durationToPeak,
  };
}

/**
 * Custom Tooltip für den Chart
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: IntensityEntry & { timeLabel: string } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{INTENSITY_EMOJIS[data.intensity]}</span>
        <span className="font-bold text-lg">{data.intensity}/10</span>
      </div>
      <div className="text-sm text-slate-600">{data.timeLabel}</div>
      {data.note && (
        <div className="text-sm text-slate-700 mt-1 italic">"{data.note}"</div>
      )}
    </div>
  );
}

/**
 * IntensityTimeline Component
 * Zeigt den Verlauf der Schmerzintensität über die Zeit
 */
export function IntensityTimeline({
  history,
  startTime,
  endTime,
  showChart = true,
}: IntensityTimelineProps) {
  const stats = useMemo(() => calculateStats(history), [history]);

  // Bereite Chart-Daten vor
  const chartData = useMemo(() => {
    return history.map((entry, index) => ({
      ...entry,
      index,
      timeLabel: format(new Date(entry.timestamp), 'HH:mm', { locale: de }),
      dateLabel: format(new Date(entry.timestamp), 'dd.MM. HH:mm', {
        locale: de,
      }),
    }));
  }, [history]);

  // Trend Icon
  const TrendIcon =
    stats.trend === 'improving'
      ? TrendingDown
      : stats.trend === 'worsening'
        ? TrendingUp
        : Minus;

  const trendColor =
    stats.trend === 'improving'
      ? 'text-green-600'
      : stats.trend === 'worsening'
        ? 'text-red-600'
        : 'text-slate-600';

  const trendText =
    stats.trend === 'improving'
      ? 'Besserung'
      : stats.trend === 'worsening'
        ? 'Verschlechterung'
        : 'Stabil';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Intensitätsverlauf
          </span>
          {history.length > 1 && (
            <Badge variant="outline" className={trendColor}>
              <TrendIcon className="h-3 w-3 mr-1" />
              {trendText}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              {stats.current}
              <span className="text-xl">{INTENSITY_EMOJIS[stats.current]}</span>
            </div>
            <div className="text-xs text-slate-600">Aktuell</div>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.peak}</div>
            <div className="text-xs text-slate-600">Peak</div>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold">{stats.average}</div>
            <div className="text-xs text-slate-600">Ø Durchschnitt</div>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold">{history.length}</div>
            <div className="text-xs text-slate-600">Einträge</div>
          </div>
        </div>

        {/* Chart */}
        {showChart && history.length > 1 && (
          <div className="h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={25}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={5} stroke="#e2e8f0" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="intensity"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#4f46e5' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Timeline Entries */}
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Verlauf
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map((entry, index) => (
              <div
                key={entry.timestamp}
                className={`flex items-start gap-3 p-2 rounded-lg ${
                  index === history.length - 1
                    ? 'bg-indigo-50 border border-indigo-200'
                    : 'bg-slate-50'
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-lg">
                  {INTENSITY_EMOJIS[entry.intensity]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{entry.intensity}/10</span>
                    <span className="text-xs text-slate-500">
                      {format(new Date(entry.timestamp), 'dd.MM.yyyy HH:mm', {
                        locale: de,
                      })}
                    </span>
                  </div>
                  {entry.note && (
                    <p className="text-sm text-slate-600 mt-1 truncate">
                      {entry.note}
                    </p>
                  )}
                  {index === 0 && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Start
                    </Badge>
                  )}
                  {index === history.length - 1 && index !== 0 && (
                    <Badge
                      variant="outline"
                      className="mt-1 text-xs bg-indigo-100"
                    >
                      Aktuell
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Info */}
        {stats.peakTime && stats.durationToPeak > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
            <span className="font-medium text-red-700">Peak erreicht:</span>
            <span className="text-red-600 ml-2">
              {stats.durationToPeak} Minuten nach Beginn (
              {format(new Date(stats.peakTime), 'HH:mm', { locale: de })} Uhr)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default IntensityTimeline;
