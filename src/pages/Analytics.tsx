import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EpisodeCharts } from '@/features/analytics/EpisodeCharts';
import { TriggerAnalysis } from '@/features/analytics/TriggerAnalysis';
import { CorrelationInsights } from '@/features/analytics/CorrelationInsights';
import { BackupManager } from '@/features/backup/BackupManager';

export function Analytics() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analyse & Statistiken</h1>
        <p className="text-muted-foreground mt-2">
          Visualisierung deiner Migräne-Muster und Zusammenhänge
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="triggers">Trigger</TabsTrigger>
          <TabsTrigger value="correlations">Korrelationen</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <EpisodeCharts />
        </TabsContent>

        <TabsContent value="triggers" className="space-y-4">
          <TriggerAnalysis />
        </TabsContent>

        <TabsContent value="correlations" className="space-y-4">
          <CorrelationInsights />
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Datensicherung</CardTitle>
              <CardDescription>
                Exportiere oder importiere deine Daten als verschlüsselte Backup-Datei
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BackupManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
