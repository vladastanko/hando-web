import { useMemo, useEffect, useState } from 'react';
import type { Job } from '../../types';

const DEFAULT_CENTER: [number, number] = [44.8176, 20.4633];

function getCoords(job: Job): [number, number] | null {
  const lat = job.location?.lat, lng = job.location?.lng;
  return typeof lat === 'number' && typeof lng === 'number' ? [lat, lng] : null;
}

interface Props {
  jobs: Job[];
  userLocation: { lat: number; lng: number } | null;
  selectedJobId?: string | null;
  onJobClick: (job: Job) => void;
}

// Lazy-load the actual map components so Leaflet never runs during SSR or
// before the browser DOM is ready. This is the standard fix for black screens.
export function JobMap({ jobs, userLocation, selectedJobId, onJobClick }: Props) {
  const [MapComponents, setMapComponents] = useState<React.ComponentType<Props> | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // Dynamically import everything that touches Leaflet's window/document
    import('./JobMapInner')
      .then(mod => setMapComponents(() => mod.JobMapInner))
      .catch(() => setLoadError(true));
  }, []);

  if (loadError) {
    return (
      <div className="map-sh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-ov)', color: 'var(--tx-2)', fontSize: '.875rem' }}>
        Map could not be loaded
      </div>
    );
  }

  if (!MapComponents) {
    return (
      <div className="map-sh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-ov)', color: 'var(--tx-2)', gap: 10 }}>
        <span className="spin" />
        <span style={{ fontSize: '.875rem' }}>Loading map...</span>
      </div>
    );
  }

  return <MapComponents jobs={jobs} userLocation={userLocation} selectedJobId={selectedJobId} onJobClick={onJobClick} />;
}
