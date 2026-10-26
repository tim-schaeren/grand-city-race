import L from 'leaflet';
import { consoleCopy as cc } from '@grandcityrace/shared';
import './LiveMap.css';

// The map's markers, drawn as HTML; LiveMap.css styles them. An offset in
// pixels moves a marker's anchor, for markers stacked apart (see Declutter),
// while its place on the map stays.
export type Offset = [number, number];

const GREY = '#6b7280';
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function teamIcon(team: { name: string; color?: string }, selected: boolean, stale: boolean, [dx, dy]: Offset = [0, 0]) {
  const half = selected ? 11 : 9;
  return L.divIcon({
    className: '',
    iconSize: undefined,
    iconAnchor: [half - dx, half - dy],
    html: `<div class="lm-team${selected ? ' lm-team-selected' : ''}${stale ? ' lm-team-stale' : ''}" style="--team:${escapeHtml(team.color ?? GREY)}">`
      + `<span class="lm-team-dot"></span><span class="lm-team-name">${escapeHtml(team.name)}</span></div>`,
  });
}

export const memberIcon = (color: string | undefined, stale: boolean) => L.divIcon({
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  html: `<div class="lm-member${stale ? ' lm-member-stale' : ''}" style="--team:${escapeHtml(color ?? GREY)}"></div>`,
});

export const questIcon = (number: number | string, highlighted: boolean, [dx, dy]: Offset = [0, 0]) => L.divIcon({
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13 - dx, 13 - dy],
  html: `<div class="lm-quest${highlighted ? ' lm-quest-current' : ''}">${number}</div>`,
});

// How long ago a position came in
export function formatAge(updatedAt: number, now: number): string {
  const ms = now - updatedAt;
  if (ms < 60_000) return cc.liveMapPage.justNow;
  if (ms < 3_600_000) return cc.liveMapPage.minAgo({ n: Math.floor(ms / 60_000) });
  return cc.liveMapPage.hAgo({ n: Math.floor(ms / 3_600_000) });
}
