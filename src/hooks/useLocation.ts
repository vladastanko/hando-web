import { useState, useCallback, useRef, useEffect } from 'react';
import { reverseGeocode, type GeoPlace } from '../utils/geocode';

export interface UserLocation { lat: number; lng: number; place?: GeoPlace; }

export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const hasInitial = useRef(false);

  const request = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        resolve();
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        async pos => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const place = await reverseGeocode(lat, lng);
          setLocation({ lat, lng, place: place ?? undefined });
          setLoading(false);
          hasInitial.current = true;
          resolve();
        },
        err => {
          setError(err.message);
          setLoading(false);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
      );
    });
  }, []);

  // Set up watchPosition once after initial fix
  useEffect(() => {
    if (!navigator.geolocation) return;

    watchId.current = navigator.geolocation.watchPosition(
      async pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Reverse geocode only on first watch update
        const place = !hasInitial.current
          ? await reverseGeocode(lat, lng)
          : undefined;
        setLocation(prev => ({
          lat, lng,
          place: place ?? prev?.place,
        }));
        hasInitial.current = true;
      },
      () => { /* silent watch errors */ },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, []);

  return { location, loading, error, request };
}
