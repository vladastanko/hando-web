import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Job } from '../../types';

const DEFAULT_CENTER: [number, number] = [44.8176, 20.4633];

function getCoords(job: Job): [number, number] | null {
  const lat = job.location?.lat, lng = job.location?.lng;
  return typeof lat === 'number' && typeof lng === 'number' ? [lat, lng] : null;
}

function createPin(label: string, selected: boolean) {
  return L.divIcon({
    className: 'jmap-pin',
    html: `<div class="jmap-bub${selected ? ' sel' : ''}">${label}</div>`,
    iconSize: [1, 1] as [number, number],
    iconAnchor: [24, 20] as [number, number],
    popupAnchor: [0, -22] as [number, number],
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
          attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
              icon={createPin(label, selectedJobId === job.id)}
              eventHandlers={{ click: () => onJobClick(job) }}
            >
              <Popup>
                <div className="map-pop">
                  <div className="map-pop-title">{job.title}</div>
                  <div className="map-pop-sub">
                    📍 {job.city}
                    {job.distance_km != null ? ` · ${job.distance_km.toFixed(1)} km` : ''}
                  </div>
                  <div className="map-pop-pay">{job.pay_per_worker.toLocaleString()} RSD / worker</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
