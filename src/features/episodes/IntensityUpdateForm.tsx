import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, TrendingDown, TrendingUp } from 'lucide-react';

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

// Quick-Note Vorschläge
const QUICK_NOTES = [
  'Besser nach Medikament',
  'Verschlechterung',
  'Stabil',
  'Leichte Besserung',
  'Starke Besserung',
  'Nach Schlaf',
  'Nach Ruhe',
  'Nach Koffein',
];

interface IntensityUpdateFormProps {
  currentIntensity: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (intensity: number, note?: string) => Promise<void>;
}

/**
 * IntensityUpdateForm Component
 * Dialog zum schnellen Aktualisieren der Intensität
 */
export function IntensityUpdateForm({
  currentIntensity,
  open,
  onOpenChange,
  onSubmit,
}: IntensityUpdateFormProps) {
  const [intensity, setIntensity] = useState(currentIntensity);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset beim Öffnen
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setIntensity(currentIntensity);
      setNote('');
    }
    onOpenChange(newOpen);
  };

  // Differenz zur aktuellen Intensität
  const diff = intensity - currentIntensity;
  const diffText = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '±0';
  const diffColor = diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-slate-600';

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(intensity, note || undefined);
      toast.success('Intensität aktualisiert');
      onOpenChange(false);
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Intensität aktualisieren
          </DialogTitle>
          <DialogDescription>
            Dokumentiere die aktuelle Schmerzintensität
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Intensität Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Neue Intensität</Label>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${diffColor}`}>
                  {diff !== 0 && (
                    <>
                      {diff < 0 ? <TrendingDown className="inline h-4 w-4 mr-1" /> : <TrendingUp className="inline h-4 w-4 mr-1" />}
                      {diffText}
                    </>
                  )}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-4xl">{INTENSITY_EMOJIS[intensity]}</span>
              <div className="flex-1">
                <Slider
                  value={[intensity]}
                  onValueChange={([val]) => setIntensity(val)}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>
              <span className="text-2xl font-bold w-12 text-center">{intensity}</span>
            </div>

            <div className="flex justify-between text-xs text-slate-500 px-1">
              <span>Minimal</span>
              <span>Moderat</span>
              <span>Maximal</span>
            </div>
          </div>

          {/* Vergleich */}
          <div className="flex items-center justify-center gap-4 p-3 bg-slate-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl">{INTENSITY_EMOJIS[currentIntensity]}</div>
              <div className="text-xs text-slate-600">Vorher: {currentIntensity}</div>
            </div>
            <div className="text-2xl text-slate-400">→</div>
            <div className="text-center">
              <div className="text-2xl">{INTENSITY_EMOJIS[intensity]}</div>
              <div className="text-xs text-slate-600">Neu: {intensity}</div>
            </div>
          </div>

          {/* Quick Notes */}
          <div className="space-y-2">
            <Label>Notiz (optional)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {QUICK_NOTES.slice(0, 6).map((quickNote) => (
                <Button
                  key={quickNote}
                  type="button"
                  variant={note === quickNote ? 'secondary' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setNote(note === quickNote ? '' : quickNote)}
                >
                  {quickNote}
                </Button>
              ))}
            </div>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Eigene Notiz..."
              maxLength={100}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default IntensityUpdateForm;
