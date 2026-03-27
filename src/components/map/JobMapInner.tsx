import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Job } from '../../types';

const DEFAULT_CENTER: [number, number] = [44.8176, 20.4633];

function getCoords(job: Job): [number, number] | null {
  // Handle both {location: {lat, lng}} (from getNearby RPC) and flat lat/lng fields (from getAll)
  const lat = job.location?.lat ?? (job as unknown as Record<string, number>).lat;
  const lng = job.location?.lng ?? (job as unknown as Record<string, number>).lng;
  return typeof lat === 'number' && typeof lng === 'number' && lat !== 0 && lng !== 0 ? [lat, lng] : null;
}

function createPin(label: string, title: string, selected: boolean) {
  return L.divIcon({
    className: 'jmap-pin',
    html: `<div class="jmap-bub${selected ? ' sel' : ''}">
      <div class="jmap-bub-title">${title}</div>
      <div class="jmap-bub-pay">${label}</div>
    </div>`,
    iconSize: [1, 1] as [number, number],
    iconAnchor: [60, 44] as [number, number],
    popupAnchor: [0, -46] as [number, number],
  });
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center[0], center[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

interface Props {
  jobs: Job[];
  userLocation: { lat: number; lng: number } | null;
  selectedJobId?: string | null;
  onJobClick: (job: Job) => void;
}

export function JobMapInner({ jobs, userLocation, selectedJobId, onJobClick }: Props) {
  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : DEFAULT_CENTER;

  const mapped = useMemo(() => jobs.filter(j => getCoords(j)), [jobs]);

  return (
    <div className="map-sh">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='© <a href="https://carto.com">CARTO</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        <Recenter center={center} />

        {userLocation && (
          <CircleMarker
            center={center}
            radius={9}
            pathOptions={{ color: '#5b5ef4', fillColor: '#5b5ef4', fillOpacity: 0.85, weight: 2 }}
          >
            <Popup>
              <div className="map-pop"><strong>📍 You are here</strong></div>
            </Popup>
          </CircleMarker>
        )}

        {mapped.map(job => {
          const coords = getCoords(job)!;
          const label = `${job.pay_per_worker.toLocaleString()} RSD`;
          return (
            <Marker
              key={job.id}
              position={coords}
              icon={createPin(label, job.title, selectedJobId === job.id)}
              eventHandlers={{ click: () => onJobClick(job) }}
            >
              <Popup>
                <div className="map-pop" style={{ cursor: 'pointer' }} onClick={() => onJobClick(job)}>
                  <div className="map-pop-title">{job.title}</div>
                  <div className="map-pop-sub">
                    📍 {job.city}
                    {job.distance_km != null ? ` · ${job.distance_km.toFixed(1)} km` : ''}
                  </div>
                  <div className="map-pop-pay">{job.pay_per_worker.toLocaleString()} RSD / worker</div>
                  <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#5b5ef4', fontWeight: 600 }}>Tap to see details →</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
