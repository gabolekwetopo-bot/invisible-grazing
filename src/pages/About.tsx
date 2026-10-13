// =============================================================================
// INVISIBLE GRAZING — About & Method
// =============================================================================
// Scientific honesty page: what the platform does, what it does not, and how
// the risk index is constructed.
// =============================================================================

import { Link } from 'react-router-dom';
import { ALL_SOURCES } from '../lib/sources';
import './About.css';

export default function About() {
  return (
    <div className="ig-container about-page">
      <header>
        <h1>About Invisible Grazing</h1>
        <p className="about-tagline">See the pressure before the damage.</p>
        <p className="ig-muted about-intro">
          Global rangeland intelligence that uses satellite-derived environmental
          observations to identify vegetation changes and highlight areas that may
          require grazing-pressure investigation.
        </p>
      </header>

      <section className="card about-block">
        <h2>What this platform is</h2>
        <p>
          A monitoring and early-warning system for grasslands, savannas, and dryland
          rangelands. It combines satellite-derived vegetation indices (NDVI), rainfall
          records, and geographic context to highlight areas that deserve a closer look.
        </p>
      </section>

      <section className="card about-block">
        <h2>What this platform is not</h2>
        <ul className="about-list">
          <li>It is not proof of overgrazing. Vegetation decline has many causes.</li>
          <li>
            It does not confirm grazing activity. Confirmation requires independent
            field evidence.
          </li>
          <li>
            It does not measure biodiversity, species abundance, carrying capacity,
            or carbon.
          </li>
          <li>It does not claim verified global coverage.</li>
        </ul>
      </section>

      <section className="card about-block">
        <h2>The Invisible Grazing Risk Index</h2>
        <p>
          The MVP uses a transparent, rules-based screen. The method is intentionally
          simple so that every result can be explained. Thresholds are provisional
          experimental assumptions and are documented below.
        </p>
        <div className="about-three">
          <div>
            <h3>1. Observed vegetation change</h3>
            <p className="ig-muted">
              We compare the mean NDVI over the last 12 months to the mean over the
              prior baseline. A decline of −0.05 or more is treated as material;
              −0.10 or more as severe.
            </p>
          </div>
          <div>
            <h3>2. Rainfall context</h3>
            <p className="ig-muted">
              When rainfall data is available for the same area, we compute the change
              over the same window. A rainfall deficit (≥15% below baseline) is treated
              as a plausible alternative explanation.
            </p>
          </div>
          <div>
            <h3>3. Confidence and sufficiency</h3>
            <p className="ig-muted">
              If fewer than six usable observations are available, the system returns
              Insufficient Data. It does not guess. If any series is a labelled
              demonstration, the result is tagged accordingly.
            </p>
          </div>
        </div>

        <table className="about-table">
          <thead>
            <tr>
              <th>Risk</th>
              <th>Condition (provisional)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>High</strong></td><td>NDVI change ≤ −0.10 over the assessment window</td></tr>
            <tr><td><strong>Moderate</strong></td><td>NDVI change between −0.10 and −0.05</td></tr>
            <tr><td><strong>Low</strong></td><td>NDVI change above −0.05 (including improvement)</td></tr>
            <tr><td><strong>Insufficient Data</strong></td><td>Fewer than 6 usable observations</td></tr>
          </tbody>
        </table>
      </section>

      <section className="card about-block">
        <h2>Data sources</h2>
        <p>
          The MVP is designed to integrate public, keyless data sources. Real
          observations, when shown, carry their source and date. Demonstration
          scenarios are always labelled and never mixed silently into real series.
        </p>
        <ul className="source-list">
          {ALL_SOURCES.map((s) => (
            <li key={s.id} className="source-item">
              <div className="source-name">
                {s.name}
                {s.simulated ? (
                  <span className="ig-badge" style={{ marginLeft: 8, background: 'var(--ig-demo-bg)', color: 'var(--ig-demo)' }}>
                    Simulated
                  </span>
                ) : (
                  <span className="ig-badge" style={{ marginLeft: 8, background: 'var(--ig-risk-low-bg)', color: 'var(--ig-risk-low)' }}>
                    Real
                  </span>
                )}
              </div>
              <div className="ig-muted" style={{ fontSize: '0.8125rem', margin: '4px 0' }}>
                {s.description}
              </div>
              <div className="ig-soft" style={{ fontSize: '0.75rem' }}>
                {s.spatialResolution ? `Spatial: ${s.spatialResolution} · ` : ''}
                {s.temporalResolution ? `Temporal: ${s.temporalResolution}` : ''}
              </div>
              {s.homepage && (
                <a href={s.homepage} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem' }}>
                  {s.homepage}
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card about-block">
        <h2>Limitations</h2>
        <ul className="about-list">
          <li>Thresholds are provisional and not yet validated against field data.</li>
          <li>NDVI values are not directly comparable across ecosystems.</li>
          <li>Cloud cover and sensor outages create data gaps.</li>
          <li>Short observation records cannot support reliable trend inference.</li>
          <li>Alerts flag potential concerns, not confirmed events.</li>
        </ul>
      </section>

      <section className="card about-block">
        <h2>Roadmap</h2>
        <ol className="about-list">
          <li>Integrate Sentinel-2 NDVI for user-selected areas.</li>
          <li>Add multi-year baselines per ecoregion.</li>
          <li>Field-observation input for confirmed grazing evidence.</li>
          <li>Validate thresholds against independent rangeland studies.</li>
          <li>Add more language and unit options for global deployment.</li>
        </ol>
      </section>

      <p className="ig-soft" style={{ fontSize: '0.8125rem' }}>
        This prototype was prepared for the Global Roots biodiversity innovation
        application. See the <Link to="/">dashboard</Link> to explore the current
        monitoring areas.
      </p>
    </div>
  );
}
