import { useState, useCallback } from 'react';
import { reverseGeocode, type GeoPlace } from '../utils/geocode';

export interface UserLocation { lat: number; lng: number; place?: GeoPlace; }

export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          const lat = pos.coords.latitude, lng = pos.coords.longitude;
          const place = await reverseGeocode(lat, lng);
          setLocation({ lat, lng, place: place ?? undefined });
          setLoading(false);
          resolve();
        },
        err => {
          setError(err.message);
          setLoading(false);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  return { location, loading, error, request };
}
