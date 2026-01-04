import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isPinSetup, isLocked } from '@/features/auth/pin-service';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [checking, setChecking] = useState(true);
  const [pinSetup, setPinSetup] = useState(false);
  const [locked, setLocked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    async function checkAuth() {
      const [setup, lockStatus] = await Promise.all([isPinSetup(), isLocked()]);

      setPinSetup(setup);
      setLocked(lockStatus);
      setChecking(false);
    }

    checkAuth();
  }, []);

  // Zeige Loading während Check läuft
  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Lade...</p>
        </div>
      </div>
    );
  }

  // Wenn kein PIN gesetzt ist → Umleitung zu PIN Setup
  if (!pinSetup) {
    return <Navigate to="/pin-setup" state={{ from: location }} replace />;
  }

  // Wenn App gesperrt ist → Umleitung zu PIN Unlock
  if (locked) {
    return <Navigate to="/pin-unlock" state={{ from: location }} replace />;
  }

  // Wenn alles OK → Render Children
  return <>{children}</>;
}
