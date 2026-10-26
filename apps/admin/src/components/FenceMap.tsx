import { Circle, CircleMarker, MapContainer, TileLayer } from 'react-leaflet';
import { latLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint } from '@grandcityrace/shared';
import { MAP_LAYERS } from '../utils/maps';

// A small map of a quest's place with its fence, so the radius can be seen
// against the streets around it: a fence too small to stand in, or one that
// takes in the next street
export function FenceMap({ location, radius }: { location: GeoPoint; radius: number }) {
  const center = latLng(location.lat, location.lng);
  // The fence with room around it, so its size reads against the streets
  const bounds = center.toBounds(Math.max(radius, 25) * 3);
  return (
    <div className="h-56 overflow-hidden rounded-lg border border-gray-200">
      <MapContainer
        key={`${location.lat},${location.lng},${radius}`}
        bounds={bounds}
        maxZoom={18}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer {...MAP_LAYERS.light} />
        <Circle center={center} radius={radius} pathOptions={{ color: '#111827', fillColor: '#111827', fillOpacity: 0.12, weight: 2 }} />
        <CircleMarker center={center} radius={4} pathOptions={{ color: '#111827', fillColor: '#111827', fillOpacity: 1, weight: 0 }} />
      </MapContainer>
    </div>
  );
}
