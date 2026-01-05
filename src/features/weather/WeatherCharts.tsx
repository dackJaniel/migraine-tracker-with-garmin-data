/**
 * Weather Charts Component - PAKET 12
 * Visualisierung von Wetterdaten und deren Korrelation mit Migräne-Episoden
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, subDays, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Area,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Gauge,
  Thermometer,
  Droplets,
  CloudRain,
  AlertTriangle,
} from 'lucide-react';
import { db } from '@/lib/db';

export function WeatherCharts() {
  // Lade Wetterdaten der letzten 90 Tage
  const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');
  const endDate = format(new Date(), 'yyyy-MM-dd');

  const weatherData = useLiveQuery(
    () =>
      db.weatherData
        .where('date')
        .between(startDate, endDate, true, true)
        .toArray(),
    [startDate, endDate]
  );

  const episodes = useLiveQuery(() => db.episodes.toArray(), []);

  // Verarbeite Daten für Charts
  const chartData = useMemo(() => {
    if (!weatherData || !episodes) return [];

    // Erstelle Map mit Episode-Tagen
    const episodeDates = new Set(
      episodes.map(ep => format(parseISO(ep.startTime), 'yyyy-MM-dd'))
    );

    return weatherData
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(weather => ({
        date: weather.date,
        dateFormatted: format(parseISO(weather.date), 'dd.MM', { locale: de }),
        pressure: Math.round(weather.pressure),
        pressureChange: weather.pressureChange,
        tempMin: Math.round(weather.temperature.min),
        tempMax: Math.round(weather.temperature.max),
        tempAvg: Math.round(weather.temperature.avg),
        humidity: Math.round(weather.humidity),
        precipitation: weather.precipitation,
        hasMigraine: episodeDates.has(weather.date),
        weatherDescription: weather.weatherDescription,
      }));
  }, [weatherData, episodes]);

  // Statistiken berechnen
  const stats = useMemo(() => {
    if (!chartData.length) return null;

    const migraineDays = chartData.filter(d => d.hasMigraine);
    const nonMigraineDays = chartData.filter(d => !d.hasMigraine);

    // Durchschnittlicher Luftdruck bei Migräne vs. ohne
    const avgPressureMigraine =
      migraineDays.length > 0
        ? Math.round(
            migraineDays.reduce((sum, d) => sum + d.pressure, 0) /
              migraineDays.length
          )
        : 0;

    const avgPressureNormal =
      nonMigraineDays.length > 0
        ? Math.round(
            nonMigraineDays.reduce((sum, d) => sum + d.pressure, 0) /
              nonMigraineDays.length
          )
        : 0;

    // Druckabfälle bei Migräne
    const pressureDropMigraines = migraineDays.filter(
      d => d.pressureChange !== undefined && d.pressureChange < -5
    ).length;

    return {
      totalDays: chartData.length,
      migraineDays: migraineDays.length,
      avgPressureMigraine,
      avgPressureNormal,
      pressureDiff: avgPressureNormal - avgPressureMigraine,
      pressureDropMigraines,
      pressureDropPercentage:
        migraineDays.length > 0
          ? Math.round((pressureDropMigraines / migraineDays.length) * 100)
          : 0,
    };
  }, [chartData]);

  if (!weatherData || weatherData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <CloudRain className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Keine Wetterdaten verfügbar.</p>
          <p className="text-sm mt-2">
            Gehe zu Einstellungen → Wetter um Daten zu synchronisieren.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zusammenfassung */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Gauge className="h-4 w-4" />Ø Druck (Migräne)
              </div>
              <div className="text-2xl font-bold mt-1">
                {stats.avgPressureMigraine} hPa
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Gauge className="h-4 w-4" />Ø Druck (Normal)
              </div>
              <div className="text-2xl font-bold mt-1">
                {stats.avgPressureNormal} hPa
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <AlertTriangle className="h-4 w-4" />
                Druckabfall-Trigger
              </div>
              <div className="text-2xl font-bold mt-1">
                {stats.pressureDropPercentage}%
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.pressureDropMigraines} von {stats.migraineDays} Episoden
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <CloudRain className="h-4 w-4" />
                Datenpunkte
              </div>
              <div className="text-2xl font-bold mt-1">{stats.totalDays}</div>
              <div className="text-xs text-muted-foreground">
                {stats.migraineDays} mit Migräne
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart Tabs */}
      <Tabs defaultValue="pressure" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pressure">Luftdruck</TabsTrigger>
          <TabsTrigger value="temperature">Temperatur</TabsTrigger>
          <TabsTrigger value="humidity">Feuchtigkeit</TabsTrigger>
        </TabsList>

        {/* Luftdruck Chart */}
        <TabsContent value="pressure">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Luftdruck & Migräne-Episoden
              </CardTitle>
              <CardDescription>
                Täglicher Luftdruck mit markierten Migräne-Tagen (rote Punkte)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="dateFormatted"
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={['dataMin - 10', 'dataMax + 10']}
                      tick={{ fontSize: 12 }}
                      label={{
                        value: 'hPa',
                        angle: -90,
                        position: 'insideLeft',
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium">{data.date}</p>
                            <p className="text-sm">
                              Luftdruck: {data.pressure} hPa
                            </p>
                            {data.pressureChange !== undefined && (
                              <p className="text-sm">
                                Änderung: {data.pressureChange > 0 ? '+' : ''}
                                {data.pressureChange?.toFixed(1)} hPa
                              </p>
                            )}
                            <p className="text-sm">{data.weatherDescription}</p>
                            {data.hasMigraine && (
                              <Badge variant="destructive" className="mt-2">
                                Migräne
                              </Badge>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pressure"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={props => {
                        const { cx, cy, payload } = props as {
                          cx: number;
                          cy: number;
                          payload: { hasMigraine: boolean };
                        };
                        if (cx == null || cy == null) return null;
                        if (payload?.hasMigraine) {
                          return (
                            <circle
                              key={`dot-${cx}-${cy}`}
                              cx={cx}
                              cy={cy}
                              r={6}
                              fill="#ef4444"
                              stroke="#fff"
                              strokeWidth={2}
                            />
                          );
                        }
                        return (
                          <circle
                            key={`dot-${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={2}
                            fill="#3b82f6"
                          />
                        );
                      }}
                    />
                    <ReferenceLine
                      y={1013}
                      stroke="#9ca3af"
                      strokeDasharray="5 5"
                      label={{ value: 'Normal', fill: '#9ca3af', fontSize: 12 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Temperatur Chart */}
        <TabsContent value="temperature">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Thermometer className="h-5 w-5" />
                Temperatur & Migräne-Episoden
              </CardTitle>
              <CardDescription>
                Temperaturbereich (Min/Max) mit markierten Migräne-Tagen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="dateFormatted"
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      label={{
                        value: '°C',
                        angle: -90,
                        position: 'insideLeft',
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium">{data.date}</p>
                            <p className="text-sm">
                              Min: {data.tempMin}°C / Max: {data.tempMax}°C
                            </p>
                            <p className="text-sm">Ø {data.tempAvg}°C</p>
                            {data.hasMigraine && (
                              <Badge variant="destructive" className="mt-2">
                                Migräne
                              </Badge>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="tempMax"
                      stroke="#f97316"
                      fill="#fed7aa"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="tempMin"
                      stroke="#3b82f6"
                      fill="#bfdbfe"
                      fillOpacity={0.3}
                    />
                    <Line
                      type="monotone"
                      dataKey="tempAvg"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={props => {
                        const { cx, cy, payload } = props as {
                          cx: number;
                          cy: number;
                          payload: { hasMigraine: boolean };
                        };
                        if (cx == null || cy == null) return null;
                        if (payload?.hasMigraine) {
                          return (
                            <circle
                              key={`dot-${cx}-${cy}`}
                              cx={cx}
                              cy={cy}
                              r={6}
                              fill="#ef4444"
                              stroke="#fff"
                              strokeWidth={2}
                            />
                          );
                        }
                        return (
                          <circle
                            key={`dot-${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={2}
                            fill="#10b981"
                          />
                        );
                      }}
                    />
                    <Legend />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Luftfeuchtigkeit Chart */}
        <TabsContent value="humidity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5" />
                Luftfeuchtigkeit & Migräne-Episoden
              </CardTitle>
              <CardDescription>
                Tägliche Luftfeuchtigkeit mit markierten Migräne-Tagen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="dateFormatted"
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      label={{
                        value: '%',
                        angle: -90,
                        position: 'insideLeft',
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium">{data.date}</p>
                            <p className="text-sm">
                              Luftfeuchtigkeit: {data.humidity}%
                            </p>
                            {data.precipitation > 0 && (
                              <p className="text-sm">
                                Niederschlag: {data.precipitation} mm
                              </p>
                            )}
                            {data.hasMigraine && (
                              <Badge variant="destructive" className="mt-2">
                                Migräne
                              </Badge>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="humidity"
                      fill="#60a5fa"
                      radius={[2, 2, 0, 0]}
                      // Färbe Migräne-Tage rot
                      shape={(props: unknown) => {
                        const { x, y, width, height, payload } = props as {
                          x: number;
                          y: number;
                          width: number;
                          height: number;
                          payload: { hasMigraine: boolean };
                        };
                        return (
                          <rect
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            fill={payload?.hasMigraine ? '#ef4444' : '#60a5fa'}
                            rx={2}
                          />
                        );
                      }}
                    />
                    <ReferenceLine
                      y={80}
                      stroke="#f97316"
                      strokeDasharray="5 5"
                      label={{
                        value: 'Hoch (80%)',
                        fill: '#f97316',
                        fontSize: 12,
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
