import * as Location from 'expo-location';

export interface Fix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export class LocationUnavailable extends Error {}

/** One high-accuracy GPS reading, asking for permission when needed. */
export async function currentFix(): Promise<Fix> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new LocationUnavailable('Location permission is needed to clock in at your clinic. Enable it in Settings.');
  }
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy ?? null };
  } catch {
    throw new LocationUnavailable('Could not get your location. Move to an open area and try again.');
  }
}

/** Great-circle distance in metres (mirrors the server's check). */
export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const r = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return Math.round(r * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

export function humanDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}
