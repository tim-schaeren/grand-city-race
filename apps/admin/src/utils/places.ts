import type { GeoPoint } from '@grandcityrace/shared';

export interface Place extends GeoPoint {
  name: string;   // what the game is called after, e.g. "Bern"
  label: string;  // enough to tell places of one name apart, e.g. "Bern, Switzerland"
}

interface Result {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  addresstype?: string;
  address?: Record<string, string>;
}

// Regions share names with their capitals (the canton of Bern, the state of
// New York): only towns and the like make a game's city
const NOT_A_TOWN = new Set(['country', 'state', 'region', 'province', 'county', 'state_district']);

// Towns and cities by name, from OpenStreetMap's Nominatim. Its rules allow
// a search the host asks for, not suggestions while typing, so this runs on
// Find, at most a few times a minute.
export async function searchPlaces(query: string): Promise<Place[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    featureType: 'settlement',
    addressdetails: '1',
    limit: '5',
    'accept-language': 'en',
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  if (!res.ok) throw new Error(String(res.status));
  const results = (await res.json()) as Result[];
  const seen = new Set<string>();
  return results.filter(r => !NOT_A_TOWN.has(r.addresstype ?? '')).map(r => {
    const name = r.name || r.display_name.split(',')[0];
    const region = r.address?.state ?? r.address?.region ?? r.address?.county;
    const label = [...new Set([name, region, r.address?.country].filter(Boolean))].join(', ');
    return { name, label, lat: Number(r.lat), lng: Number(r.lon) };
  }).filter(place => !seen.has(place.label) && !!seen.add(place.label));
}
