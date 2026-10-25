import type { GeoPoint } from './types';

const EARTH_RADIUS_METERS = 6371000;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

// Distance along the earth's surface (haversine)
export function metersBetween(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Compass bearing from one point to another, in degrees clockwise from north
export function bearingDegrees(from: GeoPoint, to: GeoPoint): number {
  const dLng = rad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(rad(to.lat));
  const x = Math.cos(rad(from.lat)) * Math.sin(rad(to.lat))
    - Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
