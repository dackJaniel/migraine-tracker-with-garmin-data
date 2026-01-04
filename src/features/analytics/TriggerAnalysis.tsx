import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function TriggerAnalysis() {
  // Trigger Häufigkeit (Top 10)
  const triggerFrequency = useLiveQuery(async () => {
    const allEpisodes = await db.episodes.toArray();
    
    const triggerMap = new Map<string, number>();
    allEpisodes.forEach((ep) => {
      ep.triggers.forEach((trigger) => {
        triggerMap.set(trigger, (triggerMap.get(trigger) || 0) + 1);
      });
    });

    return Array.from(triggerMap.entries())
      .map(([trigger, count]) => ({ trigger, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, []);

  // Medikamenten-Wirksamkeit
  const medicineEffectiveness = useLiveQuery(async () => {
    const allEpisodes = await db.episodes.toArray();
    
    const medicineMap = new Map<string, { total: number; helped: number }>();
    
    allEpisodes.forEach((ep) => {
      ep.medicines.forEach((medicine) => {
        const current = medicineMap.get(medicine) || { total: 0, helped: 0 };
        // Annahme: Episode half wenn Intensität <= 4 oder Dauer < 4h
        const duration = ep.endTime 
          ? (ep.endTime.getTime() - ep.startTime.getTime()) / (1000 * 60 * 60)
          : 0;
        const helped = ep.intensity <= 4 || duration < 4;
        
        medicineMap.set(medicine, {
          total: current.total + 1,
          helped: current.helped + (helped ? 1 : 0),
        });
      });
    });

    return Array.from(medicineMap.entries())
      .map(([medicine, stats]) => ({
        medicine,
        successRate: Math.round((stats.helped / stats.total) * 100),
        count: stats.total,
      }))
      .filter((m) => m.count >= 3) // Nur Medikamente mit mind. 3 Anwendungen
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 8);
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Trigger Häufigkeit */}
      <Card className="col-span-2 md:col-span-1">
        <CardHeader>
          <CardTitle>Top Trigger</CardTitle>
          <CardDescription>Die 10 häufigsten Auslöser deiner Migräne-Episoden</CardDescription>
        </CardHeader>
        <CardContent>
          {!triggerFrequency || triggerFrequency.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine Trigger erfasst
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={triggerFrequency}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ trigger, percent }) =>
                    `${trigger} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {triggerFrequency.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Medikamenten-Wirksamkeit */}
      <Card className="col-span-2 md:col-span-1">
        <CardHeader>
          <CardTitle>Medikamenten-Wirksamkeit</CardTitle>
          <CardDescription>
            Erfolgsrate der verwendeten Medikamente (mind. 3 Anwendungen)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!medicineEffectiveness || medicineEffectiveness.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nicht genügend Daten vorhanden
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={medicineEffectiveness} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="medicine" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="successRate" fill="hsl(var(--primary))" name="Erfolgsrate %" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Trigger-Statistiken */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Trigger-Details</CardTitle>
          <CardDescription>Detaillierte Aufschlüsselung aller Trigger</CardDescription>
        </CardHeader>
        <CardContent>
          {!triggerFrequency || triggerFrequency.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Keine Daten verfügbar
            </p>
          ) : (
            <div className="space-y-2">
              {triggerFrequency.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <span className="font-medium">{item.trigger}</span>
                  <span className="text-sm text-muted-foreground">{item.count} Episoden</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
