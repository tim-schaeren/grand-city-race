import { consoleCopy as cc, buildTeamRoute, distanceBetween } from '@grandcityrace/shared';
import { Fragment, useState, useEffect, useMemo, useRef } from 'react';
import { collection, doc, query, where, onSnapshot } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import Icon from '../components/Icon';
import { useGamePlayers } from '../hooks/useGamePlayers';
import './LiveMapPage.css';

const STALE_MS = 5 * 60 * 1000;      // no position for this long: the team shows grey
const RECENT_MS = 30 * 60 * 1000;    // the trail shown unless "Whole race" is on
const LOADED_MS = 60 * 60 * 1000;    // how far back the map loads trail when opened
const MEMBER_ZOOM = 17;              // players' own dots appear from this zoom on
const FENCE_ZOOM = 16;
const TAIL_STEPS = [0.3, 0.5, 0.75, 1]; // a trail fades towards its oldest part

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const BASES = {
  streets: {
    urls: [`${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, `${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`],
    attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    maxNativeZoom: 16,
  },
  satellite: {
    urls: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`],
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxNativeZoom: 19,
  },
};

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const median = values => {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

function formatAge(updatedAt, now) {
  const ms = now - updatedAt;
  if (ms < 60000) return cc.liveMapPage.justNow;
  if (ms < 3600000) return cc.liveMapPage.minAgo({ mathFloor: Math.floor(ms / 60000) });
  return cc.liveMapPage.hAgo({ mathFloor: Math.floor(ms / 3600000) });
}

// Where a team is: the middle of its members who reported recently, or, when
// nobody has for a while, the last position anyone sent
function teamPosition(members, now) {
  const located = members.filter(u => u.lastLocation);
  if (!located.length) return null;
  const fresh = located.filter(u => now - (u.lastLocation.updatedAt ?? 0) <= STALE_MS);
  const updatedAt = Math.max(...located.map(u => u.lastLocation.updatedAt ?? 0));
  if (fresh.length) {
    return {
      lat: median(fresh.map(u => u.lastLocation.lat)),
      lng: median(fresh.map(u => u.lastLocation.lng)),
      updatedAt,
      stale: false,
    };
  }
  const latest = located.find(u => (u.lastLocation.updatedAt ?? 0) === updatedAt);
  return { lat: latest.lastLocation.lat, lng: latest.lastLocation.lng, updatedAt, stale: true };
}

function teamStatus(team, position, quests, questOrder) {
  if (team.finishedAt) return { text: cc.liveMapPage.finished, tone: 'done' };
  const questId = team.currentQuestId ?? questOrder?.[0] ?? null;
  const number = (questOrder ?? []).indexOf(questId) + 1;
  const quest = quests.find(q => q.id === questId);
  if (!quest) return null;
  const label = cc.liveMapPage.questN({ n: number || '?' });
  if (!quest.location?.lat || !position) return { text: label, tone: 'plain', questId };
  const there = distanceBetween(position, quest.location) <= (quest.fenceRadius ?? 50);
  return {
    text: `${label} · ${there ? cc.liveMapPage.atTheSpot : cc.liveMapPage.onTheWay}`,
    tone: there ? 'there' : 'plain',
    questId,
  };
}

// Icons take an offset in pixels, for when markers are stacked apart (see
// Declutter); the anchor moves, the place on the map doesn't
function teamIcon(team, selected, stale, [dx, dy] = [0, 0]) {
  const half = selected ? 11 : 9;
  return L.divIcon({
    className: '',
    iconSize: null,
    iconAnchor: [half - dx, half - dy],
    html: `<div class="lm-team${selected ? ' lm-team-selected' : ''}${stale ? ' lm-team-stale' : ''}" style="--team:${escapeHtml(team.color ?? '#6b7280')}">`
      + `<span class="lm-team-dot"></span><span class="lm-team-name">${escapeHtml(team.name)}</span></div>`,
  });
}

const memberIcon = (color, stale) => L.divIcon({
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  html: `<div class="lm-member${stale ? ' lm-member-stale' : ''}" style="--team:${escapeHtml(color)}"></div>`,
});

const questIcon = (number, highlighted, [dx, dy] = [0, 0]) => L.divIcon({
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13 - dx, 13 - dy],
  html: `<div class="lm-quest${highlighted ? ' lm-quest-current' : ''}">${number}</div>`,
});

export default function LiveMapPage() {
  const { gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const focusQuestId = location.state?.focusQuestId ?? null;

  const [now, setNow] = useState(Date.now());
  const [game, setGame] = useState(null);
  const [quests, setQuests] = useState([]);
  const [teams, setTeams] = useState([]);
  const users = useGamePlayers(gameId);
  const [trail, setTrail] = useState([]);

  const [base, setBase] = useState('streets');
  const [wholeRace, setWholeRace] = useState(false);
  const [selectedId, setSelectedId] = useState(location.state?.focusTeamId ?? null);
  const [follow, setFollow] = useState(false);
  const [zoom, setZoom] = useState(14);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [map, setMap] = useState(null);
  const [offsets, setOffsets] = useState({});
  // Until someone moves the map, it keeps every team in view as positions arrive
  const touched = useRef(false);
  // Each press of a team or "All teams" moves the camera once
  const [shot, setShot] = useState({ kind: location.state?.focusTeamId ? 'team' : 'all', seq: 0 });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => onSnapshot(doc(db, 'games', gameId), snap => {
    setGame(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  }), [gameId]);

  useEffect(() => onSnapshot(collection(db, 'games', gameId, 'quests'), snap => {
    setQuests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }), [gameId]);

  useEffect(() => onSnapshot(
    query(collection(db, 'teams'), where('gameId', '==', gameId)),
    snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
  ), [gameId]);

  // The last hour unless the whole race is asked for: a long race leaves tens
  // of thousands of points, and every one read costs
  useEffect(() => {
    const since = Date.now() - LOADED_MS;
    const trailQuery = wholeRace
      ? query(collection(db, 'trail'), where('gameId', '==', gameId))
      : query(collection(db, 'trail'), where('gameId', '==', gameId), where('t', '>=', since));
    return onSnapshot(trailQuery, snap => setTrail(snap.docs.map(d => d.data())), () => setTrail([]));
  }, [gameId, wholeRace]);

  const memberIds = useMemo(() => new Set(teams.flatMap(t => t.memberIds ?? [])), [teams]);
  const players = users.filter(u => memberIds.has(u.id));

  const rows = useMemo(() => teams
    .map(team => {
      const members = players.filter(u => team.memberIds?.includes(u.id));
      const position = teamPosition(members, now);
      return { team, members, position, status: teamStatus(team, position, quests, game?.questOrder) };
    })
    .sort((a, b) => a.team.name.localeCompare(b.team.name)), [teams, players, now, quests, game?.questOrder]);
  const selected = rows.find(r => r.team.id === selectedId) ?? null;

  // One smoothed line per team, the way the recap draws it, ending at the
  // team's current position
  const routes = useMemo(() => {
    const start = game?.startDateTime ?? 0;
    const from = wholeRace ? start : Math.max(start, now - RECENT_MS);
    const byTeam = {};
    for (const p of trail) if (p.t >= from) (byTeam[p.teamId] ??= []).push(p);
    const result = {};
    for (const { team, position } of rows) {
      const { route } = buildTeamRoute(byTeam[team.id] ?? []);
      const line = route.map(p => [p.lat, p.lng]);
      if (position && !position.stale) line.push([position.lat, position.lng]);
      result[team.id] = line;
    }
    return result;
  }, [trail, rows, wholeRace, now, game?.startDateTime]);

  const questNumber = id => (game?.questOrder ?? []).indexOf(id) + 1;
  const currentQuestId = selected?.status?.questId ?? null;
  const center = game?.cityCoordinates ? [game.cityCoordinates.lat, game.cityCoordinates.lng] : [47.3769, 8.5417];

  function pick(teamId) {
    if (teamId === selectedId) {
      setSelectedId(null);
      setFollow(false);
      setShot(s => ({ kind: 'all', seq: s.seq + 1 }));
      return;
    }
    setSelectedId(teamId);
    setShot(s => ({ kind: 'team', seq: s.seq + 1 }));
    setSheetOpen(false);
  }

  const list = (
    <ul className="divide-y divide-gray-100">
      {rows.map(({ team, members, position, status }) => {
        const isSelected = team.id === selectedId;
        return (
          <li key={team.id} className={isSelected ? 'bg-gray-100' : ''}>
            <button
              onClick={() => pick(team.id)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${isSelected ? '' : 'hover:bg-gray-50'}`}
            >
              <span className="w-3.5 h-3.5 mt-0.5 rounded-full shrink-0" style={{ background: team.color ?? '#6b7280' }} />
              <span className="flex-1 min-w-0">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate text-sm ${isSelected ? 'font-bold' : 'font-semibold'} text-gray-900`}>{team.name}</span>
                  <span className={`shrink-0 text-xs ${!position || position.stale ? 'text-red-500' : 'text-gray-400'}`}>
                    {position ? formatAge(position.updatedAt, now) : cc.liveMapPage.noPosition}
                  </span>
                </span>
                {status && (
                  <span className={`flex items-center gap-1 text-xs ${status.tone === 'there' ? 'text-green-600' : status.tone === 'done' ? 'text-green-700' : 'text-gray-500'}`}>
                    {status.tone === 'done' && <Icon name="check" size={13} />}
                    {status.text}
                  </span>
                )}
              </span>
            </button>
            {/* The picked team's players, each with when their position last came in */}
            {isSelected && (
              <ul className="pb-2 pl-[2.625rem] pr-4">
                {members.length === 0 && <li className="py-1 text-xs text-gray-400">{cc.liveMapPage.noPlayers}</li>}
                {[...members].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')).map(u => {
                  const at = u.lastLocation?.updatedAt;
                  const old = !at || now - at > STALE_MS;
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        disabled={!u.lastLocation}
                        onClick={() => setShot(s => ({ kind: 'point', at: u.lastLocation, seq: s.seq + 1 }))}
                        className="w-full py-1 flex items-baseline justify-between gap-2 text-xs text-left hover:underline disabled:no-underline disabled:cursor-default"
                      >
                        <span className="truncate text-gray-700">{u.name ?? cc.liveMapPage.unknown}</span>
                        <span className={`shrink-0 ${old ? 'text-red-500' : 'text-gray-400'}`}>
                          {at ? formatAge(at, now) : cc.liveMapPage.noPosition}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );

  const control = 'h-9 px-3 bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-colors flex items-center gap-1.5';
  const on = '!bg-gray-900 !text-white !border-gray-900';
  // Two choices side by side, the current one dark
  const segmented = (options, value, onChange) => (
    <div className="flex h-9 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden text-sm font-medium">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`px-3 transition-colors ${value === key ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex h-[calc(100%+2rem)] md:h-[calc(100%+4rem)] -m-4 md:-m-8">
      {/* The map gets a stacking context of its own, so the console's sidebar
          and menus open above Leaflet's layers */}
      <div className="relative z-0 flex-1 min-w-0">
        {/* On phones the map ends above the team sheet, so its credits stay visible */}
        <MapContainer
          key={game?.id ?? 'loading'}
          ref={setMap}
          center={center}
          zoom={14}
          zoomSnap={0.5}
          zoomControl={false}
          className="absolute inset-x-0 top-0 bottom-[60px] md:bottom-0"
        >
          {BASES[base].urls.map((url, i) => (
            <TileLayer key={`${base}-${i}`} url={url} maxNativeZoom={BASES[base].maxNativeZoom} maxZoom={20} {...(i ? {} : { attribution: BASES[base].attribution })} />
          ))}
          <ZoomTracker onZoom={setZoom} />
          <Declutter
            items={[
              ...quests.filter(q => q.location?.lat).map(q => ({ key: `q:${q.id}`, lat: q.location.lat, lng: q.location.lng, order: 0 })),
              ...rows.filter(r => r.position).map(r => ({ key: `t:${r.team.id}`, lat: r.position.lat, lng: r.position.lng, order: 1 })),
            ]}
            onLayout={setOffsets}
          />
          <Camera
            shot={shot}
            selected={selected}
            rows={rows}
            quests={quests}
            follow={follow}
            onDrag={() => { touched.current = true; setFollow(false); }}
            touched={touched}
            focusQuestId={focusQuestId}
          />

          {quests.map(quest => {
            if (!quest.location?.lat) return null;
            const pos = [quest.location.lat, quest.location.lng];
            const current = quest.id === currentQuestId;
            return (
              <Fragment key={quest.id}>
                {quest.fenceRadius > 0 && (zoom >= FENCE_ZOOM || current) && (
                  <Circle
                    center={pos}
                    radius={quest.fenceRadius}
                    pathOptions={{ color: current ? '#111827' : '#6b7280', fillColor: current ? '#111827' : '#6b7280', fillOpacity: 0.06, weight: current ? 2 : 1, dashArray: current ? null : '4 4' }}
                  />
                )}
                <Marker position={pos} icon={questIcon(questNumber(quest.id) || '?', current, offsets[`q:${quest.id}`])} zIndexOffset={current ? 500 : 0}>
                  <Popup>
                    <button
                      onClick={() => navigate(`/games/${gameId}/quests`, { state: { highlightQuestId: quest.id } })}
                      className="font-semibold text-indigo-600"
                    >
                      {quest.title}
                    </button>
                    {quest.fenceRadius > 0 && <div className="text-xs text-gray-500 mt-1">{cc.liveMapPage.fenceM({ questFenceRadius: quest.fenceRadius })}</div>}
                  </Popup>
                </Marker>
              </Fragment>
            );
          })}

          {rows.map(({ team }) => {
            const line = routes[team.id] ?? [];
            if (line.length < 2) return null;
            const dimmed = selectedId && team.id !== selectedId;
            const weight = team.id === selectedId ? 6 : 4;
            // In steps from faint to full, oldest first
            const size = Math.ceil(line.length / TAIL_STEPS.length);
            return TAIL_STEPS.map((opacity, i) => {
              const part = line.slice(i * size, (i + 1) * size + 1);
              if (part.length < 2) return null;
              return (
                <Polyline
                  key={`${team.id}-${i}`}
                  positions={part}
                  pathOptions={{ color: team.color ?? '#6b7280', weight, opacity: dimmed ? opacity * 0.25 : opacity, lineCap: 'round', lineJoin: 'round' }}
                />
              );
            });
          })}

          {rows.map(({ team, members }) => (zoom >= MEMBER_ZOOM || team.id === selectedId) && members.filter(u => u.lastLocation).map(u => {
            const stale = now - (u.lastLocation.updatedAt ?? 0) > STALE_MS;
            return (
              <Marker key={u.id} position={[u.lastLocation.lat, u.lastLocation.lng]} icon={memberIcon(team.color ?? '#6b7280', stale)}>
                <Popup>
                  <button onClick={() => navigate('/users', { state: { highlightUserId: u.id } })} className="font-semibold text-gray-900 block">
                    {u.name}
                  </button>
                  <div className={`text-xs mt-0.5 ${stale ? 'text-red-500' : 'text-gray-500'}`}>
                    {u.lastLocation.updatedAt ? formatAge(u.lastLocation.updatedAt, now) : cc.liveMapPage.unknown}
                  </div>
                </Popup>
              </Marker>
            );
          }))}

          {rows.map(({ team, position }) => position && (
            <Marker
              key={team.id}
              position={[position.lat, position.lng]}
              icon={teamIcon(team, team.id === selectedId, position.stale, offsets[`t:${team.id}`])}
              zIndexOffset={team.id === selectedId ? 2000 : 1000}
              eventHandlers={{ click: () => pick(team.id) }}
            />
          ))}
        </MapContainer>

        {/* Map controls */}
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-start justify-between gap-2 pointer-events-none">
          <div className="flex flex-wrap gap-2 pointer-events-auto">
            {segmented([['streets', cc.liveMapPage.streets], ['satellite', cc.liveMapPage.satellite]], base, setBase)}
            {segmented([['recent', cc.liveMapPage.last30Min], ['whole', cc.liveMapPage.wholeRace]], wholeRace ? 'whole' : 'recent', key => setWholeRace(key === 'whole'))}
          </div>
          <div className="flex flex-wrap gap-2 pointer-events-auto">
            <button type="button" className={control} onClick={() => { setSelectedId(null); setFollow(false); setShot(s => ({ kind: 'all', seq: s.seq + 1 })); }}>
              {cc.liveMapPage.allTeams}
            </button>
            <button
              type="button"
              disabled={!selected}
              className={`${control} ${follow ? on : ''}`}
              onClick={() => {
                setFollow(f => !f);
                setShot(s => ({ kind: 'team', seq: s.seq + 1 }));
              }}
            >
              {cc.liveMapPage.follow}
            </button>
          </div>
        </div>
        <ZoomButtons map={map} control={control} onUse={() => { touched.current = true; }} />

        {/* Phones: the team list as a sheet over the bottom of the map */}
        <div className="md:hidden absolute inset-x-0 bottom-0 z-[1000] bg-white rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.12)] flex flex-col max-h-[55%]">
          <button onClick={() => setSheetOpen(o => !o)} className="w-full px-4 pt-2 pb-3 text-left shrink-0">
            <span className="block w-10 h-1 rounded-full bg-gray-300 mx-auto mb-2" />
            <span className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900">
                {selected ? selected.team.name : cc.liveMapPage.teamsN({ n: rows.length })}
              </span>
              <span className="text-xs text-gray-500">
                {selected
                  ? [selected.status?.text, selected.position ? formatAge(selected.position.updatedAt, now) : cc.liveMapPage.noPosition].filter(Boolean).join(' · ')
                  : (sheetOpen ? cc.liveMapPage.hide : cc.liveMapPage.show)}
              </span>
            </span>
          </button>
          {sheetOpen && <div className="overflow-y-auto border-t border-gray-100">{list}</div>}
        </div>
      </div>

      {/* Computers: the team list beside the map */}
      <aside className="hidden md:flex w-80 shrink-0 flex-col bg-white border-l border-gray-200">
        <div className="px-4 py-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">{cc.liveMapPage.liveMap}</h1>
          <p className="text-xs text-gray-400">{cc.liveMapPage.tapATeam}</p>
        </div>
        <div className="flex-1 overflow-y-auto">{list}</div>
      </aside>
    </div>
  );
}

function ZoomTracker({ onZoom }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => { onZoom(map.getZoom()); }, [map, onZoom]);
  return null;
}

// Quest pins and team markers closer than this on screen are stacked apart
const CROWD_PX = 30;
const SLOT_PX = 30;

// Markers that would cover each other at the current zoom are stacked in a
// column at their middle, quests first, each row readable. Recomputed when
// the map moves and when teams do; zooming in spreads them out again.
function Declutter({ items, onLayout }) {
  const map = useMap();
  const key = items.map(i => `${i.key}@${i.lat.toFixed(5)},${i.lng.toFixed(5)}`).join('|');
  const latest = useRef(items);
  latest.current = items;
  const last = useRef('');

  useEffect(() => {
    const layout = () => {
      const points = latest.current.map(i => ({ ...i, p: map.latLngToContainerPoint([i.lat, i.lng]) }));
      // Groups of markers that touch, directly or through each other
      const group = points.map((_, i) => i);
      const root = i => (group[i] === i ? i : (group[i] = root(group[i])));
      for (let a = 0; a < points.length; a++) {
        for (let b = a + 1; b < points.length; b++) {
          if (points[a].p.distanceTo(points[b].p) < CROWD_PX) group[root(a)] = root(b);
        }
      }
      const groups = {};
      points.forEach((pt, i) => (groups[root(i)] ??= []).push(pt));
      const offsets = {};
      for (const members of Object.values(groups)) {
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
  }, [map, key, onLayout]);
  return null;
}

// The zoom buttons, in the console's own style rather than Leaflet's, at the
// right edge where they clear the controls along the top on narrow screens
function ZoomButtons({ map, control, onUse }) {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-1.5">
      <button type="button" aria-label={cc.liveMapPage.zoomIn} className={`${control} !px-0 w-9 justify-center`} onClick={() => { onUse(); map?.zoomIn(); }}>
        <Icon name="plus" size={18} />
      </button>
      <button type="button" aria-label={cc.liveMapPage.zoomOut} className={`${control} !px-0 w-9 justify-center`} onClick={() => { onUse(); map?.zoomOut(); }}>
        <Icon name="minus" size={18} />
      </button>
    </div>
  );
}

// Moves the map: to a picked team, to all teams, to a quest opened from the
// quest list, and along with a followed team. Dragging the map ends following.
function Camera({ shot, selected, rows, quests, follow, onDrag, touched, focusQuestId }) {
  const map = useMap();

  useEffect(() => {
    map.on('dragstart', onDrag);
    return () => { map.off('dragstart', onDrag); };
  }, [map, onDrag]);

  const fitAll = () => {
    const points = rows.filter(r => r.position).map(r => [r.position.lat, r.position.lng]);
    const fallback = quests.filter(q => q.location?.lat).map(q => [q.location.lat, q.location.lng]);
    const all = points.length ? points : fallback;
    if (all.length) map.flyToBounds(L.latLngBounds(all), { padding: [44, 44], maxZoom: 17, duration: 0.8 });
  };

  // A quest opened from the quest list
  useEffect(() => {
    const quest = quests.find(q => q.id === focusQuestId);
    if (quest?.location?.lat) {
      touched.current = true;
      map.flyTo([quest.location.lat, quest.location.lng], 17);
    }
  }, [focusQuestId, quests.length]);

  // A press of a team or "All teams", and on opening, every team in view
  // until someone moves the map: positions arrive one player at a time
  const located = rows.filter(r => r.position).length;
  useEffect(() => {
    if (shot.kind === 'point' && shot.at) {
      touched.current = true;
      map.flyTo([shot.at.lat, shot.at.lng], Math.max(map.getZoom(), 18), { duration: 0.8 });
    } else if (shot.kind === 'team' && selected?.position) {
      touched.current = true;
      map.flyTo([selected.position.lat, selected.position.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
    } else if (shot.kind === 'all' && (shot.seq > 0 || !touched.current)) {
      fitAll();
    }
  }, [shot.seq, located, quests.length]);

  // Following: the camera keeps the team in view as it moves
  useEffect(() => {
    if (follow && selected?.position) map.panTo([selected.position.lat, selected.position.lng], { animate: true });
  }, [follow, selected?.position?.lat, selected?.position?.lng]);

  return null;
}
