import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import PinSetup from './pages/PinSetup';
import PinUnlock from './pages/PinUnlock';
import { Analytics } from './pages/Analytics';
import GarminPage from './pages/GarminPage';
import EpisodeForm from './features/episodes/EpisodeForm';
import EpisodeDetail from './features/episodes/EpisodeDetail';

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
          <Route path="episodes/new" element={<EpisodeForm />} />
          <Route path="episodes/:id" element={<EpisodeDetail />} />
          <Route path="episodes/:id/edit" element={<EpisodeForm />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="garmin" element={<GarminPage />} />
          <Route
            path="garmin/data"
            element={<Navigate to="/garmin" replace />}
          />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback für unbekannte Routen */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
