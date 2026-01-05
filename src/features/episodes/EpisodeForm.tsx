import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  createEpisode,
  updateEpisode,
  getAllTriggers,
  getAllMedicines,
} from '@/features/episodes/episode-service';
import { useEpisode } from '@/hooks/use-episodes';
import {
  episodeSchema,
  DEFAULT_SYMPTOMS,
  isNightTime,
  SLEEP_QUALITY_LABELS,
  type EpisodeFormData,
} from './episode-schema';
import { saveCustomSymptoms } from './symptom-service';
import SymptomSelector from './SymptomSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  CalendarIcon,
  Plus,
  X,
  Save,
  ArrowLeft,
  Moon,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Vordefinierte Trigger
const COMMON_TRIGGERS = [
  'Stress',
  'Schlafmangel',
  'Alkohol',
  'Koffein',
  'Wetter',
  'Bildschirmarbeit',
  'Lärm',
  'Hunger',
  'Dehydration',
];

// Vordefinierte Medikamente
const COMMON_MEDICINES = [
  'Ibuprofen 400mg',
  'Ibuprofen 600mg',
  'Paracetamol 500mg',
  'Aspirin 500mg',
  'Sumatriptan 50mg',
  'Sumatriptan 100mg',
];

export default function EpisodeForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const existingEpisode = useEpisode(id ? parseInt(id) : undefined);

  const [availableTriggers, setAvailableTriggers] = useState<string[]>([]);
  const [availableMedicines, setAvailableMedicines] = useState<string[]>([]);
  const [customTrigger, setCustomTrigger] = useState('');
  const [customMedicine, setCustomMedicine] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EpisodeFormData>({
    resolver: zodResolver(episodeSchema),
    defaultValues: {
      startTime: new Date(),
      endTime: null,
      intensity: 5,
      triggers: [],
      medicines: [],
      symptoms: DEFAULT_SYMPTOMS,
      notes: '',
      isOngoing: false,
      // Night-Onset Tracking (PAKET 10)
      nightOnset: false,
      wokeUpWithMigraine: false,
      sleepQualityBefore: null,
    },
  });

  const intensity = watch('intensity');
  const triggers = watch('triggers');
  const medicines = watch('medicines');
  const isOngoing = watch('isOngoing');
  const startTime = watch('startTime');
  const nightOnset = watch('nightOnset');
  const wokeUpWithMigraine = watch('wokeUpWithMigraine');

  // Lade vorhandene Trigger und Medikamente
  useEffect(() => {
    async function loadData() {
      const [existingTriggers, existingMedicines] = await Promise.all([
        getAllTriggers(),
        getAllMedicines(),
      ]);

      // Kombiniere vordefinierte mit vorhandenen
      const allTriggers = Array.from(
        new Set([...COMMON_TRIGGERS, ...existingTriggers])
      );
      const allMedicines = Array.from(
        new Set([...COMMON_MEDICINES, ...existingMedicines])
      );

      setAvailableTriggers(allTriggers);
      setAvailableMedicines(allMedicines);
    }

    loadData();
  }, []);

  // Lade Episode-Daten im Edit-Modus
  useEffect(() => {
    if (isEditMode && existingEpisode) {
      setValue('startTime', new Date(existingEpisode.startTime));
      setValue(
        'endTime',
        existingEpisode.endTime ? new Date(existingEpisode.endTime) : null
      );
      setValue('intensity', existingEpisode.intensity);
      setValue('triggers', existingEpisode.triggers);
      setValue('medicines', existingEpisode.medicines);
      setValue('symptoms', existingEpisode.symptoms);
      setValue('notes', existingEpisode.notes || '');
      setValue('isOngoing', !existingEpisode.endTime);
      // Night-Onset Tracking (PAKET 10)
      setValue('nightOnset', existingEpisode.nightOnset || false);
      setValue(
        'wokeUpWithMigraine',
        existingEpisode.wokeUpWithMigraine || false
      );
      setValue(
        'sleepQualityBefore',
        existingEpisode.sleepQualityBefore || null
      );
    }
  }, [isEditMode, existingEpisode, setValue]);

  // Handle Ongoing Toggle
  useEffect(() => {
    if (isOngoing) {
      setValue('endTime', null);
    }
  }, [isOngoing, setValue]);

  // Auto-Detect Night Onset (PAKET 10)
  useEffect(() => {
    if (startTime && !isEditMode) {
      const isNight = isNightTime(startTime);
      if (isNight && !nightOnset) {
        // Schlägt automatisch vor, nightOnset zu aktivieren
        setValue('nightOnset', true);
      }
    }
  }, [startTime, isEditMode, nightOnset, setValue]);

  const onSubmit = async (data: EpisodeFormData) => {
    setLoading(true);
    try {
      // Initiales IntensityHistory erstellen (PAKET 9)
      const initialIntensityHistory = [
        {
          timestamp: data.startTime.toISOString(),
          intensity: data.intensity,
          note: 'Initial',
        },
      ];

      const episodeData = {
        startTime: data.startTime.toISOString(),
        endTime: data.endTime ? data.endTime.toISOString() : undefined,
        intensity: data.intensity,
        intensityHistory: initialIntensityHistory, // PAKET 9
        triggers: data.triggers,
        medicines: data.medicines,
        symptoms: data.symptoms,
        notes: data.notes || undefined,
        // Night-Onset Tracking (PAKET 10)
        nightOnset: data.nightOnset || false,
        nightEnd: data.endTime ? isNightTime(data.endTime) : false,
        wokeUpWithMigraine: data.wokeUpWithMigraine || false,
        sleepQualityBefore: data.sleepQualityBefore || undefined,
      };

      // Speichere Custom-Symptome für zukünftige Autocomplete (PAKET 8)
      if (data.symptoms.custom && data.symptoms.custom.length > 0) {
        await saveCustomSymptoms(data.symptoms.custom);
      }

      if (isEditMode && id) {
        // Bei Edit: IntensityHistory nicht überschreiben, nur andere Felder updaten
        const { intensityHistory, ...updateData } = episodeData;
        await updateEpisode(parseInt(id), updateData);
        toast.success('Episode aktualisiert');
      } else {
        await createEpisode(episodeData);
        toast.success('Episode erstellt');
      }

      navigate('/dashboard');
    } catch (error) {
      toast.error('Fehler beim Speichern der Episode');
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTrigger = (trigger: string) => {
    if (trigger && !triggers.includes(trigger)) {
      setValue('triggers', [...triggers, trigger]);
    }
  };

  const removeTrigger = (trigger: string) => {
    setValue(
      'triggers',
      triggers.filter(t => t !== trigger)
    );
  };

  const addCustomTrigger = () => {
    if (customTrigger.trim()) {
      addTrigger(customTrigger.trim());
      setCustomTrigger('');
    }
  };

  const addMedicine = (medicine: string) => {
    if (medicine && !medicines.includes(medicine)) {
      setValue('medicines', [...medicines, medicine]);
    }
  };

  const removeMedicine = (medicine: string) => {
    setValue(
      'medicines',
      medicines.filter(m => m !== medicine)
    );
  };

  const addCustomMedicine = () => {
    if (customMedicine.trim()) {
      addMedicine(customMedicine.trim());
      setCustomMedicine('');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isEditMode ? 'Episode bearbeiten' : 'Neue Episode'}
          </h1>
          <p className="text-slate-600 mt-1">
            Erfasse Details zu deiner Migräne-Episode
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Zeitraum */}
        <Card>
          <CardHeader>
            <CardTitle>Zeitraum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Startzeit */}
            <div className="space-y-2">
              <Label htmlFor="startTime">Startzeit *</Label>
              <Controller
                name="startTime"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'flex-1 justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, 'dd.MM.yyyy', { locale: de })
                          ) : (
                            <span>Datum wählen</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={date => {
                            if (date) {
                              const newDate = new Date(field.value);
                              newDate.setFullYear(
                                date.getFullYear(),
                                date.getMonth(),
                                date.getDate()
                              );
                              field.onChange(newDate);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={format(field.value, 'HH:mm')}
                      onChange={e => {
                        const [hours, minutes] = e.target.value.split(':');
                        const newDate = new Date(field.value);
                        newDate.setHours(parseInt(hours), parseInt(minutes));
                        field.onChange(newDate);
                      }}
                      className="w-32"
                    />
                  </div>
                )}
              />
              {errors.startTime && (
                <p className="text-sm text-red-600">
                  {errors.startTime.message}
                </p>
              )}
            </div>

            {/* Noch aktiv Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="isOngoing">Noch aktiv</Label>
              <Controller
                name="isOngoing"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="isOngoing"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Endzeit (nur wenn nicht aktiv) */}
            {!isOngoing && (
              <div className="space-y-2">
                <Label htmlFor="endTime">Endzeit</Label>
                <Controller
                  name="endTime"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'flex-1 justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, 'dd.MM.yyyy', { locale: de })
                            ) : (
                              <span>Datum wählen</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={date => {
                              if (date) {
                                const currentTime = field.value || new Date();
                                const newDate = new Date(currentTime);
                                newDate.setFullYear(
                                  date.getFullYear(),
                                  date.getMonth(),
                                  date.getDate()
                                );
                                field.onChange(newDate);
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        type="time"
                        value={field.value ? format(field.value, 'HH:mm') : ''}
                        onChange={e => {
                          const [hours, minutes] = e.target.value.split(':');
                          const newDate = field.value || new Date();
                          newDate.setHours(parseInt(hours), parseInt(minutes));
                          field.onChange(newDate);
                        }}
                        className="w-32"
                      />
                    </div>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nacht-Tracking (PAKET 10) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Nacht-Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Auto-Detect Hinweis */}
            {isNightTime(startTime) && (
              <div className="bg-slate-100 p-3 rounded-lg text-sm text-slate-600">
                <p>Die Startzeit liegt zwischen 22:00 und 06:00 Uhr (Nacht).</p>
              </div>
            )}

            {/* Nacht-Beginn */}
            <Controller
              name="nightOnset"
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="nightOnset">
                      Während der Nacht begonnen
                    </Label>
                    <p className="text-xs text-slate-500">22:00 - 06:00 Uhr</p>
                  </div>
                  <Switch
                    id="nightOnset"
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />

            {/* Mit Migräne aufgewacht */}
            <Controller
              name="wokeUpWithMigraine"
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="wokeUpWithMigraine">
                      Mit Migräne aufgewacht
                    </Label>
                    <p className="text-xs text-slate-500">
                      Migräne war beim Aufwachen bereits da
                    </p>
                  </div>
                  <Switch
                    id="wokeUpWithMigraine"
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />

            {/* Schlafqualität vor Episode */}
            {(nightOnset || wokeUpWithMigraine) && (
              <div className="space-y-3">
                <Label>Schlafqualität vor der Episode</Label>
                <Controller
                  name="sleepQualityBefore"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <div className="flex justify-between gap-2">
                        {[1, 2, 3, 4, 5].map(rating => (
                          <Button
                            key={rating}
                            type="button"
                            variant={
                              field.value === rating ? 'default' : 'outline'
                            }
                            size="sm"
                            className="flex-1 flex-col h-auto py-2"
                            onClick={() =>
                              field.onChange(
                                field.value === rating ? null : rating
                              )
                            }
                          >
                            <div className="flex">
                              {Array.from({ length: rating }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    'h-3 w-3',
                                    field.value === rating
                                      ? 'fill-white text-white'
                                      : 'fill-yellow-400 text-yellow-400'
                                  )}
                                />
                              ))}
                            </div>
                          </Button>
                        ))}
                      </div>
                      {field.value && (
                        <p className="text-sm text-center text-slate-600">
                          {SLEEP_QUALITY_LABELS[field.value]}
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Intensität */}
        <Card>
          <CardHeader>
            <CardTitle>Intensität *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-4xl">{INTENSITY_EMOJIS[intensity]}</span>
              <span className="text-3xl font-bold">{intensity}/10</span>
            </div>
            <Controller
              name="intensity"
              control={control}
              render={({ field }) => (
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[field.value]}
                  onValueChange={([value]) => field.onChange(value)}
                  className="py-4"
                />
              )}
            />
            {errors.intensity && (
              <p className="text-sm text-red-600">{errors.intensity.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Trigger */}
        <Card>
          <CardHeader>
            <CardTitle>Trigger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Trigger Auswahl */}
            <div className="space-y-2">
              <Label>Trigger hinzufügen</Label>
              <Select onValueChange={addTrigger}>
                <SelectTrigger>
                  <SelectValue placeholder="Trigger auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTriggers.map(trigger => (
                    <SelectItem key={trigger} value={trigger}>
                      {trigger}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Trigger */}
            <div className="flex gap-2">
              <Input
                placeholder="Eigener Trigger..."
                value={customTrigger}
                onChange={e => setCustomTrigger(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTrigger();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addCustomTrigger}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Ausgewählte Trigger */}
            {triggers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {triggers.map(trigger => (
                  <Badge key={trigger} variant="secondary" className="gap-1">
                    {trigger}
                    <button
                      type="button"
                      onClick={() => removeTrigger(trigger)}
                      className="hover:bg-slate-300 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medikamente */}
        <Card>
          <CardHeader>
            <CardTitle>Medikamente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Medikament Auswahl */}
            <div className="space-y-2">
              <Label>Medikament hinzufügen</Label>
              <Select onValueChange={addMedicine}>
                <SelectTrigger>
                  <SelectValue placeholder="Medikament auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {availableMedicines.map(medicine => (
                    <SelectItem key={medicine} value={medicine}>
                      {medicine}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Medikament */}
            <div className="flex gap-2">
              <Input
                placeholder="Eigenes Medikament..."
                value={customMedicine}
                onChange={e => setCustomMedicine(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomMedicine();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addCustomMedicine}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Ausgewählte Medikamente */}
            {medicines.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {medicines.map(medicine => (
                  <Badge key={medicine} variant="secondary" className="gap-1">
                    {medicine}
                    <button
                      type="button"
                      onClick={() => removeMedicine(medicine)}
                      className="hover:bg-slate-300 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Symptome (PAKET 8: Erweiterte Symptom-Erfassung) */}
        <SymptomSelector control={control} setValue={setValue} />

        {/* Notizen */}
        <Card>
          <CardHeader>
            <CardTitle>Notizen</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  placeholder="Weitere Details zur Episode..."
                  rows={4}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="flex-1"
          >
            Abbrechen
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {loading
              ? 'Speichert...'
              : isEditMode
                ? 'Aktualisieren'
                : 'Erstellen'}
          </Button>
        </div>
      </form>
    </div>
  );
}
