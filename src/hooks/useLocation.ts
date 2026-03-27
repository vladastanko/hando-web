import { useState, useCallback, useRef } from 'react';
import { reverseGeocode, type GeoPlace } from '../utils/geocode';

export interface UserLocation { lat: number; lng: number; place?: GeoPlace; }

export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);

  const request = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        resolve();
        return;
      }

      // Clear any existing watch
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }

      setLoading(true);
      setError(null);

      // First: get a fast fix
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const place = await reverseGeocode(lat, lng);
          setLocation({ lat, lng, place: place ?? undefined });
          setLoading(false);
          resolve();

          // Then watch for continuous updates (less aggressive)
          watchRef.current = navigator.geolocation.watchPosition(
            async wp => {
              const wlat = wp.coords.latitude;
              const wlng = wp.coords.longitude;
              // Only update if moved > 20m
              const dlat = Math.abs(wlat - lat);
              const dlng = Math.abs(wlng - lng);
              if (dlat > 0.0002 || dlng > 0.0002) {
                const wplace = await reverseGeocode(wlat, wlng);
                setLocation({ lat: wlat, lng: wlng, place: wplace ?? undefined });
              }
            },
            _err => { /* silent watch errors */ },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
          );
        },
        err => {
          setError(err.message);
          setLoading(false);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });
  }, []);

  return { location, loading, error, request };
}
