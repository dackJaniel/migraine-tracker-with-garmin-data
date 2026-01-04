import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEpisodes, useStats } from '@/hooks/use-episodes';
import { deleteEpisode } from '@/features/episodes/episode-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Calendar,
  TrendingUp,
  Activity,
  Tag,
  Trash2,
  Pencil,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const episodes = useEpisodes();
  const stats = useStats();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (deleteId === null) return;

    try {
      await deleteEpisode(deleteId);
      toast.success('Episode gelöscht');
      setDeleteId(null);
    } catch (error) {
      toast.error('Fehler beim Löschen der Episode');
      console.error('Delete error:', error);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Übersicht deiner Migräne-Episoden
          </p>
        </div>
        <Button size="lg" className="gap-2" onClick={() => navigate('/episodes/new')}>
          <Plus className="h-5 w-5" />
          Neue Episode
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tage seit letzter Migräne
            </CardTitle>
            <Calendar className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.daysSinceLastEpisode ?? '-'}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {stats &&
              stats.daysSinceLastEpisode !== null &&
              stats.daysSinceLastEpisode !== undefined &&
              stats.daysSinceLastEpisode > 7
                ? 'Gut gemacht! 🎉'
                : 'Halte durch 💪'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gesamt Episoden
            </CardTitle>
            <Activity className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.totalEpisodes ?? 0}
            </div>
            <p className="text-xs text-slate-600 mt-1">Alle Zeit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Intensität</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.averageIntensity?.toFixed(1) ?? '-'}/10
            </div>
            <p className="text-xs text-slate-600 mt-1">Durchschnitt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diesen Monat</CardTitle>
            <Tag className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.episodesThisMonth ?? 0}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {stats?.mostCommonTriggers?.[0]?.trigger ?? 'Keine Daten'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Episode Liste */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Episoden</CardTitle>
        </CardHeader>
        <CardContent>
          {!episodes || episodes.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">Noch keine Episoden</p>
              <p className="text-sm text-slate-500 mb-4">
                Starte mit deiner ersten Migräne-Episode
              </p>
              <Button onClick={() => navigate('/episodes/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Erste Episode erfassen
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {episodes.slice(0, 10).map(episode => (
                <div
                  key={episode.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-semibold">
                        Intensität {episode.intensity}/10
                      </div>
                      <div className="text-sm text-slate-600">
                        {format(episode.startTime, 'dd.MM.yyyy HH:mm', {
                          locale: de,
                        })}
                      </div>
                    </div>
                    {episode.triggers.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {episode.triggers.map(trigger => (
                          <span
                            key={trigger}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-700"
                          >
                            {trigger}
                          </span>
                        ))}
                      </div>
                    )}
                    {episode.notes && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-1">
                        {episode.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/episodes/${episode.id}/edit`)}
                      title="Bearbeiten"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(episode.id!)}
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Episode löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die Episode
              wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
