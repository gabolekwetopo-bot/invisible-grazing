// =============================================================================
// INVISIBLE GRAZING — War Room
// =============================================================================
// Full-viewport three-column monitoring view. Left rail: area list with risk
// filters. Centre: full-height map with pulsing high-risk markers. Right rail:
// live alert feed from the scan engine, with a scanning progress indicator.
// =============================================================================

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  MapPin,
  Activity,
  CircleSlash,
} from 'lucide-react';
import { getAllAreas } from '../lib/areas';
import { useLiveScan, type ScanAlert } from '../lib/scan';
import { useServerState } from '../lib/serverState';
import type { MonitoringArea, RiskAssessment, RiskLevel } from '../types';
import WorldMap, { type MapPoint } from '../components/WorldMap';
import RiskBadge from '../components/RiskBadge';
import { formatDate, formatRelative, formatLatLon } from '../lib/format';
import './WarRoom.css';

const SCAN_INTERVAL_MS = 60_000;

type Filter = 'all' | RiskLevel;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All areas' },
  { id: 'high', label: 'High' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'low', label: 'Low' },
  { id: 'insufficient', label: 'Insufficient' },
];

export default function WarRoom() {
  const navigate = useNavigate();
  const areas = useMemo(() => getAllAreas(), []);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { scans, alerts, lastScanAt, cycleProgress, scanning, triggerScan } = useLiveScan(
    areas,
    SCAN_INTERVAL_MS,
  );

  const { state: serverState, loading: serverLoading } = useServerState();

  // Markers blip if the server detected an alert on that site in the last 24 hours.
  const recentAlertCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const blipIds = new Set(
    serverState.areas
      .filter((a) => a.lastAlertAt && new Date(a.lastAlertAt).getTime() >= recentAlertCutoff)
      .map((a) => a.areaId),
  );

  // Client-scanned areas (seeds + user-added).
  const clientPoints: MapPoint[] = scans.map((s) => ({
    area: s.area,
    risk: s.risk,
    latestObservationDate: s.latestObservationDate,
    // Blip if the server detected an alert in the last 24 h, OR if the site is
    // currently classified Moderate. A moderate classification already means
    // "worth investigating", so it earns a visible pulse on the map.
    blip: blipIds.has(s.area.id) || s.risk.level === 'moderate',
  }));

  // Server-scanned watchlist sites, rendered from /api/state.
  // These are the 40 global rangeland sites checked by the daily cron.
  const clientIds = new Set(scans.map((s) => s.area.id));
  const serverPoints: MapPoint[] = serverState.areas
    .filter((a) => !clientIds.has(a.areaId))
    .map((a) => {
      const area: MonitoringArea = {
        id: a.areaId,
        name: a.areaName,
        region: a.region,
        latitude: a.latitude,
        longitude: a.longitude,
        radiusKm: a.radiusKm,
        demonstration: false,
        createdAt: a.lastScanAt,
        series: [],
      };
      const risk: RiskAssessment = {
        level: a.lastRiskLevel,
        headline:
          a.lastRiskLevel === 'insufficient'
            ? 'Insufficient observations for a reliable assessment.'
            : a.lastRiskLevel === 'high'
            ? 'Elevated vegetation decline detected at this site.'
            : a.lastRiskLevel === 'moderate'
            ? 'Material vegetation decline — investigate potential causes.'
            : 'Vegetation appears broadly stable over the assessment window.',
        evidence: [
          {
            label: 'Last NDVI value',
            value: a.lastNdvi != null ? a.lastNdvi.toFixed(3) : '—',
            direction: 'neutral',
          },
          {
            label: 'Last rainfall value',
            value: a.lastRainfall != null ? `${a.lastRainfall.toFixed(1)} mm` : '—',
            direction: 'neutral',
          },
          {
            label: 'Server scan',
            value: new Date(a.lastScanAt).toISOString().slice(0, 16).replace('T', ' '),
            direction: 'neutral',
          },
        ],
        alternativeExplanations: [],
        recommendedActions: [],
        computedAt: a.lastScanAt,
        basedOn: 'observations',
      };
      return {
        area,
        risk,
        latestObservationDate: a.lastScanAt.slice(0, 10),
        blip: blipIds.has(a.areaId) || a.lastRiskLevel === 'moderate',
      };
    });

  const points: MapPoint[] = [...clientPoints, ...serverPoints];

  const filteredScans = filter === 'all' ? scans : scans.filter((s) => s.risk.level === filter);

  const selected = scans.find((s) => s.area.id === selectedId);

  const counts = useMemo(() => {
    const c = { high: 0, moderate: 0, low: 0, insufficient: 0 };
    for (const p of points) c[p.risk.level] += 1;
    return c;
  }, [points]);

  return (
    <div className="warroom">
      {/* ---------- Top bar ---------- */}
      <header className="wr-topbar">
        <div className="wr-topbar-left">
          <Link to="/dashboard" className="wr-back" aria-label="Back to dashboard">
            <ArrowLeft size={14} /> Exit war room
          </Link>
          <div className="wr-brand">
            <img src="/logo.svg" alt="" className="wr-brand-mark" />
            <div className="wr-brand-text">
              <span className="wr-brand-name">INVISIBLE GRAZING</span>
              <span className="wr-brand-tag">War room · global monitoring</span>
            </div>
          </div>
        </div>

        <div className="wr-topbar-centre">
          <div className={'wr-scan-status' + (scanning ? ' is-scanning' : '')}>
            <RefreshCw size={13} className={scanning ? 'wr-spin' : ''} />
            <span>
              {scanning ? 'Scanning' : 'Watching'} {scans.length} area
              {scans.length === 1 ? '' : 's'}
            </span>
            <span className="wr-dot-sep">·</span>
            <span>Client scan {lastScanAt ? formatRelative(lastScanAt) : '—'}</span>
            {serverState.lastRunAt && (
              <>
                <span className="wr-dot-sep">·</span>
                <span className="wr-server-scan">
                  Server scan {formatRelative(serverState.lastRunAt)} · {serverState.areas.length} sites
                </span>
              </>
            )}
            {!serverState.lastRunAt && !serverLoading && (
              <>
                <span className="wr-dot-sep">·</span>
                <span className="wr-server-scan wr-server-pending">Server scan: awaiting first daily run</span>
              </>
            )}
          </div>
          <div className="wr-progress" aria-hidden="true">
            <div className="wr-progress-fill" style={{ width: `${cycleProgress * 100}%` }} />
          </div>
        </div>

        <div className="wr-topbar-right">
          <button className="wr-rescan" onClick={triggerScan} disabled={scanning}>
            <RefreshCw size={13} /> Scan now
          </button>
        </div>
      </header>

      {/* ---------- Three columns ---------- */}
      <div className="wr-body">
        {/* Left rail — area list */}
        <aside className="wr-rail wr-rail-left">
          <div className="wr-rail-head">
            <span className="wr-rail-title">Areas</span>
            <span className="wr-rail-count">{filteredScans.length}</span>
          </div>

          <div className="wr-filters">
            {FILTERS.map((f) => {
              const count =
                f.id === 'all' ? scans.length : counts[f.id as RiskLevel] ?? 0;
              return (
                <button
                  key={f.id}
                  className={'wr-chip' + (filter === f.id ? ' is-active' : '')}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                  <span className="wr-chip-count">{count}</span>
                </button>
              );
            })}
          </div>

          <ul className="wr-area-list">
            {filteredScans.map((s) => {
              const isSelected = s.area.id === selectedId;
              return (
                <li key={s.area.id}>
                  <button
                    className={'wr-area-item' + (isSelected ? ' is-selected' : '')}
                    onClick={() => {
                      setSelectedId(s.area.id);
                      navigate(`/area/${s.area.id}`);
                    }}
                  >
                    <div className="wr-area-row">
                      <span className="wr-area-name">{s.area.name}</span>
                      <RiskBadge level={s.risk.level} />
                    </div>
                    <div className="wr-area-meta">
                      {s.area.region ?? '—'}
                    </div>
                    <div className="wr-area-sub">
                      <MapPin size={11} />
                      {formatLatLon(s.area.latitude, s.area.longitude)}
                    </div>
                  </button>
                </li>
              );
            })}
            {filteredScans.length === 0 && (
              <li className="wr-empty">
                <CircleSlash size={16} />
                No areas in this risk category.
              </li>
            )}
          </ul>
        </aside>

        {/* Centre — map */}
        <main className="wr-map">
          <WorldMap
            points={points}
            height="100%"
            onSelect={(id) => setSelectedId(id)}
          />
          {selected && (
            <div className="wr-map-overlay">
              <div className="wr-overlay-head">
                <span className="wr-overlay-title">{selected.area.name}</span>
                <RiskBadge level={selected.risk.level} />
              </div>
              <div className="wr-overlay-headline">{selected.risk.headline}</div>
              <div className="wr-overlay-meta">
                Latest observation: {formatDate(selected.latestObservationDate)}
              </div>
              <Link to={`/area/${selected.area.id}`} className="wr-overlay-link">
                Open investigation →
              </Link>
            </div>
          )}
        </main>

        {/* Right rail — live alert feed */}
        <aside className="wr-rail wr-rail-right">
          <div className="wr-rail-head">
            <span className="wr-rail-title">
              <Activity size={13} /> Live alerts
            </span>
            <span className="wr-rail-count">{alerts.length}</span>
          </div>
          <p className="wr-rail-note">
            Scans every {Math.round(SCAN_INTERVAL_MS / 1000)} s. Only risk-level
            changes appear here.
          </p>

          <ul className="wr-alert-list">
            {alerts.map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
            {alerts.length === 0 && (
              <li className="wr-empty">
                <CircleSlash size={16} />
                No alerts yet. This panel populates as scans complete.
              </li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: ScanAlert }) {
  const isNew = alert.kind === 'first-scan' || alert.kind === 'escalation';
  const isUp = alert.kind === 'escalation';
  const isDown = alert.kind === 'deescalation';

  return (
    <li
      className={
        'wr-alert' +
        (isNew ? ' is-new' : '') +
        (isUp ? ' is-up' : '') +
        (isDown ? ' is-down' : '')
      }
    >
      <div className="wr-alert-head">
        <RiskBadge level={alert.risk} />
        {alert.kind === 'escalation' && (
          <span className="wr-alert-kind wr-alert-kind-up">
            <AlertTriangle size={11} /> Escalated
          </span>
        )}
        {alert.kind === 'deescalation' && (
          <span className="wr-alert-kind wr-alert-kind-down">De-escalated</span>
        )}
        {alert.kind === 'first-scan' && (
          <span className="wr-alert-kind wr-alert-kind-new">Detected</span>
        )}
        <span className="wr-alert-time">{formatRelative(alert.at)}</span>
      </div>
      <div className="wr-alert-name">{alert.areaName}</div>
      {alert.region && <div className="wr-alert-region">{alert.region}</div>}
      <div className="wr-alert-headline">{alert.headline}</div>
      <div className="wr-alert-evidence">{alert.evidence}</div>
      <Link to={`/area/${alert.areaId}`} className="wr-alert-link">
        Investigate →
      </Link>
    </li>
  );
}
