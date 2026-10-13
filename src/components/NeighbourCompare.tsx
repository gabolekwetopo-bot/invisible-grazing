// =============================================================================
// INVISIBLE GRAZING — Neighbour comparison
// =============================================================================
// Side-by-side NDVI comparison of the selected area against the nearest
// monitoring areas (excluding the seed defaults that are far away). Highlights
// whether a decline is local or regional.
// =============================================================================

import { useMemo } from 'react';
import { useAreaSeries } from '../lib/useAreaSeries';
import { Link } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import type { MonitoringArea, RiskAssessment } from '../types';
import { getAllAreas } from '../lib/areas';
import { assessArea } from '../lib/risk';
import { formatLatLon } from '../lib/format';
import RiskBadge from './RiskBadge';
import TimeSeriesChart from './TimeSeriesChart';
import './NeighbourCompare.css';

interface Props {
  area: MonitoringArea;
  onClose: () => void;
}

interface Compared {
  area: MonitoringArea;
  risk: RiskAssessment;
  distanceKm: number;
}

/** Great-circle distance in km. */
function distanceKm(a: MonitoringArea, b: MonitoringArea): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function NeighbourCompare({ area, onClose }: Props) {
  const neighbours: Compared[] = useMemo(() => {
    const all = getAllAreas();
    return all
      .filter((a) => a.id !== area.id)
      .map((a) => ({ area: a, risk: assessArea(a), distanceKm: distanceKm(area, a) }))
      .filter((n) => n.distanceKm <= 2000)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);
  }, [area]);

  const ndvi = area.series.find((s) => s.indicator === 'NDVI');

  return (
    <section className="compare-panel">
      <div className="compare-head">
        <div>
          <h2>Comparison with neighbouring areas</h2>
          <p className="ig-muted">
            The same risk engine and the same chart, applied to nearby monitoring areas.
            If decline appears across several neighbours, the cause is more likely
            regional than local.
          </p>
        </div>
        <button className="compare-close" onClick={onClose} aria-label="Close comparison">
          <X size={16} />
        </button>
      </div>

      <div className="compare-grid">
        <div className="compare-cell">
          <header className="compare-cell-head">
            <div>
              <div className="compare-cell-name">{area.name}</div>
              <div className="compare-cell-meta">
                {formatLatLon(area.latitude, area.longitude)} · selected
              </div>
            </div>
            <RiskBadge level={assessArea(area).level} />
          </header>
          <TimeSeriesChart ndvi={ndvi} height={220} />
        </div>

        {neighbours.map((n) => (
          <NeighbourCell key={n.area.id} neighbour={n} />
        ))}

        {neighbours.length === 0 && (
          <div className="compare-cell compare-none">
            No other monitoring areas within 2,000 km. Add a nearby area to enable
            comparison.
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * One neighbour panel. If the neighbour already carries a series it renders
 * immediately. If it does not, useAreaSeries queues a fetch from Sentinel-2 and
 * NASA POWER and the chart renders as soon as the response arrives.
 */
function NeighbourCell({ neighbour }: { neighbour: Compared }) {
  const { hydrated, loading, empty } = useAreaSeries(neighbour.area, true);
  const display = hydrated ?? neighbour.area;
  const ndvi = display.series.find((s: { indicator: string }) => s.indicator === 'NDVI');

  return (
    <div className="compare-cell">
      <header className="compare-cell-head">
        <div>
          <div className="compare-cell-name">{display.name}</div>
          <div className="compare-cell-meta">
            {formatLatLon(display.latitude, display.longitude)} ·{' '}
            {neighbour.distanceKm.toFixed(0)} km away
          </div>
        </div>
        <RiskBadge level={neighbour.risk.level} />
      </header>
      {ndvi ? (
        <TimeSeriesChart ndvi={ndvi} height={220} />
      ) : loading ? (
        <div className="compare-empty compare-loading">
          <span className="compare-spinner" />
          Fetching observations from Sentinel-2…
        </div>
      ) : empty ? (
        <div className="compare-empty">
          The source returned no clear observations for this coordinate in the
          observation window.
        </div>
      ) : (
        <div className="compare-empty">Loading…</div>
      )}
      <Link to={`/area/${display.id}`} className="compare-cell-link">
        Open investigation <ArrowRight size={12} />
      </Link>
    </div>
  );
}
