import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { buildTeamRoute, consoleCopy as cc, type Quest, type TrailPoint } from '@grandcityrace/shared';
import Icon from '../../components/Icon';
import { useGame } from '../../data/games';
import { dataOr } from '../../data/live';
import { usePlayers, type HostPlayer } from '../../data/players';
import { useQuests } from '../../data/quests';
import { useTeams } from '../../data/teams';
import { useTrail } from '../../data/trail';
import { useEntityLinkState } from '../../shell/sheet';
import { to } from '../../shell/to';
import { useNow } from '../../shell/useNow';
import { useAppearance } from '../../utils/appearance';
import { MAP_LAYERS } from '../../utils/maps';
import { STALE_MS } from '../positions';
import { Camera, MAX_ZOOM, type Shot } from './Camera';
import { Declutter } from './Declutter';
import { formatAge, memberIcon, questIcon, teamIcon, type Offset } from './markers';
import { mapRows } from './rows';
import { TeamList } from './TeamList';

const RECENT_MS = 30 * 60 * 1000; // the trail shown unless "Whole race" is on
const MEMBER_ZOOM = 17;           // players' own dots appear from this zoom on
const FENCE_ZOOM = 16;
const TAIL_STEPS = [0.3, 0.5, 0.75, 1]; // a trail fades towards its oldest part
const GREY = '#6b7280';
const ZURICH = { lat: 47.3769, lng: 8.5417 };

type Base = 'streets' | 'satellite';

