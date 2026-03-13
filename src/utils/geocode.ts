export interface GeoPlace { streetName: string; city: string; display: string; }

export async function reverseGeocode(lat: number, lng: number): Promise<GeoPlace | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const d = await r.json();
    const a = d.address ?? {};
    const street = a.road ?? a.street ?? a.pedestrian ?? a.path ?? '';
    const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? '';
    return { streetName: street, city, display: [street, city].filter(Boolean).join(', ') || 'Current location' };
  } catch { return null; }
}
