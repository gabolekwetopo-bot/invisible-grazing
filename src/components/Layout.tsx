// =============================================================================
// INVISIBLE GRAZING — Layout (header, nav, footer, persistent demo notice)
// =============================================================================

import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';
import { Globe2, LayoutDashboard, Info, FileText, TriangleAlert } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/map', label: 'World Map', icon: Globe2 },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/about', label: 'About & Method', icon: Info },
];

export default function Layout() {
  return (
    <div className="ig-layout">
      <header className="ig-header">
        <div className="ig-header-inner">
          <NavLink to="/" className="ig-brand">
            <img src="/logo.svg" alt="" className="ig-brand-mark" aria-hidden="true" />
            <div className="ig-brand-text">
              <span className="ig-brand-name">INVISIBLE GRAZING</span>
              <span className="ig-brand-tag">See the pressure before the damage.</span>
            </div>
          </NavLink>

          <nav className="ig-nav" aria-label="Primary">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => 'ig-nav-link' + (isActive ? ' is-active' : '')}
              >
                <Icon size={16} strokeWidth={2} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <div className="ig-demo-banner" role="status">
        <TriangleAlert size={14} />
        <span>
          <strong>Demonstration scenarios are labelled.</strong> Real observations from
          public providers are shown with their source and date. This MVP does not
          claim verified global coverage.
        </span>
      </div>

      <main className="ig-main">
        <Outlet />
      </main>

      <footer className="ig-footer">
        <div className="ig-container ig-footer-inner">
          <span>
            Invisible Grazing — global rangeland intelligence.
          </span>
          <span className="ig-soft">Developed by Gabolekwe Topo Gabolekwe · Metric units · ISO dates · UTC</span>
        </div>
      </footer>
    </div>
  );
}
