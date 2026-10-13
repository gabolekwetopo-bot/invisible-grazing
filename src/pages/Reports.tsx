// =============================================================================
// INVISIBLE GRAZING — Reports
// =============================================================================
// One-line summary per area with a link to its printable investigation page.
// =============================================================================

import { Link } from 'react-router-dom';
import { Printer, ExternalLink } from 'lucide-react';
import { getAllAreas } from '../lib/areas';
import { assessArea } from '../lib/risk';
import { formatDate } from '../lib/format';
import RiskBadge from '../components/RiskBadge';
import './Reports.css';

export default function Reports() {
  const areas = getAllAreas();

  return (
    <div className="ig-container reports-page">
      <header>
        <h1>Reports</h1>
        <p className="ig-muted">
          Every monitoring area has a printable investigation report. Reports show the
          observation period, vegetation trend, risk classification, supporting evidence,
          alternative explanations, recommended investigations, and data sources with
          their limitations.
        </p>
      </header>

      <div className="card">
        <div className="card-head">
          <h2>Available reports</h2>
          <span className="ig-muted">{areas.length} areas</span>
        </div>
        <table className="reports-table">
          <thead>
            <tr>
              <th>Area</th>
              <th>Region</th>
              <th>Risk</th>
              <th>Latest observation</th>
              <th>Provenance</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {areas.map((a) => {
              const risk = assessArea(a);
              const ndvi = a.series.find((s) => s.indicator === 'NDVI');
              const usable = ndvi?.observations.filter((o) => o.value != null) ?? [];
              const latest = usable.length
                ? usable.reduce((x, y) => (x.date > y.date ? x : y))
                : undefined;
              return (
                <tr key={a.id}>
                  <td>
                    <Link to={`/area/${a.id}`}>{a.name}</Link>
                  </td>
                  <td className="ig-muted">{a.region ?? '—'}</td>
                  <td>
                    <RiskBadge level={risk.level} />
                  </td>
                  <td className="ig-muted">{formatDate(latest?.date)}</td>
                  <td>
                    {a.demonstration ? (
                      <span className="ig-badge" style={{ background: 'var(--ig-demo-bg)', color: 'var(--ig-demo)' }}>
                        Demonstration
                      </span>
                    ) : (
                      <span className="ig-badge" style={{ background: 'var(--ig-risk-low-bg)', color: 'var(--ig-risk-low)' }}>
                        Observations
                      </span>
                    )}
                  </td>
                  <td className="reports-actions">
                    <Link to={`/area/${a.id}`} className="report-link">
                      <ExternalLink size={13} /> Open
                    </Link>
                    <Link to={`/area/${a.id}`} className="report-link">
                      <Printer size={13} /> Print
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="ig-soft" style={{ fontSize: '0.8125rem' }}>
        Note: the Print action opens the investigation page — use your browser's print
        command (Ctrl+P) there to produce a clean single-column report.
      </p>
    </div>
  );
}
