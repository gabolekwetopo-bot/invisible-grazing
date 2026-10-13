import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import type { MonitoringArea, RiskAssessment } from '../types';
import { formatDate, formatLatLon } from '../lib/format';
import RiskBadge from './RiskBadge';

export interface MapPoint {
  area: MonitoringArea;
  risk: RiskAssessment;
  latestObservationDate?: string;
  /** When true the marker blinks to indicate a recent alert. */
  blip?: boolean;
}

const RISK_COLORS: Record<RiskAssessment['level'], string> = {
  low: '#4a7c59',
  moderate: '#b17a05',
  high: '#a8342a',
  insufficient: '#65635d',
};

const STADIA_KEY = import.meta.env.VITE_STADIA_API_KEY ?? '';

function ClickCatcher({ enabled, onClick }: { enabled: boolean; onClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      if (enabled) onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Diagnostic: prints every relevant dimension so we can see why Leaflet
 * believes the map is a different size than the container.
 */
function Diagnose() {
  const map = useMap();
  useEffect(() => {
    function report(tag: string) {
      const container = map.getContainer();
      const rect = container.getBoundingClientRect();
      const mapSize = map.getSize();
      const style = window.getComputedStyle(container);
      const parent = container.parentElement;
      const parentRect = parent?.getBoundingClientRect();
      // eslint-disable-next-line no-console
      console.log(`[IG MAP ${tag}]`, {
        containerTag: container.tagName,
        containerClass: container.className,
        // Leaflet's idea of the size
        leafletSize: { x: mapSize.x, y: mapSize.y },
        // The DOM's idea of the size
        domRect: { w: Math.round(rect.width), h: Math.round(rect.height) },
        domOffset: { left: Math.round(rect.left), top: Math.round(rect.top) },
        // CSS on the container
        css: {
          width: style.width,
          height: style.height,
          transform: style.transform,
          zoom: (style as unknown as { zoom?: string }).zoom,
          position: style.position,
          boxSizing: style.boxSizing,
        },
        // CSS on the parent
        parent: parent
          ? {
              tag: parent.tagName,
              class: parent.className,
              rect: parentRect ? { w: Math.round(parentRect.width), h: Math.round(parentRect.height) } : null,
              transform: window.getComputedStyle(parent).transform,
            }
          : null,
        devicePixelRatio: window.devicePixelRatio,
        // How many map containers exist in the DOM
        mapContainersInDom: document.querySelectorAll('.leaflet-container').length,
      });
    }

    report('mount');
    const t1 = window.setTimeout(() => report('t+100ms'), 100);
    const t2 = window.setTimeout(() => report('t+500ms'), 500);
    const t3 = window.setTimeout(() => report('t+1500ms'), 1500);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [map]);
  return null;
}

export default function WorldMap({
  points,
  center = [8, 20],
  zoom = 2,
  height = '520px',
  onSelect,
  pickMode = false,
  onPick,
}: {
  points: MapPoint[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onSelect?: (areaId: string) => void;
  pickMode?: boolean;
  onPick?: (lat: number, lon: number) => void;
}) {
  const stadiaUrl = STADIA_KEY
    ? `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${STADIA_KEY}`
    : `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png`;

  return (
    <div className={'ig-map-wrap' + (pickMode ? ' is-picking' : '')} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={2}
        maxZoom={16}
        worldCopyJump
        scrollWheelZoom
        style={{ height: '100%', width: '100%', cursor: pickMode ? 'crosshair' : undefined }}
      >
        <Diagnose />
        <TileLayer
          url={stadiaUrl}
          attribution='&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noreferrer">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          maxZoom={16}
        />
        <ClickCatcher enabled={pickMode} onClick={(lat, lon) => onPick?.(lat, lon)} />

        {points.map(({ area, risk, latestObservationDate, blip }) => {
          const color = RISK_COLORS[risk.level];
          const isDemo = area.demonstration;
          return (
            <CircleMarker
              key={area.id}
              center={[area.latitude, area.longitude]}
              radius={isDemo ? 8 : 10}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: isDemo ? 0.85 : 1,
                weight: 2,
                dashArray: isDemo ? '4 3' : undefined,
                className: blip
                  ? (risk.level === 'high' ? 'ig-blip ig-blip-halo' : 'ig-blip')
                  : undefined,
              }}
              eventHandlers={{ click: () => onSelect?.(area.id) }}
            >
              <Popup>
                <div style={{ minWidth: 240 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{area.name}</div>
                  <div style={{ color: 'var(--ig-text-muted)', fontSize: '0.8125rem', marginBottom: 8 }}>
                    {area.region ?? '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                    <RiskBadge level={risk.level} />
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--ig-text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                    {formatLatLon(area.latitude, area.longitude)}
                    <br />
                    Latest observation: {formatDate(latestObservationDate)}
                  </div>
                  <Link to={`/area/${area.id}`} style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Open investigation →
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
