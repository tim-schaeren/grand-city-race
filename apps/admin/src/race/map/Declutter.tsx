import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { Offset } from './markers';

// Quest pins and team markers closer than this on screen are stacked apart
const CROWD_PX = 30;
const SLOT_PX = 30;

export interface Spot {
  key: string;
  lat: number;
  lng: number;
  order: number; // lower first in a stack: quests before teams
}

// Markers that would cover each other at the current zoom are stacked in a
// column at their middle, each row readable. Recomputed when the map moves
// and when teams do; zooming in spreads them out again.
export function Declutter({ spots, onLayout }: { spots: Spot[]; onLayout: (offsets: Record<string, Offset>) => void }) {
  const map = useMap();
  const key = spots.map(s => `${s.key}@${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join('|');
  const last = useRef('');

  useEffect(() => {
    const layout = () => {
      const points = spots.map(s => ({ ...s, p: map.latLngToContainerPoint([s.lat, s.lng]) }));
      // Groups of markers that touch, directly or through each other
      const group = points.map((_, i) => i);
      const root = (i: number): number => (group[i] === i ? i : (group[i] = root(group[i])));
      for (let a = 0; a < points.length; a++) {
        for (let b = a + 1; b < points.length; b++) {
          if (points[a].p.distanceTo(points[b].p) < CROWD_PX) group[root(a)] = root(b);
        }
      }
      const groups = new Map<number, typeof points>();
      points.forEach((pt, i) => groups.set(root(i), [...(groups.get(root(i)) ?? []), pt]));
      const offsets: Record<string, Offset> = {};
      for (const members of groups.values()) {
        if (members.length < 2) continue;
        members.sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
        const cx = members.reduce((sum, m) => sum + m.p.x, 0) / members.length;
        const cy = members.reduce((sum, m) => sum + m.p.y, 0) / members.length;
        members.forEach((m, i) => {
          offsets[m.key] = [Math.round(cx - m.p.x), Math.round(cy + (i - (members.length - 1) / 2) * SLOT_PX - m.p.y)];
        });
      }
      const signature = JSON.stringify(offsets);
      if (signature !== last.current) {
        last.current = signature;
        onLayout(offsets);
      }
    };
    layout();
    map.on('zoomend moveend', layout);
    return () => { map.off('zoomend moveend', layout); };
    // `key` stands for the spots: the same places needn't lay out again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key, onLayout]);
  return null;
}
