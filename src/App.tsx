import { useEffect } from 'react';
import { useServerState } from './lib/serverState';
import { setServerAreas } from './lib/areas';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Hero from './pages/Hero';
import WarRoom from './pages/WarRoom';
import Dashboard from './pages/Dashboard';
import WorldMapPage from './pages/WorldMapPage';
import AreaInvestigation from './pages/AreaInvestigation';
import ReportView from './pages/ReportView';
import Reports from './pages/Reports';
import About from './pages/About';


/** Scrolls to the top of the page whenever the route changes. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

/** Pulls server-scanned watchlist sites into the areas cache on every refresh. */
function ServerStateBridge() {
  const { state } = useServerState();
  useEffect(() => {
    if (!state.areas.length) return;
    setServerAreas(
      state.areas.map((a) => ({
        areaId: a.areaId,
        areaName: a.areaName,
        region: a.region,
        latitude: a.latitude,
        longitude: a.longitude,
        radiusKm: a.radiusKm,
        lastRiskLevel: a.lastRiskLevel,
        lastScanAt: a.lastScanAt,
        lastAlertAt: a.lastAlertAt,
      })),
    );
  }, [state]);
  return null;
}
export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <ServerStateBridge />
      <Routes>
        {/* Hero is its own full-bleed screen — no app chrome */}
        <Route path="/" element={<Hero />} />

        {/* Everything else lives inside the app shell */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/map" element={<WorldMapPage />} />
          <Route path="/area/:id" element={<AreaInvestigation />} />
          <Route path="/area/:id/report" element={<ReportView />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/about" element={<About />} />
          <Route path="/warroom" element={<WarRoom />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
