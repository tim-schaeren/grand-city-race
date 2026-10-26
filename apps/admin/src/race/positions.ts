// Where teams are, from their members' last positions. The live map and race
// control's alerts read them the same way.

export const STALE_MS = 5 * 60 * 1000; // no position for this long: the team shows grey, and race control says so

export interface LastLocation {
  lat: number;
  lng: number;
  updatedAt: number;
}

export interface TeamPosition extends LastLocation {
  stale: boolean;
}

const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

// Where a team is: the middle of its members who reported recently, or, when
// nobody has for a while, the last position anyone sent
export function teamPosition(members: { lastLocation: LastLocation | null }[], now: number): TeamPosition | null {
  const located = members.flatMap(u => (u.lastLocation ? [u.lastLocation] : []));
  if (!located.length) return null;
  const fresh = located.filter(l => now - (l.updatedAt ?? 0) <= STALE_MS);
  const updatedAt = Math.max(...located.map(l => l.updatedAt ?? 0));
  if (fresh.length) {
    return { lat: median(fresh.map(l => l.lat)), lng: median(fresh.map(l => l.lng)), updatedAt, stale: false };
  }
  const latest = located.find(l => (l.updatedAt ?? 0) === updatedAt)!;
  return { lat: latest.lat, lng: latest.lng, updatedAt, stale: true };
}
