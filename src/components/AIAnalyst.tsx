// =============================================================================
// INVISIBLE GRAZING — AI analyst panel
// =============================================================================
// Calls /api/analyse with only the observed numbers for the area. The model
// writes a three-sentence note describing what the data shows and what it does
// not establish. It never sees or invents values beyond what we send.
// =============================================================================

import { useMemo, useState } from 'react';
import { Sparkles, RefreshCw, TriangleAlert } from 'lucide-react';
import type { MonitoringArea, RiskAssessment } from '../types';
import './AIAnalyst.css';

interface Props {
  area: MonitoringArea;
  risk: RiskAssessment;
}

function summariseNdvi(area: MonitoringArea) {
  const ndvi = area.series.find((s) => s.indicator === 'NDVI');
  if (!ndvi) return undefined;
  const usable = ndvi.observations.filter((o) => o.value != null);
  if (!usable.length) return undefined;

  const sorted = [...usable].sort((a, b) => a.date.localeCompare(b.date));
  const earliest = sorted[0];
  const latest = sorted[sorted.length - 1];

  const cutoff = new Date(latest.date);
  cutoff.setMonth(cutoff.getMonth() - 12);
  const recent = sorted.filter((o) => new Date(o.date) >= cutoff);
  const baseline = sorted.filter((o) => new Date(o.date) < cutoff);

  const mean = (xs: typeof sorted) =>
    xs.length ? xs.reduce((a, b) => a + (b.value as number), 0) / xs.length : null;

  const recentMean = mean(recent);
  const baselineMean = mean(baseline);
  const delta =
    recentMean != null && baselineMean != null ? recentMean - baselineMean : null;

  return {
    latestDate: latest.date,
    latestValue: latest.value,
    baselineMean: baselineMean != null ? Number(baselineMean.toFixed(3)) : null,
    recentMean: recentMean != null ? Number(recentMean.toFixed(3)) : null,
    delta: delta != null ? Number(delta.toFixed(3)) : null,
    observationCount: usable.length,
    earliestDate: earliest.date,
  };
}

function summariseRainfall(area: MonitoringArea) {
  const rain = area.series.find((s) => s.indicator === 'Rainfall');
  if (!rain) return undefined;
  const usable = rain.observations.filter((o) => o.value != null);
  if (!usable.length) return undefined;

  const sorted = [...usable].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const cutoff = new Date(latest.date);
  cutoff.setMonth(cutoff.getMonth() - 12);
  const recent = sorted.filter((o) => new Date(o.date) >= cutoff);
  const baseline = sorted.filter((o) => new Date(o.date) < cutoff);

  const mean = (xs: typeof sorted) =>
    xs.length ? xs.reduce((a, b) => a + (b.value as number), 0) / xs.length : null;

  const recentMean = mean(recent);
  const baselineMean = mean(baseline);
  const pct =
    recentMean != null && baselineMean != null && baselineMean !== 0
      ? ((recentMean - baselineMean) / baselineMean) * 100
      : null;

  return {
    recentMean: recentMean != null ? Number(recentMean.toFixed(1)) : null,
    baselineMean: baselineMean != null ? Number(baselineMean.toFixed(1)) : null,
    percentChange: pct != null ? Number(pct.toFixed(0)) : null,
    observationCount: usable.length,
  };
}

export default function AIAnalyst({ area, risk }: Props) {
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const payload = useMemo(
    () => ({
      areaName: area.name,
      region: area.region,
      countryCode: area.countryCode,
      latitude: area.latitude,
      longitude: area.longitude,
      radiusKm: area.radiusKm,
      demonstration: false,
      riskLevel: risk.level,
      riskHeadline: risk.headline,
      evidence: risk.evidence.map((e) => ({
        label: e.label,
        value: e.value,
        direction: e.direction,
      })),
      ndvi: summariseNdvi(area),
      rainfall: summariseRainfall(area),
      alternativeExplanations: risk.alternativeExplanations,
    }),
    [area, risk],
  );

  async function requestNote() {
    setLoading(true);
    setError('');
    setNote('');
    try {
      const r = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`Analyst request failed: ${r.status} ${text.slice(0, 200)}`);
      }
      const json = await r.json();
      const extracted =
        (json as { note?: string }).note ??
        (json as { choices?: Array<{ message?: { content?: string } }> })
          .choices?.[0]?.message?.content ??
        '';
      const trimmed = extracted.trim();
      if (!trimmed) throw new Error('Empty analyst response.');
      setNote(trimmed);
    } catch (e) {
      setError(String(e).replace(/^Error:\s*/, ''));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ai-card">
      <div className="ai-card-head">
        <span className="ai-card-title">
          <Sparkles size={14} /> AI analyst note
        </span>
        <span className="ai-card-model">openai/gpt-oss-120b · Groq</span>
      </div>

      <p className="ai-card-intro">
        A short, generated reading of the observed values on this page. It uses only
        the numbers already shown and does not add or estimate anything.
      </p>

      {note && (
        <blockquote className="ai-note">
          {note.split(/(?<=\.)\s+/).map((sentence, i) => (
            <p key={i}>{sentence.trim()}</p>
          ))}
        </blockquote>
      )}

      {error && (
        <div className="ai-error">
          <TriangleAlert size={13} /> {error}
        </div>
      )}

      <div className="ai-card-actions">
        <button className="ai-btn" onClick={requestNote} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw size={13} className="ai-spin" /> Generating…
            </>
          ) : (
            <>
              <Sparkles size={13} /> {note ? 'Regenerate note' : 'Generate analyst note'}
            </>
          )}
        </button>
        {note && (
          <span className="ai-disclaimer">
            Generated text — review alongside the evidence before acting on it.
          </span>
        )}
      </div>
    </section>
  );
}
