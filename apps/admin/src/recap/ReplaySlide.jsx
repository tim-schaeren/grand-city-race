import { Fragment, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { copy, recapRoute, positionAt, metersBetween } from '@grandcityrace/shared';
import { headingStyle, panelStyle, buttonStyle } from '../utils/themeStyle';
import Icon, { iconPath } from '../components/Icon';

const r = copy.recap;

// The replay's pace: a race with nothing happening would take QUIET_SECONDS.
// Approaching an event it slows to SLOWEST of that, then stops on the event:
// first on the team that acted, then on the one it hit.
const QUIET_SECONDS = 40;
const SLOWEST = 0.12;
const NEAR_SHARE = 0.03;          // "approaching": within this share of the race
const HOLD_ACTOR_MS = 2200;
const HOLD_TARGET_MS = 3200;
const SAME_SPOT_METERS = 40;      // closer than this, one stop shows both
const EVENT_ZOOM = 17;
const FLY_SECONDS = 0.8;
const BOUNDS_OPTIONS = { padding: [24, 24] };
const ROW_HEIGHT = 30;

const EVENT_ICONS = {
  curse: 'skull-outline',
  robbery: 'sack-percent',
  blocked: 'shield-check-outline',
  donation: 'hand-coin-outline',
  finish: 'flag-checkered',
};

// Quiet grey streets, so the teams' colours stand out: light for light
// themes, dark for dark ones, with street names on top
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
const TILES = {
  light: [`${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, `${ESRI}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`],
  dark: [`${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`],
};
const ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';

// Leaflet stretches routes and dots while the map flies and redraws them when
// it lands, so they balloon on the way in. Redrawing every frame keeps their size.
const SteadySVG = L.SVG.extend({
  _onZoom() { this._reset(); },
});

export function eventText(event, teamById) {
  const team = teamById[event.teamId]?.name ?? '';
  const target = teamById[event.targetTeamId]?.name ?? '';
  switch (event.type) {
    case 'curse': return r.events.curse(team, target);
    case 'robbery': return r.events.robbery(team, target, event.amount ?? 0);
    case 'blocked': return r.events.blocked(team, target, event.itemType === 'robbery');
    case 'donation': return r.events.donation(team, target, event.amount ?? 0);
    case 'finish': return r.events.finish(team, teamById[event.teamId]?.stats.place ?? 0);
    default: return '';
  }
}

export default function ReplaySlide({ recap, theme, teamById, viewerTeamId }) {
  const c = theme.colors;
  const total = Math.max(1, recap.game.durationSeconds);
  const events = recap.events;
  const routes = useMemo(
    () => Object.fromEntries(recap.teams.map(t => [t.id, recapRoute(recap, t.id)])),
    [recap],
  );
  const bounds = useMemo(() => {
    const points = Object.values(routes).flat().map(p => [p.lat, p.lng]);
    return points.length ? L.latLngBounds(points) : null;
  }, [routes]);
  const renderer = useMemo(() => new SteadySVG(), []);

  // Where the camera stops for each event: the acting team, then the one it hit
  const stops = useMemo(() => events.map(e => {
    const target = e.lat !== null && e.lng !== null ? { lat: e.lat, lng: e.lng } : null;
    const actor = e.targetTeamId ? positionAt(routes[e.teamId] ?? [], e.at) : null;
    if (actor && target && metersBetween(actor, target) > SAME_SPOT_METERS) {
      return [{ at: actor, ms: HOLD_ACTOR_MS }, { at: target, ms: HOLD_TARGET_MS, from: actor }];
    }
    return [{ at: target ?? actor, ms: HOLD_TARGET_MS }];
  }), [events, routes]);

  // Past events stay on the map small and faded; the one being told is large
  const icons = useMemo(() => {
    const make = (name, size, className) => L.divIcon({
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      html: `<div class="${className}" style="background:${c.surface};color:${c.onSurface};border-color:${c.border}">`
        + `<svg viewBox="0 0 24 24" fill="currentColor"><path d="${iconPath(name)}"/></svg></div>`,
    });
    return Object.fromEntries(Object.entries(EVENT_ICONS).map(([type, name]) => [type, {
      past: make(name, 16, 'recap-marker recap-marker-past'),
      now: make(name, 40, 'recap-marker recap-marker-now'),
    }]));
  }, [c]);

  // The clock runs in race seconds; focus is the event and stop on screen
  const [clock, setClock] = useState(0);
  const [focus, setFocus] = useState(null);
  const [playing, setPlaying] = useState(true);
  const pause = useCallback(() => setPlaying(false), []);
  const state = useRef({ clock: 0, next: 0, stop: 0, holdLeft: 0 });
  useEffect(() => {
    if (!playing) return undefined;
    const quiet = total / QUIET_SECONDS;
    const near = total * NEAR_SHARE;
    let frame;
    let last = performance.now();
    const tick = now => {
      const elapsed = Math.min(100, now - last);
      last = now;
      const s = state.current;
      if (s.holdLeft > 0) {
        s.holdLeft -= elapsed;
        if (s.holdLeft <= 0) {
          const here = stops[s.next - 1];
          if (s.stop + 1 < here.length) {
            s.stop += 1;
            s.holdLeft = here[s.stop].ms;
            setFocus({ index: s.next - 1, stop: s.stop });
          } else {
            setFocus(null);
          }
        }
      } else {
        // Slower the closer the clock is to an event, before or after
        const ahead = s.next < events.length ? events[s.next].at - s.clock : Infinity;
        const behind = s.next > 0 ? s.clock - events[s.next - 1].at : Infinity;
        const closeness = Math.min(1, Math.min(ahead, behind) / near);
        const speed = quiet * (SLOWEST + (1 - SLOWEST) * closeness);
        let t = Math.min(total, s.clock + (elapsed / 1000) * speed);
        if (s.next < events.length && events[s.next].at <= t) {
          t = events[s.next].at;
          s.stop = 0;
          s.holdLeft = stops[s.next][0].ms;
          setFocus({ index: s.next, stop: 0 });
          s.next += 1;
        }
        s.clock = t;
        setClock(t);
        if (t >= total) setPlaying(false);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, total, events, stops]);

  const finished = clock >= total && focus === null;
  const togglePlay = () => {
    if (finished) {
      state.current = { clock: 0, next: 0, stop: 0, holdLeft: 0 };
      setClock(0);
      setPlaying(true);
      return;
    }
    setPlaying(p => !p);
  };

  // The leaderboard at this moment. Teams on the same place keep their own
  // rows, in final order, and show the place they share.
  const { times, byTeam } = recap.places;
  let sample = 0;
  while (sample < times.length - 1 && times[sample + 1] <= clock) sample++;
  const placeOf = team => byTeam[team.id]?.[sample] ?? team.stats.place;
  const rows = [...recap.teams].sort((a, b) => placeOf(a) - placeOf(b) || a.stats.place - b.stats.place);

  const passed = events.slice(0, state.current.next);
  const told = focus !== null ? events[focus.index] : passed.at(-1);
  const before = passed.filter(e => e !== told).slice(-1);
  const stop = focus !== null ? stops[focus.index][focus.stop] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 style={headingStyle(theme, 32)}>{r.replay.heading}</h1>
          <p className="text-xs" style={{ color: c.muted }}>{r.replay.hint}</p>
        </div>
        <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: c.text }}>
          {r.duration(clock)}
        </span>
      </div>

      <div className="relative overflow-hidden" style={{ ...panelStyle(theme), padding: 0 }}>
        {bounds ? (
          <MapContainer
            bounds={bounds}
            boundsOptions={BOUNDS_OPTIONS}
            renderer={renderer}
            zoomControl={false}
            scrollWheelZoom={false}
            attributionControl
            className="w-full h-[42svh] min-h-[260px]"
            style={{ background: c.surface }}
          >
            <TileLayer url={(theme.dark ? TILES.dark : TILES.light)[0]} attribution={ATTRIBUTION} maxNativeZoom={16} />
            <TileLayer url={(theme.dark ? TILES.dark : TILES.light)[1]} maxNativeZoom={16} />
            <Camera bounds={bounds} spot={stop?.at ?? null} onTouched={pause} theme={theme} />
            {recap.teams.map(team => {
              const route = routes[team.id];
              const shown = route.filter(p => p.t <= clock).map(p => [p.lat, p.lng]);
              const head = positionAt(route, clock);
              const mine = team.id === viewerTeamId;
              return (
                <Fragment key={team.id}>
                  {head && (
                    <Polyline
                      positions={[...shown, [head.lat, head.lng]]}
                      pathOptions={{ color: team.color, weight: mine ? 5 : 3.5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
                    />
                  )}
                  {head && clock > 0 && (
                    <CircleMarker
                      center={[head.lat, head.lng]}
                      radius={mine ? 8 : 6.5}
                      pathOptions={{ color: '#ffffff', weight: 2, fillColor: team.color, fillOpacity: 1 }}
                    />
                  )}
                </Fragment>
              );
            })}
            {/* From the acting team to the one it hit */}
            {stop?.from && (
              <Polyline
                positions={[[stop.from.lat, stop.from.lng], [stop.at.lat, stop.at.lng]]}
                pathOptions={{ color: c.onSurface, weight: 2.5, opacity: 0.8, dashArray: '6 8' }}
              />
            )}
            {passed.map((e, i) => e.lat !== null && e.lng !== null && (
              <Marker
                key={`${e.type}-${e.at}-${i}`}
                position={[e.lat, e.lng]}
                icon={icons[e.type][i === focus?.index ? 'now' : 'past']}
                zIndexOffset={i === focus?.index ? 1000 : 0}
              />
            ))}
          </MapContainer>
        ) : (
          <div className="h-[30svh]" />
        )}
      </div>

      {/* What happened, under the map rather than over it */}
      <div className="min-h-[64px] flex flex-col gap-1">
        {told && (
          <span
            key={`${told.type}-${told.at}-${told.teamId}`}
            className={`${focus !== null ? 'recap-pop' : ''} self-start px-3 py-1.5 text-sm font-semibold inline-flex items-center gap-2`}
            style={panelStyle(theme)}
          >
            <Icon name={EVENT_ICONS[told.type]} size={16} />
            {eventText(told, teamById)}
          </span>
        )}
        {before.map(e => (
          <span
            key={`${e.type}-${e.at}-${e.teamId}`}
            className="px-3 text-xs inline-flex items-center gap-1.5"
            style={{ color: c.muted }}
          >
            <Icon name={EVENT_ICONS[e.type]} size={13} />
            {eventText(e, teamById)}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={togglePlay} className="px-4 py-2 text-sm" style={buttonStyle(theme)}>
          {finished ? r.again : playing ? r.pause : r.play}
        </button>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: c.border }}>
          <div className="h-full" style={{ width: `${(clock / total) * 100}%`, background: c.heading }} />
        </div>
      </div>

      <div className="relative" style={{ height: recap.teams.length * ROW_HEIGHT }}>
        {recap.teams.map(team => (
          <div
            key={team.id}
            className="absolute left-0 right-0 flex items-center gap-3 text-sm transition-[top] duration-500 ease-out"
            style={{ top: rows.indexOf(team) * ROW_HEIGHT, height: ROW_HEIGHT, fontWeight: team.id === viewerTeamId ? 700 : 400 }}
          >
            <span className="w-10 tabular-nums" style={{ color: c.muted }}>{r.places.place(placeOf(team))}</span>
            <span className="min-w-0 truncate"><TeamDot team={team} />{team.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Moves the map: in to each stop, back out to the whole race after. Hands on
// the map (dragging, pinching, the zoom buttons) pause the replay, so the
// camera doesn't pull the map away from someone looking around.
function Camera({ bounds, spot, onTouched, theme }) {
  const map = useMap();
  const flying = useRef(false);
  const zoomedIn = useRef(false);

  useEffect(() => {
    const touched = () => { if (!flying.current) onTouched(); };
    const landed = () => { flying.current = false; };
    map.on('dragstart zoomstart', touched);
    map.on('moveend', landed);
    return () => {
      map.off('dragstart zoomstart', touched);
      map.off('moveend', landed);
    };
  }, [map, onTouched]);

  useEffect(() => {
    if (spot) {
      flying.current = true;
      map.flyTo([spot.lat, spot.lng], EVENT_ZOOM, { duration: FLY_SECONDS });
      zoomedIn.current = true;
    } else if (zoomedIn.current) {
      flying.current = true;
      map.flyToBounds(bounds, { ...BOUNDS_OPTIONS, duration: FLY_SECONDS });
      zoomedIn.current = false;
    }
  }, [spot, bounds, map]);

  // Taps on the buttons stay off the map underneath
  const controls = useRef(null);
  useEffect(() => {
    if (controls.current) L.DomEvent.disableClickPropagation(controls.current);
  }, []);

  const c = theme.colors;
  const zoomButton = (label, icon, action) => (
    <button
      type="button"
      aria-label={label}
      onClick={() => { onTouched(); action(); }}
      className="w-9 h-9 flex items-center justify-center"
      style={{ ...panelStyle(theme), padding: 0, color: c.onSurface }}
    >
      <Icon name={icon} size={20} />
    </button>
  );
  return (
    <div className="leaflet-top leaflet-right">
      <div ref={controls} className="leaflet-control flex flex-col gap-1.5" style={{ marginTop: 8, marginRight: 8 }}>
        {zoomButton(r.replay.zoomIn, 'plus', () => map.zoomIn())}
        {zoomButton(r.replay.zoomOut, 'minus', () => map.zoomOut())}
      </div>
    </div>
  );
}

function TeamDot({ team }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ background: team.color }} />;
}
