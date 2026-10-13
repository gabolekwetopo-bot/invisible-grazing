// =============================================================================
// INVISIBLE GRAZING — Area investigation page
// =============================================================================
// One page per monitoring area: location, vegetation series, rainfall context,
// risk assessment with evidence, alternative explanations, recommended actions,
// data provenance, and a printable report.
//
// If the area arrives without a series (a server-scanned watchlist site), the
// page hydrates it on first visit using the same real providers the client
// already uses, and caches the result in localStorage.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Info } from 'lucide-react';
import { getAreaById } from '../lib/areas';
import { assessArea } from '../lib/risk';
import { DATA_SOURCES } from '../lib/sources';
import { fetchSentinel2Ndvi } from '../lib/providers/sentinel2';
import { fetchNasaPowerRainfall } from '../lib/providers/nasaPower';
import { formatDate, formatLatLon, formatRelative } from '../lib/format';
import type { MonitoringArea } from '../types';
import RiskBadge from '../components/RiskBadge';
import TimeSeriesChart from '../components/TimeSeriesChart';
import ActionPanel from '../components/ActionPanel';
import NeighbourCompare from '../components/NeighbourCompare';
import AIAnalyst from '../components/AIAnalyst';
import './AreaInvestigation.css';

export default function AreaInvestigation() {
  const { id } = useParams<{ id: string }>();
  const area = id ? getAreaById(id) : undefined;

  const [hydratedArea, setHydratedArea] = useState<MonitoringArea | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const [hydrateError, setHydrateError] = useState<string>('');
  const [showCompare, setShowCompare] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);

  // Hydrate a series for the area if it arrived without one.
  useEffect(() => {
    if (!area || area.series.length > 0) {
      setHydratedArea(null);
      setHydrateError('');
      return;
    }
    const cacheKey = `invisible-grazing.siteSeries.${area.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as MonitoringArea;
        setHydratedArea(parsed);
        return;
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    let cancelled = false;
    setHydrating(true);
    setHydrateError('');

    (async () => {
      const toIso = new Date().toISOString();
      const fromIso = new Date(Date.now() - 2 * 365 * 86_400_000).toISOString();
      const series = [];

      try {
        const ndvi = await fetchSentinel2Ndvi(area, { fromIso, toIso });
        if (ndvi.observations.some((o) => o.value != null)) series.push(ndvi);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[area] NDVI fetch failed:', e);
      }

      try {
        const rain = await fetchNasaPowerRainfall(area, new Date(fromIso).getUTCFullYear());
        if (rain.observations.length) series.push(rain);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[area] rainfall fetch failed:', e);
      }

      if (cancelled) return;

      if (series.length === 0) {
        setHydrateError('No satellite observations are available for this site yet.');
        setHydrating(false);
        return;
      }

      const hydrated: MonitoringArea = { ...area, series };
      try {
        localStorage.setItem(cacheKey, JSON.stringify(hydrated));
      } catch {
        /* quota */
      }
      setHydratedArea(hydrated);
      setHydrating(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area?.id]);

  const displayArea: MonitoringArea | undefined = hydratedArea ?? area;
  const risk = useMemo(() => (displayArea ? assessArea(displayArea) : null), [displayArea]);

  if (!displayArea || !risk) {
    return (
      <div className="ig-container area-page">
        <h1>Area not found</h1>
        <p className="ig-muted">
          This monitoring area does not exist. <Link to="/dashboard">Return to dashboard</Link>.
        </p>
      </div>
    );
  }

  const ndvi = displayArea.series.find((s) => s.indicator === 'NDVI');
  const rainfall = displayArea.series.find((s) => s.indicator === 'Rainfall');

  const usableNdvi = ndvi?.observations.filter((o) => o.value != null) ?? [];
  const latest = usableNdvi.length
    ? usableNdvi.reduce((a, b) => (a.date > b.date ? a : b))
    : undefined;

  return (
    <div className="ig-container area-page">
      <div className="area-nav">
        <Link to="/dashboard" className="area-back">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <button className="area-print" onClick={() => window.print()}>
          <Printer size={14} /> Print report
        </button>
      </div>

      {hydrating && (
        <div className="area-hydrating">
          <div className="area-hydrating-spinner" />
          Fetching real Sentinel-2 and NASA POWER data for this site…
        </div>
      )}
      {hydrateError && !hydrating && (
        <div className="area-hydrating area-hydrating-error">{hydrateError}</div>
      )}

      <header className="area-head">
        <div className="area-title">
          <h1>{displayArea.name}</h1>
          <div className="ig-muted">
            {displayArea.region ?? 'Unknown region'}
            {displayArea.countryCode ? ` · ${displayArea.countryCode}` : ''}
            {' · '}
            {formatLatLon(displayArea.latitude, displayArea.longitude)}
            {displayArea.radiusKm ? ` · ~${displayArea.radiusKm} km radius` : ''}
          </div>
        </div>
        <div className="area-head-badges">
          <RiskBadge level={risk.level} />
        </div>
      </header>

      {displayArea.description && (
        <section className="card area-block">
          <p>{displayArea.description}</p>
        </section>
      )}

      <section className="area-grid">
        <div className="card area-block area-chart" ref={chartRef}>
          <div className="card-head">
            <h2>Vegetation and rainfall over time</h2>
            <span className="ig-muted">
              NDVI (solid, left axis) · Rainfall (dashed, right axis)
            </span>
          </div>
          <div style={{ padding: 'var(--ig-space-4) var(--ig-space-5)' }}>
            {ndvi || rainfall ? (
              <TimeSeriesChart ndvi={ndvi} rainfall={rainfall} height={340} />
            ) : (
              <div className="area-empty-chart">
                {hydrating
                  ? 'Fetching observations…'
                  : hydrateError || 'No observations available for this area.'}
              </div>
            )}
          </div>
        </div>

        <aside className="card area-block area-risk">
          <div className="card-head">
            <h2>Assessment</h2>
            <span className="ig-muted">{formatRelative(risk.computedAt)}</span>
          </div>
          <div className="area-risk-body">
            <div className="risk-headline">{risk.headline}</div>

            <h3>Evidence</h3>
            <ul className="evidence-list">
              {risk.evidence.map((e, i) => (
                <li key={i} className={`evidence-item direction-${e.direction}`}>
                  <span className="evidence-label">{e.label}</span>
                  <span className="evidence-value">{e.value}</span>
                </li>
              ))}
            </ul>

            <h3>Alternative explanations to consider</h3>
            <ul className="plain-list">
              {risk.alternativeExplanations.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>

            <h3>Recommended next steps</h3>
            <ActionPanel
              area={displayArea}
              risk={risk}
              onCompare={() => {
                setShowCompare(true);
                setTimeout(() => {
                  compareRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 80);
              }}
              onReviewRainfall={() => {
                chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            />
          </div>
        </aside>
      </section>

      {showCompare && (
        <div ref={compareRef}>
          <NeighbourCompare area={displayArea} onClose={() => setShowCompare(false)} />
        </div>
      )}

      <AIAnalyst area={displayArea} risk={risk} />

      <section className="card area-block">
        <div className="card-head">
          <h2>Data provenance</h2>
          <span className="ig-muted">
            Every value shown is traceable to a source and a date.
          </span>
        </div>
        <div className="provenance">
          <div className="provenance-row">
            <div className="provenance-label">Latest usable observation</div>
            <div className="provenance-value">
              {latest ? `${formatDate(latest.date)} (${formatRelative(latest.date)})` : '—'}
            </div>
          </div>
          <div className="provenance-row">
            <div className="provenance-label">Assessment basis</div>
            <div className="provenance-value">{risk.basedOn}</div>
          </div>
          {displayArea.series.map((s) => {
            const src = DATA_SOURCES[s.sourceId];
            return (
              <div key={s.sourceId + s.indicator} className="provenance-row">
                <div className="provenance-label">
                  {s.indicator} ({s.unit})
                </div>
                <div className="provenance-value">
                  <strong>{src.name}</strong>
                  <div className="ig-soft" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                    {src.spatialResolution ?? '—'} · {src.temporalResolution ?? '—'}
                    {s.limitations ? ` · ${s.limitations}` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="ig-muted" style={{ padding: 'var(--ig-space-3) var(--ig-space-5)', fontSize: '0.8125rem' }}>
          <Info size={12} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
          Vegetation indices describe vegetation condition, not grazing activity.
          Confirming grazing requires independent field evidence.
        </div>
      </section>
    </div>
  );
}
