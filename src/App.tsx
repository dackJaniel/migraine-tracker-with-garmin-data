import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import PinSetup from './pages/PinSetup';
import PinUnlock from './pages/PinUnlock';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes: PIN Setup & Unlock */}
        <Route path="/pin-setup" element={<PinSetup />} />
        <Route path="/pin-unlock" element={<PinUnlock />} />

        {/* Protected Routes: Main App */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          {/* TODO: Weitere Routes später hinzufügen
          <Route path="episodes/new" element={<EpisodeForm />} />
          <Route path="episodes/:id/edit" element={<EpisodeForm />} />
          <Route path="analytics" element={<Analytics />} />
          */}
        </Route>

        {/* Fallback für unbekannte Routen */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