// The live map. Embedded in race control it fills the space it's given,
// without its own team list, and race control picks the team to show.
export default function LiveMap({ embedded = false, focus = null }: { embedded?: boolean; focus?: { teamId: string } | null }) {
  const { gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const linkState = useEntityLinkState();
  const focusTeamId = (location.state as { focusTeamId?: string } | null)?.focusTeamId ?? null;
  const now = useNow(15_000);
  const dark = useDarkMap();

  const game = dataOr(useGame(gameId), null);
  const quests = dataOr(useQuests(gameId), [] as Quest[]);
  const teams = dataOr(useTeams(gameId), []);
  const players = dataOr(usePlayers(gameId), [] as HostPlayer[]);
  const [wholeRace, setWholeRace] = useState(false);
  const trail = dataOr(useTrail(gameId, wholeRace), [] as TrailPoint[]);

  const [base, setBase] = useState<Base>('streets');
  const [selectedId, setSelectedId] = useState<string | null>(focusTeamId);
  const [follow, setFollow] = useState(false);
  const [zoom, setZoom] = useState(14);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [offsets, setOffsets] = useState<Record<string, Offset>>({});
  // Until someone moves the map, it keeps every team in view as positions arrive
  const touched = useRef(false);
  const [shot, setShot] = useState<Shot>({ kind: focusTeamId ? 'team' : 'all', seq: 0 });
  const ask = (next: Shot extends infer S ? S extends Shot ? Omit<S, 'seq'> : never : never) => setShot(s => ({ ...next, seq: s.seq + 1 }) as Shot);

  // Race control asks for a team, each time anew
  const [askedFor, setAskedFor] = useState(focus);
  if (focus !== askedFor) {
    setAskedFor(focus);
    if (focus) {
      setSelectedId(focus.teamId);
      setShot(s => ({ kind: 'team', seq: s.seq + 1 }));
    }
  }

  const questOrder = useMemo(() => game?.questOrder ?? [], [game?.questOrder]);
  const rows = useMemo(() => mapRows(teams, players, quests, questOrder, now), [teams, players, quests, questOrder, now]);
  const selected = rows.find(r => r.team.id === selectedId) ?? null;
  const placed = quests.filter((q): q is Quest & { location: NonNullable<Quest['location']> } => !!q.location);

  // One smoothed line per team, the way the recap draws it, ending at the
  // team's current position
  const routes = useMemo(() => {
    const start = game?.startDateTime ?? 0;
    const from = wholeRace ? start : Math.max(start, now - RECENT_MS);
    const byTeam = new Map<string, TrailPoint[]>();
    for (const p of trail) if (p.t >= from) byTeam.set(p.teamId, [...(byTeam.get(p.teamId) ?? []), p]);
    return new Map(rows.map(({ team, position }) => {
      const line = buildTeamRoute(byTeam.get(team.id) ?? []).route.map(p => [p.lat, p.lng] as [number, number]);
      if (position && !position.stale) line.push([position.lat, position.lng]);
      return [team.id, line];
    }));
  }, [trail, rows, wholeRace, now, game?.startDateTime]);

  const touch = useCallback(() => { touched.current = true; }, []);
  const onDrag = useCallback(() => { touched.current = true; setFollow(false); }, []);
  const wasTouched = useCallback(() => touched.current, []);

  function pick(teamId: string) {
    if (teamId === selectedId) return showAll();
    setSelectedId(teamId);
    ask({ kind: 'team' });
    setSheetOpen(false);
  }

  function showAll() {
    setSelectedId(null);
    setFollow(false);
    ask({ kind: 'all' });
  }

  const currentQuestId = selected?.status?.questId ?? null;
  const center = game?.cityCoordinates ?? ZURICH;
  const list = <TeamList rows={rows} selectedId={selectedId} now={now} onPick={pick} onPlayer={at => ask({ kind: 'point', at })} />;

  return (
    <div className={embedded ? 'flex h-full' : '-m-4 flex h-[calc(100%+2rem)] md:-m-8 md:h-[calc(100%+4rem)]'}>
      {/* A stacking context of its own, so the console's menus open above Leaflet's layers */}
      <div className="relative z-0 min-w-0 flex-1">
        {/* On phones the map ends above the team sheet, so its credits stay visible */}
        <MapContainer
          key={game?.id ?? 'loading'}
          ref={setMap}
          center={[center.lat, center.lng]}
          zoom={14}
          maxZoom={MAX_ZOOM}
          zoomSnap={0.5}
          zoomControl={false}
          className={embedded ? 'absolute inset-0' : 'absolute inset-x-0 bottom-[60px] top-0 md:bottom-0'}
        >
          <TileLayer key={`${base}-${dark}`} {...(base === 'satellite' ? MAP_LAYERS.satellite : dark ? MAP_LAYERS.dark : MAP_LAYERS.light)} />
          <ZoomTracker onZoom={setZoom} />
          <Declutter
            spots={[
              ...placed.map(q => ({ key: `q:${q.id}`, lat: q.location.lat, lng: q.location.lng, order: 0 })),
              ...rows.flatMap(r => (r.position ? [{ key: `t:${r.team.id}`, lat: r.position.lat, lng: r.position.lng, order: 1 }] : [])),
            ]}
            onLayout={setOffsets}
          />
          <Camera shot={shot} selected={selected} rows={rows} quests={quests} follow={follow} onDrag={onDrag} touch={touch} wasTouched={wasTouched} />

          {placed.map(quest => {
            const at: [number, number] = [quest.location.lat, quest.location.lng];
            const current = quest.id === currentQuestId;
            const fence = quest.fenceRadius ?? 0;
            return (
              <Fragment key={quest.id}>
                {fence > 0 && (zoom >= FENCE_ZOOM || current) && (
                  <Circle
                    center={at}
                    radius={fence}
                    pathOptions={{ color: current ? '#111827' : GREY, fillColor: current ? '#111827' : GREY, fillOpacity: 0.06, weight: current ? 2 : 1, dashArray: current ? undefined : '4 4' }}
                  />
                )}
                <Marker position={at} icon={questIcon(questOrder.indexOf(quest.id) + 1 || '?', current, offsets[`q:${quest.id}`])} zIndexOffset={current ? 500 : 0}>
                  <Popup>
                    <button type="button" onClick={() => navigate(to.quest(gameId!, quest.id), { state: linkState })} className="font-semibold text-indigo-600">
                      {quest.title}
                    </button>
                    {fence > 0 && <div className="mt-1 text-xs text-gray-500">{cc.liveMapPage.fenceM({ m: fence })}</div>}
                  </Popup>
                </Marker>
              </Fragment>
            );
          })}

          {rows.map(({ team }) => {
            const line = routes.get(team.id) ?? [];
            if (line.length < 2) return null;
            const dimmed = !!selectedId && team.id !== selectedId;
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
                  pathOptions={{ color: team.color ?? GREY, weight, opacity: dimmed ? opacity * 0.25 : opacity, lineCap: 'round', lineJoin: 'round' }}
                />
              );
            });
          })}

          {rows.map(({ team, members }) => (zoom >= MEMBER_ZOOM || team.id === selectedId) && members.map(p => {
            if (!p.position) return null;
            const stale = now - p.position.updatedAt > STALE_MS;
            return (
              <Marker key={p.uid} position={[p.position.lat, p.position.lng]} icon={memberIcon(team.color, stale)}>
                <Popup>
                  <button type="button" onClick={() => navigate(to.player(gameId!, p.uid), { state: linkState })} className="block font-semibold text-gray-900">
                    {p.name}
                  </button>
                  <div className={`mt-0.5 text-xs ${stale ? 'text-red-500' : 'text-gray-500'}`}>{formatAge(p.position.updatedAt, now)}</div>
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

        <div className="pointer-events-none absolute left-3 right-3 top-3 z-[1000] flex flex-wrap items-start justify-between gap-2">
          <div className="pointer-events-auto flex flex-wrap gap-2">
            <Segmented options={[['streets', cc.liveMapPage.streets], ['satellite', cc.liveMapPage.satellite]]} value={base} onChange={setBase} />
            <Segmented options={[['recent', cc.liveMapPage.last30Min], ['whole', cc.liveMapPage.wholeRace]]} value={wholeRace ? 'whole' : 'recent'} onChange={v => setWholeRace(v === 'whole')} />
          </div>
          <div className="pointer-events-auto flex flex-wrap gap-2">
            <MapButton onClick={showAll}>{cc.liveMapPage.allTeams}</MapButton>
            <MapButton disabled={!selected} on={follow} onClick={() => { setFollow(f => !f); ask({ kind: 'team' }); }}>
              {cc.liveMapPage.follow}
            </MapButton>
          </div>
        </div>
        <ZoomButtons map={map} zoom={zoom} onUse={touch} />

        {/* Phones: the team list as a sheet over the bottom of the map */}
        {!embedded && (
          <div className="absolute inset-x-0 bottom-0 z-[1000] flex max-h-[55%] flex-col rounded-t-2xl bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.12)] md:hidden">
            <button type="button" onClick={() => setSheetOpen(o => !o)} className="w-full shrink-0 px-4 pb-3 pt-2 text-left">
              <span className="mx-auto mb-2 block h-1 w-10 rounded-full bg-gray-300" />
              <span className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-900">{selected ? selected.team.name : cc.liveMapPage.teamsN({ n: rows.length })}</span>
                <span className="text-xs text-gray-500">
                  {selected
                    ? [selected.status?.text, selected.position ? formatAge(selected.position.updatedAt, now) : cc.liveMapPage.noPosition].filter(Boolean).join(' · ')
                    : sheetOpen ? cc.liveMapPage.hide : cc.liveMapPage.show}
                </span>
              </span>
            </button>
            {sheetOpen && <div className="overflow-y-auto border-t border-gray-100">{list}</div>}
          </div>
        )}
      </div>

      {/* Computers: the team list beside the map */}
      {!embedded && (
        <aside className="hidden w-80 shrink-0 flex-col border-l border-gray-200 bg-white md:flex">
          <div className="border-b border-gray-200 px-4 py-4">
            <h1 className="text-lg font-bold text-gray-900">{cc.liveMapPage.liveMap}</h1>
            <p className="text-xs text-gray-400">{cc.liveMapPage.tapATeam}</p>
          </div>
          <div className="flex-1 overflow-y-auto">{list}</div>
        </aside>
      )}
    </div>
  );
}

// The grey streets follow the console's light or dark appearance
function useDarkMap(): boolean {
  const appearance = useAppearance();
  if (appearance !== 'system') return appearance === 'dark';
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function ZoomTracker({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => { onZoom(map.getZoom()); }, [map, onZoom]);
  return null;
}

const control = 'flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white';

// `on` only for a button that stays pressed
function MapButton({ on, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return <button type="button" aria-pressed={on} className={`${control} ${on ? '!border-gray-900 !bg-gray-900 !text-white' : ''} ${className}`} {...props} />;
}

// Two choices side by side, the current one dark
function Segmented<T extends string>({ options, value, onChange }: { options: [T, ReactNode][]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="flex h-9 overflow-hidden rounded-lg border border-gray-200 bg-white text-sm font-medium shadow-sm">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={`px-3 transition-colors ${value === key ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// The zoom buttons, in the console's own style rather than Leaflet's, at the
// right edge where they clear the controls along the top on narrow screens.
// Greyed out at either end, so a press that can't zoom doesn't look broken.
function ZoomButtons({ map, zoom, onUse }: { map: LeafletMap | null; zoom: number; onUse: () => void }) {
  return (
    <div className="absolute right-3 top-1/2 z-[1000] flex -translate-y-1/2 flex-col gap-1.5">
      <MapButton aria-label={cc.liveMapPage.zoomIn} disabled={zoom >= MAX_ZOOM} className="w-9 justify-center !px-0" onClick={() => { onUse(); map?.zoomIn(); }}>
        <Icon name="plus" size={18} />
      </MapButton>
      <MapButton aria-label={cc.liveMapPage.zoomOut} disabled={zoom <= (map?.getMinZoom() ?? 0)} className="w-9 justify-center !px-0" onClick={() => { onUse(); map?.zoomOut(); }}>
        <Icon name="minus" size={18} />
      </MapButton>
    </div>
  );
}
