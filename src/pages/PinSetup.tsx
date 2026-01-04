import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, Lock } from 'lucide-react';
import { setupPin } from '@/features/auth/pin-service';
import { toast } from 'sonner';

export default function PinSetup() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin !== confirmPin) {
      toast.error('PINs stimmen nicht überein');
      return;
    }

    setLoading(true);

    try {
      const result = await setupPin(pin);

      if (result.success) {
        toast.success('PIN erfolgreich erstellt');
        navigate('/dashboard');
      } else {
        toast.error(result.error || 'PIN konnte nicht erstellt werden');
      }
    } catch (error) {
      toast.error('Ein Fehler ist aufgetreten');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Willkommen!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Erstelle einen 6-stelligen PIN zum Schutz deiner Daten
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin">PIN (6 Ziffern)</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="text-center text-2xl tracking-widest"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPin">PIN bestätigen</Label>
            <Input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="text-center text-2xl tracking-widest"
              required
              disabled={loading}
            />
          </div>

          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Hinweise zum PIN:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-xs">
                  <li>Genau 6 Ziffern</li>
                  <li>Keine einfachen Muster (123456, 000000, etc.)</li>
                  <li>Merke dir deinen PIN gut!</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || pin.length !== 6 || confirmPin.length !== 6}
          >
            {loading ? 'Wird erstellt...' : 'PIN erstellen'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
