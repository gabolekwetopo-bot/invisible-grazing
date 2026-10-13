// =============================================================================
// INVISIBLE GRAZING — Recommended next steps, as working actions
// =============================================================================
// Each recommendation is a button that performs a real action on the page:
//   1. Compare neighbours — opens a side-by-side chart against nearby areas
//   2. Review rainfall — scrolls to and highlights the rainfall series
//   3. Full report — opens the printable report view
// =============================================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GitCompare, Droplets, Printer, Loader2, Sparkles } from 'lucide-react';
import type { MonitoringArea, RiskAssessment } from '../types';
import './ActionPanel.css';

interface Props {
  area: MonitoringArea;
  risk: RiskAssessment;
  onCompare: () => void;
  onReviewRainfall: () => void;
}

type ActionState = 'idle' | 'working' | 'done';

export default function ActionPanel({ area, risk, onCompare, onReviewRainfall }: Props) {
  const [compareState, setCompareState] = useState<ActionState>('idle');
  const [rainState, setRainState] = useState<ActionState>('idle');

  const hasRain = area.series.some((s) => s.indicator === 'Rainfall');

  function handleCompare() {
    setCompareState('working');
    setTimeout(() => {
      onCompare();
      setCompareState('done');
    }, 220);
  }

  function handleRain() {
    setRainState('working');
    setTimeout(() => {
      onReviewRainfall();
      setRainState('done');
    }, 220);
  }

  // The three recommendations are the same as before, but the wording now
  // matches what the button will actually do.
  const actions = [
    {
      id: 'compare',
      label: 'Compare with neighbouring areas',
      detail:
        'Open a side-by-side chart of this area against nearby sites to see whether the change is local or regional.',
      icon: GitCompare,
      onClick: handleCompare,
      state: compareState,
      disabled: false,
    },
    {
      id: 'rain',
      label: 'Review recent rainfall records',
      detail:
        hasRain
          ? 'Highlight the rainfall series and show the change over the assessment window.'
          : 'No rainfall series is available for this area.',
      icon: Droplets,
      onClick: handleRain,
      state: rainState,
      disabled: !hasRain,
    },
    {
      id: 'ai-report',
      label: 'Full AI report (printable)',
      detail:
        'Generate a structured report covering vegetation change, rainfall context, possible causes to investigate, and recommended field verification. Print-ready.',
      icon: Sparkles,
      to: `/area/${area.id}/report?ai=1`,
      state: 'idle' as ActionState,
      disabled: false,
    },
    {
      id: 'report',
      label: 'Open printable report (data only)',
      detail:
        'Single-page report with location, observation period, evidence, and data provenance. No AI narrative.',
      icon: Printer,
      to: `/area/${area.id}/report`,
      state: 'idle' as ActionState,
      disabled: false,
    },
  ];

  return (
    <div className="action-panel">
      {actions.map((a) => {
        const Icon = a.icon;
        const busy = a.state === 'working';
        const done = a.state === 'done';

        const content = (
          <>
            <span className="action-icon">
              {busy ? <Loader2 size={15} className="action-spin" /> : <Icon size={15} />}
            </span>
            <span className="action-text">
              <span className="action-label">{a.label}</span>
              <span className="action-detail">{a.detail}</span>
            </span>
            <span className="action-state">
              {done ? 'Done' : busy ? 'Working' : 'Run →'}
            </span>
          </>
        );

        if (a.to) {
          return (
            <Link key={a.id} to={a.to} className={'action-row' + (a.disabled ? ' is-disabled' : '')}>
              {content}
            </Link>
          );
        }

        return (
          <button
            key={a.id}
            className={'action-row' + (a.disabled ? ' is-disabled' : '') + (done ? ' is-done' : '')}
            onClick={a.onClick}
            disabled={a.disabled || busy}
          >
            {content}
          </button>
        );
      })}
      <p className="action-footnote">
        These actions operate on the observations already shown on this page. Nothing
        is inferred. Fire history is documented as a planned extension.
      </p>
      <p className="action-footnote ig-soft">
        Current classification: <strong>{risk.level}</strong> — {risk.headline}
      </p>
    </div>
  );
}
