import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { getAllAreas, addUserArea, getServerRiskFor } from '../lib/areas';
import { useAreaSeries } from '../lib/useAreaSeries';
import { assessArea } from '../lib/risk';
import WorldMap, { type MapPoint } from '../components/WorldMap';
import AddAreaModal from '../components/AddAreaModal';
import type { MonitoringArea } from '../types';
import './WorldMapPage.css';

export default function WorldMapPage() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const areas = useMemo(() => getAllAreas(), [refreshKey]);
  const [filter, setFilter] = useState<'all' | 'low' | 'moderate' | 'high' | 'insufficient'>('all');
  const [pickMode, setPickMode] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lon: number } | null>(null);

  const allPoints: MapPoint[] = useMemo(
    () =>
      areas.map((area) => {
        const server = getServerRiskFor(area.id);
        const risk = server
          ? {
              level: server.level,
              headline:
                server.level === 'insufficient'
                  ? 'Insufficient observations for a reliable assessment.'
                  : server.level === 'high'
                  ? 'Severe vegetation decline detected at the last server scan.'
                  : server.level === 'moderate'
                  ? 'Material vegetation decline — investigate potential causes.'
                  : 'Vegetation appears broadly stable over the assessment window.',
              evidence: [],
              alternativeExplanations: [],
              recommendedActions: [],
              computedAt: server.lastScanAt,
              basedOn: 'observations' as const,
            }
          : assessArea(area);
        const ndvi = area.series.find((s) => s.indicator === 'NDVI');
        const usable = ndvi?.observations.filter((o) => o.value != null) ?? [];
        const latest = usable.length ? usable.reduce((a, b) => (a.date > b.date ? a : b)) : undefined;
        return { area, risk, latestObservationDate: latest?.date };
      }),
    [areas],
  );

  const points = filter === 'all' ? allPoints : allPoints.filter((p) => p.risk.level === filter);

  function onAreaCreated(area: MonitoringArea) {
    addUserArea(area);
    setPicked(null);
    setPickMode(false);
    setRefreshKey((k) => k + 1);
    navigate(`/area/${area.id}`);
  }

  return (
    <div className="ig-container map-page">
      <header className="map-head">
        <h1>World map</h1>
        <p className="ig-muted">
          Click any point on the map to define a new monitoring area. Real Sentinel-2 NDVI
          and NASA POWER rainfall will be fetched for that coordinate.
        </p>
      </header>

      <MapSeriesHydrator areas={areas} />

      <div className="map-toolbar card">
        <button
          className={'map-chip map-chip-add' + (pickMode ? ' is-active' : '')}
          onClick={() => { setPickMode((m) => !m); setPicked(null); }}
        >
          {pickMode ? <><X size={12} /> Cancel pick</> : <><Plus size={12} /> Add monitoring area</>}
        </button>

        <span className="ig-muted" style={{ marginLeft: 'var(--ig-space-4)' }}>Filter:</span>
        {(['all', 'low', 'moderate', 'high', 'insufficient'] as const).map((f) => (
          <button
            key={f}
            className={'map-chip' + (filter === f ? ' is-active' : '')}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span className="ig-soft" style={{ marginLeft: 'auto' }}>
          {points.length} of {allPoints.length} shown
        </span>
      </div>

      {pickMode && (
        <div className="map-pick-hint">
          Click anywhere on the map to choose a coordinate.
        </div>
      )}

      <div className="card map-full">
        <WorldMap
          points={points}
          height="640px"
          onSelect={(id) => navigate(`/area/${id}`)}
          pickMode={pickMode}
          onPick={(lat, lon) => setPicked({ lat, lon })}
        />
      </div>

      {picked && (
        <AddAreaModal
          latitude={picked.lat}
          longitude={picked.lon}
          onCancel={() => setPicked(null)}
          onCreated={onAreaCreated}
        />
      )}
    </div>
  );
}

/**
 * Quietly hydrates series for every area shown on the map page. Renders
 * nothing. The fetched series are cached, and reopening the map will use them.
 */
function MapSeriesHydrator({ areas }: { areas: ReturnType<typeof getAllAreas> }) {
  return (
    <>
      {areas.map((a) => (
        <MapHydrateOne key={a.id} area={a} />
      ))}
    </>
  );
}
function MapHydrateOne({ area }: { area: ReturnType<typeof getAllAreas>[number] }) {
  useAreaSeries(area, true);
  return null;
}
