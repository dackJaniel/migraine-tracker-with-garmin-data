import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import { useEpisode } from '@/hooks/use-episodes';
import { updateEpisodeIntensity, deleteEpisode } from './episode-service';
import { IntensityTimeline } from './IntensityTimeline';
import { IntensityUpdateForm } from './IntensityUpdateForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Clock,
  Pill,
  AlertTriangle,
  Activity,
  Moon,
  Sun,
  FileText,
} from 'lucide-react';

// Symptom Labels
const SYMPTOM_LABELS: Record<string, string> = {
  nausea: 'Übelkeit',
  vomiting: 'Erbrechen',
  fatigue: 'Müdigkeit',
  vertigo: 'Schwindel',
  photophobia: 'Lichtempfindlichkeit',
  phonophobia: 'Lärmempfindlichkeit',
  aura: 'Aura',
  visualDisturbance: 'Sehstörungen',
  concentration: 'Konzentrationsprobleme',
  tinglingNumbness: 'Kribbeln/Taubheit',
  speechDifficulty: 'Sprachschwierigkeiten',
  neckPain: 'Nackenschmerzen',
};

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

/**
 * Formatiert die Dauer einer Episode
 */
function formatDuration(startTime: string, endTime?: string): string {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();

  const hours = differenceInHours(end, start);
  const minutes = differenceInMinutes(end, start) % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} Minuten`;
}

/**
 * EpisodeDetail Component
 * Zeigt alle Details einer Episode inkl. Intensitätsverlauf
 */
export default function EpisodeDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const episode = useEpisode(id ? parseInt(id) : undefined);

  const [showIntensityUpdate, setShowIntensityUpdate] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Episode nicht gefunden
  if (id && !episode) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Episode nicht gefunden
            </h2>
            <p className="text-slate-600 mb-4">
              Die Episode mit ID {id} existiert nicht.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zum Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-pulse">Laden...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Aktive Symptome sammeln
  const activeSymptoms = Object.entries(episode.symptoms || {})
    .filter(([key, value]) => value === true && key !== 'custom')
    .map(([key]) => SYMPTOM_LABELS[key] || key);

  const customSymptoms = episode.symptoms?.custom || [];
  const allSymptoms = [...activeSymptoms, ...customSymptoms];

  // Ist die Episode noch aktiv?
  const isOngoing = !episode.endTime;

  // Handler für Intensitäts-Update
  const handleIntensityUpdate = async (newIntensity: number, note?: string) => {
    await updateEpisodeIntensity(episode.id!, newIntensity, note);
  };

  // Handler für Löschen
  const handleDelete = async () => {
    try {
      await deleteEpisode(episode.id!);
      toast.success('Episode gelöscht');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Fehler beim Löschen');
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/episodes/${episode.id}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Bearbeiten
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Löschen
          </Button>
        </div>
      </div>

      {/* Main Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <span className="text-4xl">
                {INTENSITY_EMOJIS[episode.intensity]}
              </span>
              <div>
                <div className="text-2xl">
                  Intensität {episode.intensity}/10
                </div>
                <div className="text-sm font-normal text-slate-600">
                  {format(new Date(episode.startTime), 'EEEE, dd. MMMM yyyy', {
                    locale: de,
                  })}
                </div>
              </div>
            </CardTitle>
            <Badge
              variant={isOngoing ? 'destructive' : 'secondary'}
              className="text-sm"
            >
              {isOngoing ? 'Aktiv' : 'Beendet'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Zeitinfo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <Sun className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-xs text-slate-600">Start</div>
                <div className="font-semibold">
                  {format(new Date(episode.startTime), 'HH:mm', { locale: de })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <Moon className="h-5 w-5 text-indigo-500" />
              <div>
                <div className="text-xs text-slate-600">Ende</div>
                <div className="font-semibold">
                  {episode.endTime
                    ? format(new Date(episode.endTime), 'HH:mm', { locale: de })
                    : '-'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-xs text-slate-600">Dauer</div>
                <div className="font-semibold">
                  {formatDuration(episode.startTime, episode.endTime)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <Activity className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-xs text-slate-600">Updates</div>
                <div className="font-semibold">
                  {episode.intensityHistory?.length || 1}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intensity Update Button (nur für aktive Episoden) */}
      {isOngoing && (
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={() => setShowIntensityUpdate(true)}
        >
          <Plus className="h-5 w-5" />
          Intensität aktualisieren
        </Button>
      )}

      {/* Intensity Timeline */}
      {episode.intensityHistory && episode.intensityHistory.length > 0 && (
        <IntensityTimeline
          history={episode.intensityHistory}
          startTime={episode.startTime}
          endTime={episode.endTime}
          showChart={episode.intensityHistory.length > 1}
        />
      )}

      {/* Triggers */}
      {episode.triggers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5" />
              Trigger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {episode.triggers.map(trigger => (
                <Badge key={trigger} variant="outline" className="text-sm">
                  {trigger}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medicines */}
      {episode.medicines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pill className="h-5 w-5" />
              Medikamente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {episode.medicines.map(medicine => (
                <Badge key={medicine} variant="secondary" className="text-sm">
                  {medicine}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Symptoms */}
      {allSymptoms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Symptome
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {allSymptoms.map(symptom => (
                <Badge
                  key={symptom}
                  variant="outline"
                  className="text-sm bg-red-50"
                >
                  {symptom}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {episode.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Notizen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 whitespace-pre-wrap">
              {episode.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card className="bg-slate-50">
        <CardContent className="py-4">
          <div className="flex justify-between text-xs text-slate-500">
            <span>
              Erstellt:{' '}
              {format(new Date(episode.createdAt), 'dd.MM.yyyy HH:mm', {
                locale: de,
              })}
            </span>
            <span>
              Aktualisiert:{' '}
              {format(new Date(episode.updatedAt), 'dd.MM.yyyy HH:mm', {
                locale: de,
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Intensity Update Dialog */}
      <IntensityUpdateForm
        currentIntensity={episode.intensity}
        open={showIntensityUpdate}
        onOpenChange={setShowIntensityUpdate}
        onSubmit={handleIntensityUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Episode löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die Episode und
              ihr gesamter Intensitätsverlauf werden dauerhaft gelöscht.
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
