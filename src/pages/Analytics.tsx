import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EpisodeCharts } from '@/features/analytics/EpisodeCharts';
import { TriggerAnalysis } from '@/features/analytics/TriggerAnalysis';
import { CorrelationInsights } from '@/features/analytics/CorrelationInsights';
import { BackupManager } from '@/features/backup/BackupManager';

export function Analytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'overview');

  // Deep Link Support: Tab aus URL-Parameter lesen
  useEffect(() => {
    if (
      tabFromUrl &&
      ['overview', 'triggers', 'correlations', 'export'].includes(tabFromUrl)
    ) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // URL aktualisieren bei Tab-Wechsel
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'overview') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analyse & Statistiken</h1>
        <p className="text-muted-foreground mt-2">
          Visualisierung deiner Migräne-Muster und Zusammenhänge
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
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
                Exportiere oder importiere deine Daten als verschlüsselte
                Backup-Datei
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
