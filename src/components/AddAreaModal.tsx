import { useState } from 'react';
import type { MonitoringArea, ObservationSeries } from '../types';
import { fetchSentinel2Ndvi } from '../lib/providers/sentinel2';
import { fetchNasaPowerRainfall } from '../lib/providers/nasaPower';
import { newAreaId } from '../lib/areas';
import { formatLatLon } from '../lib/format';
import './AddAreaModal.css';

interface Props {
  latitude: number;
  longitude: number;
  onCancel: () => void;
  onCreated: (area: MonitoringArea) => void;
}

type Stage = 'form' | 'loading' | 'done' | 'error';

export default function AddAreaModal({ latitude, longitude, onCancel, onCreated }: Props) {
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [radiusKm, setRadiusKm] = useState(25);
  const [years, setYears] = useState(3);
  const [stage, setStage] = useState<Stage>('form');
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  async function create() {
    if (!name.trim()) {
      setError('Please give the area a name.');
      return;
    }
    setStage('loading');
    setError('');

    const toIso = new Date().toISOString();
    const fromIso = new Date(Date.now() - years * 365 * 86_400_000).toISOString();

    const series: ObservationSeries[] = [];
    const notes: string[] = [];

    // 1. Sentinel-2 NDVI
    try {
      setStatus('Fetching real Sentinel-2 NDVI…');
      const ndvi = await fetchSentinel2Ndvi(
        {
          id: 'pending',
          name,
          latitude,
          longitude,
          radiusKm,
          demonstration: false,
          createdAt: toIso,
          series: [],
        },
        { fromIso, toIso, radiusKm },
      );
      const valid = ndvi.observations.filter((o) => o.value != null).length;
      series.push(ndvi);
      notes.push(`Sentinel-2: ${valid} usable intervals`);
    } catch (e) {
      notes.push(`Sentinel-2 unavailable (${String(e).slice(0, 80)}…)`);
    }

    // 2. NASA POWER rainfall
    try {
      setStatus('Fetching real NASA POWER rainfall…');
      const rain = await fetchNasaPowerRainfall(
        { id: 'pending', name, latitude, longitude, demonstration: false, createdAt: toIso, series: [] },
        new Date(fromIso).getUTCFullYear(),
      );
      series.push(rain);
      notes.push(`NASA POWER: ${rain.observations.length} monthly values`);
    } catch (e) {
      notes.push(`NASA POWER unavailable (${String(e).slice(0, 80)}…)`);
    }

    if (series.length === 0) {
      setStage('error');
      setError('Could not reach any data provider. ' + notes.join(' · '));
      return;
    }

    const area: MonitoringArea = {
      id: newAreaId(),
      name: name.trim(),
      region: region.trim() || undefined,
      latitude,
      longitude,
      radiusKm,
      demonstration: false,
      createdAt: toIso,
      series,
      description: `User-defined area. Created ${toIso.slice(0, 10)}. Data: ${notes.join(' · ')}.`,
    };

    setStage('done');
    setStatus(notes.join(' · '));
    onCreated(area);
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Define a monitoring area</h3>
          <button className="modal-close" onClick={onCancel} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          <div className="modal-coord">
            <span className="ig-muted">Coordinates</span>
            <span className="modal-coord-value">{formatLatLon(latitude, longitude)}</span>
          </div>

          <label className="modal-field">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Northern rangeland block 4"
              autoFocus
              disabled={stage === 'loading' || stage === 'done'}
            />
          </label>

          <label className="modal-field">
            <span>Region / country (optional)</span>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Laikipia County, Kenya"
              disabled={stage === 'loading' || stage === 'done'}
            />
          </label>

          <div className="modal-row">
            <label className="modal-field">
              <span>Radius (km)</span>
              <input
                type="number"
                min={5}
                max={100}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value) || 25)}
                disabled={stage === 'loading' || stage === 'done'}
              />
            </label>
            <label className="modal-field">
              <span>History (years)</span>
              <input
                type="number"
                min={1}
                max={5}
                value={years}
                onChange={(e) => setYears(Number(e.target.value) || 3)}
                disabled={stage === 'loading' || stage === 'done'}
              />
            </label>
          </div>

          {stage === 'loading' && (
            <div className="modal-status">
              <span className="modal-spinner" aria-hidden="true" />
              {status}
            </div>
          )}
          {stage === 'done' && (
            <div className="modal-status modal-status-ok">
              Real observations ready — opening investigation…
            </div>
          )}
          {error && <div className="modal-status modal-status-err">{error}</div>}
        </div>

        <div className="modal-foot">
          <button className="btn-secondary" onClick={onCancel} disabled={stage === 'loading'}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={create}
            disabled={stage === 'loading' || stage === 'done' || !name.trim()}
          >
            {stage === 'loading' ? 'Fetching…' : 'Fetch real data & create area'}
          </button>
        </div>
      </div>
    </div>
  );
}
