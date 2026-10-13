// =============================================================================
// INVISIBLE GRAZING — Full printable report
// =============================================================================
// Single-page report for a monitoring area: location, observation period,
// vegetation trend, rainfall context, risk classification, evidence, alternative
// explanations, recommended investigations, and data provenance with limitations.
// Uses a print stylesheet so Ctrl+P produces a clean document.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer, Download, Sparkles, Loader2 } from 'lucide-react';
import { getAreaById, setServerAreas } from '../lib/areas';
import { useServerState } from '../lib/serverState';
import { assessArea } from '../lib/risk';
import { DATA_SOURCES } from '../lib/sources';
import { formatDate, formatLatLon, formatRelative } from '../lib/format';
import TimeSeriesChart from '../components/TimeSeriesChart';
import './ReportView.css';

export default function ReportView() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { state: serverState, loading: serverLoading } = useServerState();
  useEffect(() => {
    if (serverState.areas.length) {
      setServerAreas(
        serverState.areas.map((a) => ({
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
    }
  }, [serverState]);
  const wantsAI = searchParams.get('ai') === '1';
  const area = id ? getAreaById(id) : undefined;

  const [aiReport, setAiReport] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>('');

  // Build a stable payload from the area and its assessment once.
  const aiPayload = useMemo(() => {
    if (!area) return null;
    // If this site came from the server scan, the server already classified it
  // using the real Sentinel-2 and NASA POWER data at the last run. Prefer that
  // classification. Only fall back to a local recomputation when the server has
  // no record of this site.
  const serverHit = serverState.areas.find((a) => a.areaId === area.id);
  const serverRisk = serverHit
    ? {
        level: serverHit.lastRiskLevel,
        headline:
          serverHit.lastRiskLevel === 'insufficient'
            ? 'Insufficient observations for a reliable assessment.'
            : serverHit.lastRiskLevel === 'high'
            ? 'Severe vegetation decline detected at the last server scan.'
            : serverHit.lastRiskLevel === 'moderate'
            ? 'Material vegetation decline — investigate potential causes.'
            : 'Vegetation appears broadly stable over the assessment window.',
        evidence: [
          {
            label: 'Usable NDVI observations',
            value: `${serverHit.lastRiskLevel === 'insufficient' ? '0 (minimum 6)' : 'Assessed by server scan'}`,
            direction: 'neutral' as const,
          },
          {
            label: 'Last NDVI value',
            value: serverHit.lastNdvi != null ? String(serverHit.lastNdvi) : '—',
            direction: 'neutral' as const,
          },
          {
            label: 'Last rainfall value',
            value: serverHit.lastRainfall != null ? `${serverHit.lastRainfall} mm` : '—',
            direction: 'neutral' as const,
          },
          {
            label: 'Last server scan',
            value: new Date(serverHit.lastScanAt).toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
            direction: 'neutral' as const,
          },
        ],
        alternativeExplanations: [
          'Drought or reduced rainfall',
          'Fire',
          'Land clearing or cultivation change',
          'Seasonal phenology (green-up / senescence)',
          'Pest or disease outbreak',
          'Cloud contamination or sensor artefacts',
          'A change in grazing pressure (requires independent field evidence to confirm)',
        ],
        recommendedActions: [
          'Compare with neighbouring areas to see whether the decline is local or regional.',
          'Review recent rainfall records for the same period.',
          'Check for fire, land-use change, or new cultivation in the area.',
          'Conduct a field inspection to identify the cause of the decline.',
        ],
        computedAt: serverHit.lastScanAt,
        basedOn: 'observations' as const,
      }
    : null;

  const risk = serverRisk ?? assessArea(area);
    const ndvi = area.series.find((s) => s.indicator === 'NDVI');
    const rainfall = area.series.find((s) => s.indicator === 'Rainfall');
    const usableNdvi = ndvi?.observations.filter((o) => o.value != null) ?? [];
    const usableRain = rainfall?.observations.filter((o) => o.value != null) ?? [];

    function mean(xs: number[]) {
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
    }
    function split(xs: { date: string; value: number | null }[]) {
      if (!xs.length) return { recent: [] as typeof xs, baseline: [] as typeof xs };
      const sorted = [...xs].sort((a, b) => a.date.localeCompare(b.date));
      const latest = new Date(sorted[sorted.length - 1].date);
      const cutoff = new Date(latest);
      cutoff.setMonth(cutoff.getMonth() - 12);
      return {
        recent: sorted.filter((o) => new Date(o.date) >= cutoff),
        baseline: sorted.filter((o) => new Date(o.date) < cutoff),
      };
    }

    const ndviSplit = split(usableNdvi as { date: string; value: number | null }[]);
    const rainSplit = split(usableRain as { date: string; value: number | null }[]);
    const ndviVals = usableNdvi.map((o) => o.value as number);
    const recentNdvi = ndviSplit.recent.map((o) => o.value as number);
    const baseNdvi = ndviSplit.baseline.map((o) => o.value as number);
    const recentRain = rainSplit.recent.map((o) => o.value as number);
    const baseRain = rainSplit.baseline.map((o) => o.value as number);

    const recentNdviMean = mean(recentNdvi);
    const baseNdviMean = mean(baseNdvi);
    const recentRainMean = mean(recentRain);
    const baseRainMean = mean(baseRain);

    const sortedNdvi = [...usableNdvi].sort((a, b) => a.date.localeCompare(b.date));

    return {
      mode: 'report',
      areaName: area.name,
      region: area.region,
      countryCode: area.countryCode,
      latitude: area.latitude,
      longitude: area.longitude,
      radiusKm: area.radiusKm,
      demonstration: false,
      riskLevel: risk.level,
      riskHeadline: risk.headline,
      evidence: risk.evidence.map((e) => ({ label: e.label, value: e.value, direction: e.direction })),
      ndvi: ndvi
        ? {
            latestDate: sortedNdvi[sortedNdvi.length - 1]?.date,
            latestValue: sortedNdvi[sortedNdvi.length - 1]?.value,
            baselineMean: baseNdviMean != null ? Number(baseNdviMean.toFixed(3)) : null,
            recentMean: recentNdviMean != null ? Number(recentNdviMean.toFixed(3)) : null,
            delta:
              recentNdviMean != null && baseNdviMean != null
                ? Number((recentNdviMean - baseNdviMean).toFixed(3))
                : null,
            observationCount: ndviVals.length,
            earliestDate: sortedNdvi[0]?.date,
          }
        : undefined,
      rainfall: rainfall
        ? {
            recentMean: recentRainMean != null ? Number(recentRainMean.toFixed(1)) : null,
            baselineMean: baseRainMean != null ? Number(baseRainMean.toFixed(1)) : null,
            percentChange:
              recentRainMean != null && baseRainMean != null && baseRainMean !== 0
                ? Number((((recentRainMean - baseRainMean) / baseRainMean) * 100).toFixed(0))
                : null,
            observationCount: usableRain.length,
          }
        : undefined,
      alternativeExplanations: risk.alternativeExplanations,
    };
  }, [area]);

  useEffect(() => {
    if (!wantsAI || !aiPayload) return;
    let cancelled = false;
    setAiLoading(true);
    setAiError('');
    fetch('/api/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiPayload),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as { note?: string };
        const text = (json.note ?? '').trim();
        if (!text) throw new Error('Empty response');
        if (!cancelled) { setAiReport(text); setAiLoading(false); }
      })
      .catch((e) => {
        if (!cancelled) { setAiError(String(e).replace(/^Error:\s*/, '')); setAiLoading(false); }
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [wantsAI, aiPayload]);

  // Auto-scroll to top when the report opens.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  if (!area) {
    if (serverLoading) {
      return (
        <div className="ig-container report-page">
          <div className="area-hydrating">
            <div className="area-hydrating-spinner" />
            Loading monitoring area…
          </div>
        </div>
      );
    }
    return (
      <div className="ig-container report-page">
        <h1>Area not found</h1>
        <p className="ig-muted">
          <Link to="/dashboard">Return to dashboard</Link>.
        </p>
      </div>
    );
  }

  // If this site came from the server scan, the server already classified it
  // using the real Sentinel-2 and NASA POWER data at the last run. Prefer that
  // classification. Only fall back to a local recomputation when the server has
  // no record of this site.
  const serverHit = serverState.areas.find((a) => a.areaId === area.id);
  const serverRisk = serverHit
    ? {
        level: serverHit.lastRiskLevel,
        headline:
          serverHit.lastRiskLevel === 'insufficient'
            ? 'Insufficient observations for a reliable assessment.'
            : serverHit.lastRiskLevel === 'high'
            ? 'Severe vegetation decline detected at the last server scan.'
            : serverHit.lastRiskLevel === 'moderate'
            ? 'Material vegetation decline — investigate potential causes.'
            : 'Vegetation appears broadly stable over the assessment window.',
        evidence: [
          {
            label: 'Usable NDVI observations',
            value: `${serverHit.lastRiskLevel === 'insufficient' ? '0 (minimum 6)' : 'Assessed by server scan'}`,
            direction: 'neutral' as const,
          },
          {
            label: 'Last NDVI value',
            value: serverHit.lastNdvi != null ? String(serverHit.lastNdvi) : '—',
            direction: 'neutral' as const,
          },
          {
            label: 'Last rainfall value',
            value: serverHit.lastRainfall != null ? `${serverHit.lastRainfall} mm` : '—',
            direction: 'neutral' as const,
          },
          {
            label: 'Last server scan',
            value: new Date(serverHit.lastScanAt).toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
            direction: 'neutral' as const,
          },
        ],
        alternativeExplanations: [
          'Drought or reduced rainfall',
          'Fire',
          'Land clearing or cultivation change',
          'Seasonal phenology (green-up / senescence)',
          'Pest or disease outbreak',
          'Cloud contamination or sensor artefacts',
          'A change in grazing pressure (requires independent field evidence to confirm)',
        ],
        recommendedActions: [
          'Compare with neighbouring areas to see whether the decline is local or regional.',
          'Review recent rainfall records for the same period.',
          'Check for fire, land-use change, or new cultivation in the area.',
          'Conduct a field inspection to identify the cause of the decline.',
        ],
        computedAt: serverHit.lastScanAt,
        basedOn: 'observations' as const,
      }
    : null;

  const risk = serverRisk ?? assessArea(area);
  const ndvi = area.series.find((s) => s.indicator === 'NDVI');
  const rainfall = area.series.find((s) => s.indicator === 'Rainfall');

  const usableNdvi = ndvi?.observations.filter((o) => o.value != null) ?? [];
  const usableRain = rainfall?.observations.filter((o) => o.value != null) ?? [];

  const earliest = (xs: typeof usableNdvi) =>
    xs.length ? [...xs].sort((a, b) => a.date.localeCompare(b.date))[0] : undefined;
  const latest = (xs: typeof usableNdvi) =>
    xs.length ? [...xs].sort((a, b) => a.date.localeCompare(b.date))[xs.length - 1] : undefined;

  return (
    <div className="ig-container report-page">
      <div className="report-toolbar no-print">
        <Link to={`/area/${area.id}`} className="report-back">
          <ArrowLeft size={14} /> Back to investigation
        </Link>
        <div className="report-actions">
          <a
            className="report-btn"
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(buildTextReport(area, risk))}`}
            download={`invisible-grazing-${area.id}.txt`}
          >
            <Download size={14} /> Download text
          </a>
          <button className="report-btn report-btn-primary" onClick={() => window.print()}>
            <Printer size={14} /> Print / Save as PDF
          </button>
        </div>
      </div>

      <article className="report">
        <header className="report-header">
          <div className="report-brand">
            <img src="/logo.svg" alt="" className="report-logo" />
            <div>
              <div className="report-brand-name">INVISIBLE GRAZING</div>
              <div className="report-brand-tag">See the pressure before the damage.</div>
            </div>
          </div>
          <div className="report-meta">
            <div>Report generated {formatDate(new Date().toISOString())}</div>
            <div>Area ID {area.id}</div>
          </div>
        </header>

        <h1 className="report-title">{area.name}</h1>
        <p className="report-location">
          {area.region ?? 'Unknown region'}
          {area.countryCode ? ` · ${area.countryCode}` : ''}
          {' · '}
          {formatLatLon(area.latitude, area.longitude)}
          {area.radiusKm ? ` · ~${area.radiusKm} km radius` : ''}
        </p>

        <section className="report-section">
          <h2>Assessment</h2>
          <div className="report-assessment">
            <div className={'report-risk report-risk-' + risk.level}>
              {risk.level.toUpperCase()}
            </div>
            <div className="report-headline">{risk.headline}</div>
          </div>
          <dl className="report-dl">
            <dt>Assessment basis</dt>
            <dd>{risk.basedOn}</dd>
            <dt>Computed</dt>
            <dd>{formatDate(risk.computedAt)} ({formatRelative(risk.computedAt)})</dd>
          </dl>
        </section>

        <section className="report-section">
          <h2>Evidence</h2>
          <table className="report-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Value</th>
                <th>Direction</th>
              </tr>
            </thead>
            <tbody>
              {risk.evidence.map((e, i) => (
                <tr key={i}>
                  <td>{e.label}</td>
                  <td>{e.value}</td>
                  <td>{e.direction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {ndvi && (
          <section className="report-section">
            <h2>Vegetation observations (NDVI)</h2>
            <div className="report-chart">
              <TimeSeriesChart ndvi={ndvi} rainfall={rainfall} height={260} />
            </div>
            <dl className="report-dl">
              <dt>Source</dt>
              <dd>{DATA_SOURCES[ndvi.sourceId].name}</dd>
              <dt>Observations</dt>
              <dd>{usableNdvi.length} usable</dd>
              <dt>Period</dt>
              <dd>
                {formatDate(earliest(usableNdvi)?.date)} – {formatDate(latest(usableNdvi)?.date)}
              </dd>
              <dt>Limitations</dt>
              <dd>{ndvi.limitations ?? '—'}</dd>
            </dl>
          </section>
        )}

        {rainfall && usableRain.length > 0 && (
          <section className="report-section">
            <h2>Rainfall context</h2>
            <dl className="report-dl">
              <dt>Source</dt>
              <dd>{DATA_SOURCES[rainfall.sourceId].name}</dd>
              <dt>Observations</dt>
              <dd>{usableRain.length} usable</dd>
              <dt>Period</dt>
              <dd>
                {formatDate(earliest(usableRain)?.date)} – {formatDate(latest(usableRain)?.date)}
              </dd>
              <dt>Limitations</dt>
              <dd>{rainfall.limitations ?? '—'}</dd>
            </dl>
          </section>
        )}

        <section className="report-section">
          <h2>Alternative explanations</h2>
          <ul className="report-list">
            {risk.alternativeExplanations.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>

        <section className="report-section">
          <h2>Recommended investigations</h2>
          <ul className="report-list">
            {risk.recommendedActions.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>

        {(aiLoading || aiReport || aiError) && (
          <section className="report-section report-ai">
            <h2>AI analyst report</h2>
            {aiLoading && !aiReport && (
              <div className="report-ai-loading">
                <Loader2 size={14} className="report-ai-spin" /> Generating structured report…
              </div>
            )}
            {aiReport && (
              <div className="report-ai-body">
                <div className="report-ai-attribution">
                  <Sparkles size={12} /> Generated by openai/gpt-oss-120b · Uses only the observed values above
                </div>
                {aiReport.split(/\n+/).map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  const isHeading = /^(Section\s*\d|OBSERVED|RAINFALL|POSSIBLE|RECOMMENDED)/i.test(trimmed);
                  return isHeading ? (
                    <h3 key={i} className="report-ai-h3">{trimmed}</h3>
                  ) : (
                    <p key={i} className="report-ai-p">{trimmed}</p>
                  );
                })}
              </div>
            )}
            {aiError && (
              <div className="report-ai-error">
                The AI section is unavailable for this report. The rest of the report is unaffected.
              </div>
            )}
          </section>
        )}

        <section className="report-section report-notes">
          <h2>Notes on interpretation</h2>
          <p>
            This report describes observed vegetation condition and rainfall context
            for the selected area. It does not confirm grazing activity. Confirming
            grazing requires independent field evidence. Vegetation indices describe
            condition, not cause. Drought, fire, cultivation, pests, seasonal change,
            and land-use change can all produce similar signals.
          </p>
        </section>

        <footer className="report-footer">
          <div>Invisible Grazing — global rangeland intelligence</div>
          <div>Developed by Gabolekwe Topo Gabolekwe · Metric units · ISO dates · UTC</div>
        </footer>
      </article>
    </div>
  );
}

/** Plain-text version of the report for download. */
function buildTextReport(area: ReturnType<typeof getAreaById>, risk: ReturnType<typeof assessArea>): string {
  if (!area) return '';
  const lines: string[] = [];
  lines.push('INVISIBLE GRAZING — Monitoring area report');
  lines.push('See the pressure before the damage.');
  lines.push('');
  lines.push(`Area:     ${area.name}`);
  if (area.region) lines.push(`Region:   ${area.region}`);
  if (area.countryCode) lines.push(`Country:  ${area.countryCode}`);
  lines.push(`Lat/Lon:  ${area.latitude.toFixed(4)}, ${area.longitude.toFixed(4)}`);
  if (area.radiusKm) lines.push(`Radius:   ~${area.radiusKm} km`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('ASSESSMENT');
  lines.push(`Level:      ${risk.level}`);
  lines.push(`Headline:   ${risk.headline}`);
  lines.push(`Basis:      ${risk.basedOn}`);
  lines.push('');
  lines.push('EVIDENCE');
  for (const e of risk.evidence) {
    lines.push(`- ${e.label}: ${e.value} (${e.direction})`);
  }
  lines.push('');
  lines.push('ALTERNATIVE EXPLANATIONS');
  for (const a of risk.alternativeExplanations) lines.push(`- ${a}`);
  lines.push('');
  lines.push('RECOMMENDED INVESTIGATIONS');
  for (const a of risk.recommendedActions) lines.push(`- ${a}`);
  lines.push('');
  lines.push('NOTES');
  lines.push('This report describes observed vegetation condition and rainfall context.');
  lines.push('It does not confirm grazing activity. Confirming grazing requires field evidence.');
  lines.push('');
  lines.push('Developed by Gabolekwe Topo Gabolekwe.');
  return lines.join('\n');
}
