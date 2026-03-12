import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Job } from '../types';

type Props = {
  jobs: Job[];
  loading: boolean;
  onRefresh: () => void;
  userLocation: { lat: number; lng: number } | null;
  onRequestLocation: () => void;
  locationLoading: boolean;
};

type ViewMode = 'list' | 'map';

const DEFAULT_CENTER: [number, number] = [44.8176, 20.4633];

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getJobCoords(job: Job): [number, number] | null {
  const lat = job.location?.lat;
  const lng = job.location?.lng;
  if (typeof lat === 'number' && typeof lng === 'number') return [lat, lng];
  return null;
}

function getInitials(text: string) {
  return text
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom(), { animate: true });
  return null;
}

function createJobIcon(label: string) {
  return L.divIcon({
    className: 'job-marker-wrapper',
    html: `<div class="job-marker">${label}</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -20],
  });
}

export default function HomeScreen({
  jobs,
  loading,
  onRefresh,
  userLocation,
  onRequestLocation,
  locationLoading,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('map');

  const center = userLocation
    ? [userLocation.lat, userLocation.lng] as [number, number]
    : DEFAULT_CENTER;

  const mappedJobs = useMemo(
    () => jobs.filter((job) => getJobCoords(job)),
    [jobs]
  );

  return (
    <div className="home-stack">
      <section className="hero-card panel">
        <div className="hero-copy">
          <div className="eyebrow">👋 Welcome back</div>
          <h2 className="hero-title">Find nearby jobs faster</h2>
          <p className="hero-text">
            Browse live tasks, switch to the map view, and spot open jobs around your current location.
          </p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-ghost" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh feed'}
          </button>
          <button className="btn" onClick={onRequestLocation} disabled={locationLoading}>
            {locationLoading ? 'Locating...' : userLocation ? 'Update my location' : 'Enable location'}
          </button>
        </div>
      </section>

      <section className="section-head">
        <div>
          <h3>Discover jobs</h3>
          <p>List and map stay synced with the same live Supabase data.</p>
        </div>
        <div className="view-switch">
          <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>Map</button>
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>List</button>
        </div>
      </section>

      {viewMode === 'map' ? (
        <section className="panel map-panel">
          <div className="map-toolbar">
            <div>
              <strong>{mappedJobs.length}</strong> jobs with map coordinates
            </div>
            <div className="map-note">
              {userLocation
                ? 'Your current browser location is shown on the map.'
                : 'Allow location to center the map around the user.'}
            </div>
          </div>

          <div className="map-shell">
            <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRecenter center={center} />

              {userLocation && (
                <CircleMarker center={center} radius={10} pathOptions={{ color: '#6c63ff', fillColor: '#6c63ff', fillOpacity: 0.8 }}>
                  <Popup>You are here</Popup>
                </CircleMarker>
              )}

              {mappedJobs.map((job) => {
                const coords = getJobCoords(job)!;
                return (
                  <Marker key={job.id} position={coords} icon={createJobIcon(getInitials(job.title))}>
                    <Popup>
                      <div className="map-popup">
                        <strong>{job.title}</strong>
                        <div>{job.city}</div>
                        <div>{job.address}</div>
                        <div>{job.pay_per_worker} RSD / worker</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </section>
      ) : null}

      {(viewMode === 'list' || mappedJobs.length === 0) && (
        <section className="job-list-grid">
          {loading ? (
            <div className="empty-state">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="empty-state">No open jobs yet.</div>
          ) : (
            jobs.map((job) => {
              const spotsLeft = Math.max((job.crew_size || 0) - (job.accepted_workers || 0), 0);
              return (
                <article className="job-card job-card-rich" key={job.id}>
                  <div className="job-card-top">
                    <span className="badge badge-open">Open</span>
                    <span className="badge">{job.category?.name || job.city}</span>
                  </div>

                  <h3>{job.title}</h3>
                  <p className="job-description">{job.description}</p>

                  <div className="job-meta-row">
                    <span>📍 {job.city}</span>
                    <span>🗓 {formatDate(job.scheduled_date)}</span>
                  </div>
                  <div className="job-meta-row">
                    <span>💰 {job.pay_per_worker} RSD / worker</span>
                    <span>👥 {spotsLeft} spots left</span>
                  </div>
                  <div className="job-address">{job.address}</div>
                </article>
              );
            })
          )}
        </section>
      )}
    </div>
  );
}
