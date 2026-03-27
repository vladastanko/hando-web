import { useEffect, useRef, useState, useCallback } from 'react';
import type { Job } from '../../types';

// Uses MapLibre GL JS (open source Mapbox fork) + OpenFreeMap tiles
// 100% free, no token needed, no limits
// Tiles: https://openfreemap.org

declare global {
  interface Window {
    maplibregl: {
      Map: new (options: object) => MLMap;
      Marker: new (options?: { element?: HTMLElement; anchor?: string }) => MLMarker;
      NavigationControl: new (options?: object) => object;
      AttributionControl: new (options?: object) => object;
    };
  }
}

interface MLMap {
  remove(): void;
  on(event: string, cb: () => void): void;
  flyTo(options: object): void;
  setCenter(center: [number, number]): void;
  getZoom(): number;
  addControl(control: object, position?: string): void;
}

interface MLMarker {
  setLngLat(coords: [number, number]): MLMarker;
  addTo(map: MLMap): MLMarker;
  remove(): void;
  getElement(): HTMLElement;
}

const DEFAULT_CENTER: [number, number] = [20.4633, 44.8176]; // [lng, lat]

function getCoords(job: Job): [number, number] | null {
  const lat = job.location?.lat ?? (job as unknown as Record<string, number>).lat;
  const lng = job.location?.lng ?? (job as unknown as Record<string, number>).lng;
  if (typeof lat === 'number' && typeof lng === 'number' && lat !== 0 && lng !== 0) {
    return [lng, lat];
  }
  return null;
}

interface Props {
  jobs: Job[];
  userLocation: { lat: number; lng: number } | null;
  selectedJobId?: string | null;
  onJobClick: (job: Job) => void;
}

export function JobMap({ jobs, userLocation, selectedJobId, onJobClick }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<MLMap | null>(null);
  const markersRef     = useRef<Map<string, MLMarker>>(new Map());
  const userMarkerRef  = useRef<MLMarker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  // ── Load MapLibre GL JS from CDN ───────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initMap = () => {
      const ml = window.maplibregl;
      if (!ml) { setLoadError('MapLibre failed to load'); return; }

      const map = new ml.Map({
        container: containerRef.current!,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: DEFAULT_CENTER,
        zoom: 11,
        attributionControl: false,
      });

      map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new ml.AttributionControl({ compact: true }), 'bottom-right');

      map.on('load', () => {
        mapRef.current = map;
        setMapLoaded(true);
      });
    };

    if (window.maplibregl) {
      initMap();
    } else {
      if (!document.querySelector('#ml-css')) {
        const link = document.createElement('link');
        link.id   = 'ml-css';
        link.rel  = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
        document.head.appendChild(link);
      }
      if (!document.querySelector('#ml-js')) {
        const script = document.createElement('script');
        script.id  = 'ml-js';
        script.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
        script.onload  = initMap;
        script.onerror = () => setLoadError('Could not load map library');
        document.head.appendChild(script);
      }
    }

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current.clear();
      if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // ── User location dot ──────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const ml = window.maplibregl;
    if (!ml) return;

    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }

    if (userLocation) {
      const el = document.createElement('div');
      el.style.cssText = `
        width:16px;height:16px;border-radius:50%;
        background:#5b5ef4;border:3px solid #fff;
        box-shadow:0 0 0 5px rgba(91,94,244,0.25);
        pointer-events:none;
      `;
      userMarkerRef.current = new ml.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(mapRef.current);

      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 12, duration: 1200,
      });
    }
  }, [mapLoaded, userLocation]);

  // ── Job markers ────────────────────────────────────────────
  const updateMarkers = useCallback(() => {
    if (!mapLoaded || !mapRef.current) return;
    const ml = window.maplibregl;
    if (!ml) return;

    const currentIds = new Set(jobs.map(j => j.id));

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) { marker.remove(); markersRef.current.delete(id); }
    });

    jobs.forEach(job => {
      const coords = getCoords(job);
      if (!coords) return;

      const isSelected = selectedJobId === job.id;
      const existing   = markersRef.current.get(job.id);

      if (existing) {
        const bubble = existing.getElement().querySelector('.jbubble') as HTMLElement | null;
        if (bubble) applyBubbleStyle(bubble, isSelected);
        return;
      }

      const el = document.createElement('div');
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div class="jbubble" style="${bubbleStyleStr(isSelected)}">
          <div style="font-size:10px;font-weight:700;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${escHtml(job.title)}
          </div>
          <div style="font-size:9px;font-weight:800;opacity:0.9;">
            ${job.pay_per_worker.toLocaleString()} RSD
          </div>
        </div>
      `;
      el.addEventListener('click', () => onJobClick(job));

      const marker = new ml.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(coords)
        .addTo(mapRef.current!);

      markersRef.current.set(job.id, marker);
    });
  }, [mapLoaded, jobs, selectedJobId, onJobClick]);

  useEffect(() => { updateMarkers(); }, [updateMarkers]);

  // ── Fly to selected job ────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !selectedJobId) return;
    const job = jobs.find(j => j.id === selectedJobId);
    if (!job) return;
    const coords = getCoords(job);
    if (!coords) return;
    mapRef.current.flyTo({ center: coords, zoom: 14, duration: 800 });
  }, [selectedJobId, mapLoaded, jobs]);

  if (loadError) {
    return (
      <div className="map-sh" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 10, background: 'var(--bg-ov)',
        color: 'var(--tx-2)', fontSize: '.875rem', padding: 24, textAlign: 'center',
      }}>
        <span style={{ fontSize: '2rem' }}>🗺</span>
        <span>{loadError}</span>
        <span style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>Check your internet connection</span>
      </div>
    );
  }

  return (
    <div className="map-sh" style={{ position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {!mapLoaded && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 10, background: 'var(--bg-ov)',
          color: 'var(--tx-2)', fontSize: '.875rem',
        }}>
          <span className="spin" />Loading map...
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────
function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function bubbleStyleStr(selected: boolean): string {
  return [
    `background:${selected ? 'linear-gradient(135deg,#4F7CFF,#8A3FFC)' : '#18181f'}`,
    `color:${selected ? '#fff' : '#eeeeff'}`,
    `border:2px solid ${selected ? '#6257FF' : 'rgba(255,255,255,0.1)'}`,
    'border-radius:20px',
    'padding:5px 11px',
    'white-space:nowrap',
    'box-shadow:0 4px 20px rgba(0,0,0,0.55)',
    "font-family:'Plus Jakarta Sans',system-ui,sans-serif",
    'display:flex',
    'flex-direction:column',
    'gap:1px',
    `transform:${selected ? 'scale(1.08)' : 'scale(1)'}`,
    'transition:all 0.15s ease',
    'pointer-events:none',
  ].join(';');
}

function applyBubbleStyle(el: HTMLElement, selected: boolean): void {
  el.style.background  = selected ? 'linear-gradient(135deg,#4F7CFF,#8A3FFC)' : '#18181f';
  el.style.color       = selected ? '#fff' : '#eeeeff';
  el.style.border      = `2px solid ${selected ? '#6257FF' : 'rgba(255,255,255,0.1)'}`;
  el.style.transform   = selected ? 'scale(1.08)' : 'scale(1)';
}
