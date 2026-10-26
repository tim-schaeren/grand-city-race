import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import type { Quest } from '@grandcityrace/shared';
import type { LastLocation } from '../positions';
import type { Row } from './rows';

export const MAX_ZOOM = 18; // closer in than this, the map got sluggish

// What the camera was last asked to show. `seq` counts the asks, so the
// same one twice moves it twice.
export type Shot =
  | { kind: 'all' | 'team'; seq: number }
  | { kind: 'point'; at: LastLocation; seq: number };

// Moves the map: to a picked team or player, to all teams, and along with a
// followed team. Dragging the map ends following.
export function Camera({ shot, selected, rows, quests, follow, onDrag, touch, wasTouched }: {
  shot: Shot;
  selected: Row | null;
  rows: Row[];
  quests: Quest[];
  follow: boolean;
  onDrag: () => void;
  touch: () => void;
  wasTouched: () => boolean;
}) {
  const map = useMap();

  useEffect(() => {
    map.on('dragstart', onDrag);
    return () => { map.off('dragstart', onDrag); };
  }, [map, onDrag]);

  // A press of a team, a player or "All teams", and on opening, every team in
  // view until someone moves the map: positions arrive one player at a time
  const located = rows.filter(r => r.position).length;
  useEffect(() => {
    if (shot.kind === 'point') {
      touch();
      map.flyTo([shot.at.lat, shot.at.lng], MAX_ZOOM, { duration: 0.8 });
    } else if (shot.kind === 'team' && selected?.position) {
      touch();
      map.flyTo([selected.position.lat, selected.position.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
    } else if (shot.kind === 'all' && (shot.seq > 0 || !wasTouched())) {
      const teams = rows.flatMap(r => (r.position ? [[r.position.lat, r.position.lng] as [number, number]] : []));
      const places = quests.flatMap(q => (q.location ? [[q.location.lat, q.location.lng] as [number, number]] : []));
      const all = teams.length ? teams : places;
      if (all.length) map.flyToBounds(L.latLngBounds(all), { padding: [44, 44], maxZoom: MAX_ZOOM, duration: 0.8 });
    }
    // Only a new ask, a newly located team or the quests arriving move it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot.seq, located, quests.length]);

  // Following: the camera keeps the team in view as it moves
  const lat = selected?.position?.lat;
  const lng = selected?.position?.lng;
  useEffect(() => {
    if (follow && lat !== undefined && lng !== undefined) map.panTo([lat, lng], { animate: true });
  }, [map, follow, lat, lng]);

  return null;
}
