// =============================================================================
// INVISIBLE GRAZING — Full printable report
// =============================================================================
// Single-page report for a monitoring area: location, observation period,
// vegetation trend, rainfall context, risk classification, evidence, alternative
// explanations, recommended investigations, and data provenance with limitations.
// Uses a print stylesheet so Ctrl+P produces a clean document.
// =============================================================================

import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { getAreaById } from '../lib/areas';
import { assessArea } from '../lib/risk';
import { DATA_SOURCES } from '../lib/sources';
import { formatDate, formatLatLon, formatRelative } from '../lib/format';
import TimeSeriesChart from '../components/TimeSeriesChart';
import './ReportView.css';

export default function ReportView() {
  const { id } = useParams<{ id: string }>();
  const area = id ? getAreaById(id) : undefined;

  // Auto-scroll to top when the report opens.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  if (!area) {
    return (
      <div className="ig-container report-page">
        <h1>Area not found</h1>
        <p className="ig-muted">
          <Link to="/dashboard">Return to dashboard</Link>.
        </p>
      </div>
    );
  }

  const risk = assessArea(area);
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
