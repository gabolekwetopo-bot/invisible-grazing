import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import WorldMapPage from './pages/WorldMapPage';
import AreaInvestigation from './pages/AreaInvestigation';
import Reports from './pages/Reports';
import About from './pages/About';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<WorldMapPage />} />
          <Route path="area/:id" element={<AreaInvestigation />} />
          <Route path="reports" element={<Reports />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
