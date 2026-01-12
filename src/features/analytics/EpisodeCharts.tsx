import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { format, getDay, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { TopInsights } from './TopInsights';

export function EpisodeCharts() {
  // Episoden pro Monat (letzte 6 Monate)
  const episodesPerMonth = useLiveQuery(async () => {
    const sixMonthsAgo = subMonths(new Date(), 6);
    const allEpisodes = await db.episodes
      .where('startTime')
      .above(sixMonthsAgo)
      .toArray();

    const monthMap = new Map<string, number>();
    allEpisodes.forEach(ep => {
      const monthKey = format(ep.startTime, 'MMM yyyy', { locale: de });
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
    });

    return Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .slice(-6);
  }, []);

  // Durchschnittliche Intensität pro Wochentag
  const intensityByWeekday = useLiveQuery(async () => {
    const allEpisodes = await db.episodes.toArray();

    const weekdayMap = new Map<number, { total: number; count: number }>();
    allEpisodes.forEach(ep => {
      const day = getDay(ep.startTime);
      const current = weekdayMap.get(day) || { total: 0, count: 0 };
      weekdayMap.set(day, {
        total: current.total + ep.intensity,
        count: current.count + 1,
      });
    });

    const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return weekdays.map((name, index) => {
      const data = weekdayMap.get(index);
      return {
        day: name,
        intensity: data ? Math.round((data.total / data.count) * 10) / 10 : 0,
      };
    });
  }, []);

  // Garmin-Metriken Timeline (letzte 30 Tage)
  const garminTimeline = useLiveQuery(async () => {
    const thirtyDaysAgo = subMonths(new Date(), 1);
    const garminData = await db.garminData
      .where('date')
      .above(format(thirtyDaysAgo, 'yyyy-MM-dd'))
      .toArray();

    return garminData
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(data => ({
        date: format(new Date(data.date), 'dd.MM', { locale: de }),
        schlaf: data.sleepStages
          ? Math.round(
              (data.sleepStages.deep +
                data.sleepStages.light +
                data.sleepStages.rem) /
                60
            )
          : null,
        stress: data.stressLevel?.average || null,
        hrv: data.hrv || null,
        bodyBattery: data.bodyBattery?.current || null,
      }))
      .slice(-14); // Letzte 14 Tage für bessere Lesbarkeit
  }, []);

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      {/* Top Insights - prominently at the top */}
      <div className="lg:col-span-2">
        <TopInsights />
      </div>

      {/* Episoden pro Monat */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Episoden pro Monat</CardTitle>
          <CardDescription>
            Anzahl der Migräne-Episoden in den letzten 6 Monaten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={episodesPerMonth || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" name="Episoden" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Intensität pro Wochentag */}
      <Card>
        <CardHeader>
          <CardTitle>Intensität pro Wochentag</CardTitle>
          <CardDescription>
            Durchschnittliche Schmerzintensität nach Wochentag
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={intensityByWeekday || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Bar
                dataKey="intensity"
                fill="hsl(var(--destructive))"
                name="Ø Intensität"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Garmin Metriken Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Gesundheitsmetriken</CardTitle>
          <CardDescription>Garmin Daten der letzten 14 Tage</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={garminTimeline || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="schlaf"
                stroke="hsl(var(--chart-1))"
                name="Schlaf (h)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="stress"
                stroke="hsl(var(--chart-2))"
                name="Stress"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="bodyBattery"
                stroke="hsl(var(--chart-3))"
                name="Body Battery"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
