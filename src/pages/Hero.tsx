// =============================================================================
// INVISIBLE GRAZING — Hero / landing page
// =============================================================================
// The first screen a visitor sees. Full-bleed, no app chrome. One clear action.
// Uses the same real data pipeline as the rest of the app, but presented as a
// product statement rather than a dashboard.
// =============================================================================

import { Link } from 'react-router-dom';
import { ArrowRight, Satellite, Droplets, Activity, ShieldCheck } from 'lucide-react';
import { getAllAreas } from '../lib/areas';
import { assessArea } from '../lib/risk';
import WorldMap, { type MapPoint } from '../components/WorldMap';
import { formatDate } from '../lib/format';
import './Hero.css';

export default function Hero() {
  const areas = getAllAreas();

  const points: MapPoint[] = areas.map((area) => {
    const risk = assessArea(area);
    const ndvi = area.series.find((s) => s.indicator === 'NDVI');
    const usable = ndvi?.observations.filter((o) => o.value != null) ?? [];
    const latest = usable.length ? usable.reduce((a, b) => (a.date > b.date ? a : b)) : undefined;
    return { area, risk, latestObservationDate: latest?.date };
  });

  const realCount = areas.filter((a) => !a.demonstration).length;
  const latestDate = points
    .map((p) => p.latestObservationDate)
    .filter((x): x is string => Boolean(x))
    .sort()
    .reverse()[0];

  return (
    <div className="hero">
      <header className="hero-topbar">
        <div className="hero-topbar-inner">
          <div className="hero-brand">
            <img src="/logo.svg" alt="" className="hero-brand-mark" />
            <div className="hero-brand-text">
              <span className="hero-brand-name">INVISIBLE GRAZING</span>
              <span className="hero-brand-tag">See the pressure before the damage.</span>
            </div>
          </div>
          <Link to="/dashboard" className="hero-nav-cta">
            Enter platform <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <section className="hero-main">
        <div className="hero-copy">
          <h1 className="hero-title">
            Satellite intelligence for the world&rsquo;s rangelands.
          </h1>
          <p className="hero-lede">
            Invisible Grazing identifies vegetation changes from real Sentinel-2
            satellite observations and highlights areas that may require
            grazing-pressure investigation &mdash; before damage becomes visible on
            the ground.
          </p>

          <div className="hero-cta-row">
            <Link to="/dashboard" className="hero-cta-primary">
              Enter the platform
              <ArrowRight size={16} />
            </Link>
            <Link to="/about" className="hero-cta-secondary">
              How the method works
            </Link>
          </div>

          <ul className="hero-features">
            <li>
              <Satellite size={15} />
              <span>Real Sentinel-2 NDVI, cloud-masked via ESA Copernicus</span>
            </li>
            <li>
              <Droplets size={15} />
              <span>Real NASA POWER rainfall context, keyless and global</span>
            </li>
            <li>
              <Activity size={15} />
              <span>Transparent, rules-based risk index with cited evidence</span>
            </li>
            <li>
              <ShieldCheck size={15} />
              <span>Never claims overgrazing &mdash; flags areas worth investigating</span>
            </li>
          </ul>
        </div>

        <div className="hero-map-wrap">
          <div className="hero-map-head">
            <span className="hero-map-label">Live coverage</span>
            <span className="hero-map-meta">
              {realCount > 0
                ? `${realCount} real ${realCount === 1 ? 'area' : 'areas'} · latest ${formatDate(latestDate)}`
                : 'Demonstration scenarios shown'}
            </span>
          </div>
          <WorldMap points={points} height="100%" />
          <div className="hero-map-foot">
            <span className="hero-map-dot" data-risk="low" /> Low
            <span className="hero-map-dot" data-risk="moderate" /> Moderate
            <span className="hero-map-dot" data-risk="high" /> High
            <span className="hero-map-dot" data-risk="insufficient" /> Insufficient data
            <span className="hero-map-note">Dashed ring = demonstration scenario</span>
          </div>
        </div>
      </section>

      <footer className="hero-footer">
        <span>Invisible Grazing &mdash; global rangeland intelligence</span>
        <span className="ig-soft">
          Developed by Gabolekwe Topo Gabolekwe · Metric units · ISO dates · UTC
        </span>
      </footer>
    </div>
  );
}
