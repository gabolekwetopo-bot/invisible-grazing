// =============================================================================
// INVISIBLE GRAZING — Dashboard
// =============================================================================
// Global overview: metric cards, map, alerts, and a short methodology note.
// Every number is derived from real areas or clearly labelled demonstrations.
// =============================================================================

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CircleCheckBig, CircleHelp, TrendingDown, Globe2, Activity } from 'lucide-react';
import { getAllAreas } from '../lib/areas';
import { assessArea, deriveAlert } from '../lib/risk';
import { formatDate } from '../lib/format';
import RiskBadge from '../components/RiskBadge';
import WorldMap, { type MapPoint } from '../components/WorldMap';
import './Dashboard.css';

export default function Dashboard() {
  const areas = getAllAreas();

  const points: MapPoint[] = useMemo(
    () =>
      areas.map((area) => {
        const risk = assessArea(area);
        const ndvi = area.series.find((s) => s.indicator === 'NDVI');
        const usable = ndvi?.observations.filter((o) => o.value != null) ?? [];
        const latest = usable.length
          ? usable.reduce((a, b) => (a.date > b.date ? a : b))
          : undefined;
        return { area, risk, latestObservationDate: latest?.date };
      }),
    [areas],
  );

  const alerts = useMemo(
    () =>
      areas
        .map((a) => deriveAlert(a))
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => b.asOf.localeCompare(a.asOf)),
    [areas],
  );

  const totals = useMemo(() => {
    let high = 0;
    let moderate = 0;
    let low = 0;
    let insufficient = 0;
    let declining = 0;
    let latestDate: string | undefined;

    for (const p of points) {
      switch (p.risk.level) {
        case 'high': high++; break;
        case 'moderate': moderate++; break;
        case 'low': low++; break;
        case 'insufficient': insufficient++; break;
      }
      const ndvi = p.area.series.find((s) => s.indicator === 'NDVI');
      const usable = ndvi?.observations.filter((o) => o.value != null) ?? [];
      if (usable.length >= 2) {
        const sorted = [...usable].sort((a, b) => a.date.localeCompare(b.date));
        const first = sorted[Math.max(0, sorted.length - 12)];
        const last = sorted[sorted.length - 1];
        if (first.value != null && last.value != null && last.value - first.value < -0.03) declining++;
      }
      if (p.latestObservationDate) {
        if (!latestDate || p.latestObservationDate > latestDate) latestDate = p.latestObservationDate;
      }
    }
    return { high, moderate, low, insufficient, declining, latestDate };
  }, [points]);

  return (
    <div className="ig-container dashboard">
      <header className="dashboard-intro">
        <h1>Global intelligence dashboard</h1>
        <p className="ig-muted">
          Satellite-derived environmental observations that identify vegetation changes
          and highlight areas that may require grazing-pressure investigation.
        </p>
      </header>

      <section className="metric-grid" aria-label="Key metrics">
        <MetricCard
          icon={<Globe2 size={18} />}
          label="Monitoring areas"
          value={areas.length.toString()}
          hint={`${areas.filter((a) => a.demonstration).length} labelled demonstrations`}
        />
        <MetricCard
          icon={<AlertTriangle size={18} />}
          label="Requiring investigation"
          value={(totals.high + totals.moderate).toString()}
          hint={`${totals.high} high · ${totals.moderate} moderate`}
          tone={totals.high > 0 ? 'warn' : 'default'}
        />
        <MetricCard
          icon={<TrendingDown size={18} />}
          label="Declining vegetation trends"
          value={totals.declining.toString()}
          hint="Last 12 usable observations vs prior"
        />
        <MetricCard
          icon={<CircleHelp size={18} />}
          label="Insufficient observations"
          value={totals.insufficient.toString()}
          hint="Returned as 'Insufficient Data' rather than guessed"
        />
        <MetricCard
          icon={<Activity size={18} />}
          label="Latest observation in dataset"
          value={formatDate(totals.latestDate)}
          hint="Across all configured areas"
        />
        <MetricCard
          icon={<CircleCheckBig size={18} />}
          label="Stable / improving"
          value={totals.low.toString()}
          hint="No material decline detected"
        />
      </section>

      <section className="dashboard-main">
        <div className="dashboard-map card">
          <div className="card-head">
            <h2>World map</h2>
            <span className="ig-muted">Click a marker to open its investigation.</span>
          </div>
          <WorldMap points={points} height="480px" />
          <Legend />
        </div>

        <aside className="dashboard-alerts card">
          <div className="card-head">
            <h2>Early-warning alerts</h2>
            <span className="ig-muted">Derived from real or labelled demonstration series.</span>
          </div>
          {alerts.length === 0 ? (
            <p className="ig-muted" style={{ padding: 'var(--ig-space-4)' }}>
              No alerts. Alerts are only raised when observations are sufficient and a
              material change is detected.
            </p>
          ) : (
            <ul className="alert-list">
              {alerts.slice(0, 6).map((a) => (
                <li key={a.id} className="alert-item">
                  <div className="alert-head">
                    <RiskBadge level={a.risk} />
                  </div>
                  <div className="alert-title">{a.title}</div>
                  <div className="alert-area">
                    <Link to={`/area/${a.areaId}`}>{a.areaName}</Link>
                  </div>
                  <div className="alert-summary ig-muted">{a.summary}</div>
                  <div className="alert-meta ig-soft">
                    {a.observationPeriod} · as of {formatDate(a.asOf)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      <section className="dashboard-method card">
        <div className="card-head">
          <h2>How to read this dashboard</h2>
        </div>
        <div className="method-grid">
          <div>
            <h3>1. Observed vegetation change</h3>
            <p className="ig-muted">
              Measured from satellite-derived vegetation indices (NDVI). We never infer
              the cause from NDVI alone.
            </p>
          </div>
          <div>
            <h3>2. Potential grazing-pressure warning</h3>
            <p className="ig-muted">
              A transparent rules-based screen. Vegetation decline can result from
              drought, fire, cultivation, pests, seasonal change, and other drivers.
            </p>
          </div>
          <div>
            <h3>3. Confirmed grazing activity</h3>
            <p className="ig-muted">
              Not claimed by this MVP. Confirmation requires independent field evidence,
              which the platform is designed to accept in future.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon, label, value, hint, tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warn';
}) {
  return (
    <div className={`metric-card card ${tone === 'warn' ? 'is-warn' : ''}`}>
      <div className="metric-head">
        <span className="metric-icon">{icon}</span>
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value">{value}</div>
      {hint && <div className="metric-hint ig-soft">{hint}</div>}
    </div>
  );
}

function Legend() {
  const items = [
    { c: 'var(--ig-risk-low)', label: 'Low' },
    { c: 'var(--ig-risk-mod)', label: 'Moderate' },
    { c: 'var(--ig-risk-high)', label: 'High' },
    { c: 'var(--ig-risk-insuf)', label: 'Insufficient Data' },
  ];
  return (
    <div className="map-legend">
      <span className="ig-muted">Risk level:</span>
      {items.map((i) => (
        <span key={i.label} className="legend-item">
          <span className="legend-dot" style={{ background: i.c }} />
          {i.label}
        </span>
      ))}
      <span className="legend-item">
        <span className="legend-dot dashed" />
        Dashed ring = demonstration scenario
      </span>
    </div>
  );
}
