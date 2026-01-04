import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, Lock, ShieldAlert } from 'lucide-react';
import {
  verifyPinInput,
  isLocked,
  getRemainingAttempts,
  resetPin,
} from '@/features/auth/pin-service';
import { toast } from 'sonner';

export default function PinUnlock() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  useEffect(() => {
    checkLockStatus();
  }, []);

  const checkLockStatus = async () => {
    const isLockedStatus = await isLocked();
    const remaining = await getRemainingAttempts();
    setLocked(isLockedStatus);
    setAttemptsLeft(remaining);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length !== 6) {
      toast.error('PIN muss 6 Ziffern haben');
      return;
    }

    setLoading(true);

    try {
      const result = await verifyPinInput(pin);

      if (result.success) {
        toast.success('Willkommen zurück!');
        navigate('/dashboard');
      } else {
        toast.error(result.error || 'Falscher PIN');
        setPin('');
        setAttemptsLeft(result.attemptsLeft ?? 0);

        if (result.attemptsLeft === 0) {
          setLocked(true);
        }
      }
    } catch (error) {
      toast.error('Ein Fehler ist aufgetreten');
      console.error(error);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (
      confirm(
        'Möchtest du den PIN wirklich zurücksetzen? Alle Daten bleiben erhalten, aber du musst einen neuen PIN erstellen.'
      )
    ) {
      await resetPin();
      toast.success('PIN wurde zurückgesetzt');
      navigate('/pin-setup');
    }
  };

  if (locked) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-red-50 to-red-100">
        <Card className="w-full max-w-md p-8">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-red-100 p-4">
                <ShieldAlert className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-red-900">Zugang gesperrt</h1>
            <p className="mt-2 text-sm text-red-700">
              Du hast die maximale Anzahl an Versuchen erreicht.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-900">
              <p className="font-medium">Was kannst du tun?</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Warte einen Moment und versuche es erneut</li>
                <li>Setze deinen PIN zurück (Daten bleiben erhalten)</li>
              </ul>
            </div>

            <Button
              onClick={handleReset}
              variant="destructive"
              className="w-full"
            >
              PIN zurücksetzen
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Migräne Tracker</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gib deinen PIN ein, um fortzufahren
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="text-center text-3xl tracking-widest"
              autoFocus
              disabled={loading}
            />
          </div>

          {attemptsLeft < 3 && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Noch <strong>{attemptsLeft}</strong> Versuch
                  {attemptsLeft !== 1 ? 'e' : ''} übrig
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || pin.length !== 6}
            >
              {loading ? 'Wird geprüft...' : 'Entsperren'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={handleReset}
            >
              PIN vergessen?
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
