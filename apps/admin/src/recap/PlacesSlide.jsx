import { useState } from 'react';
import { copy } from '@grandcityrace/shared';
import { headingStyle, panelStyle } from '../utils/themeStyle';

const r = copy.recap;
const ROW = 34;
const WIDTH = 600;

// One line per team through the leaderboard's places, drawn in over a few
// seconds. The chart stretches to the screen's width; strokes keep their size.
// Tapping a team's line or name picks it out; a player's own team starts out
// picked.
export default function PlacesSlide({ recap, theme, viewerTeamId }) {
  const c = theme.colors;
  const { times, byTeam } = recap.places;
  const end = Math.max(1, times[times.length - 1] ?? 1);
  const height = recap.teams.length * ROW;
  const y = place => (place - 0.5) * ROW;
  const [selected, setSelected] = useState(viewerTeamId);
  const [tapped, setTapped] = useState(false);
  const pick = id => {
    setTapped(true);
    setSelected(current => (current === id ? null : id));
  };

  // A bump chart: level between samples, curving from one place to the next
  const lineOf = id => (byTeam[id] ?? []).map((place, k, places) => {
    const x = (times[k] / end) * WIDTH;
    if (!k) return `M${x},${y(place)}`;
    const mid = ((times[k - 1] / end) * WIDTH + x) / 2;
    return `C${mid},${y(places[k - 1])} ${mid},${y(place)} ${x},${y(place)}`;
  }).join(' ');
  const picked = recap.teams.find(t => t.id === selected);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 style={headingStyle(theme, 32)}>{r.places.heading}</h1>
        <p className="text-xs" style={{ color: c.muted }}>{r.places.hint}</p>
      </div>
      <div className="px-3 py-4" style={panelStyle(theme)}>
        <div className="flex gap-2">
          <div className="flex flex-col text-xs tabular-nums shrink-0" style={{ color: c.mutedOnSurface }}>
            {recap.teams.map((_, i) => (
              <span key={i} className="flex items-center" style={{ height: ROW }}>{r.places.place(i + 1)}</span>
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <svg
              viewBox={`0 0 ${WIDTH} ${height}`}
              preserveAspectRatio="none"
              className="w-full block"
              style={{ height }}
            >
              {recap.teams.map((_, i) => (
                <line key={i} x1={0} x2={WIDTH} y1={y(i + 1)} y2={y(i + 1)} stroke={c.border} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
              {[...recap.teams].reverse().map((team, i) => (
                <path
                  key={team.id}
                  d={lineOf(team.id)}
                  fill="none"
                  stroke={team.color}
                  strokeWidth={3}
                  strokeOpacity={picked && team.id !== picked.id ? 0.25 : 1}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  pathLength={1}
                  className="recap-draw transition-[stroke-opacity] duration-300"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
              {/* The picked team on top, drawn again when someone taps it */}
              {picked && (
                <path
                  key={`picked-${picked.id}`}
                  d={lineOf(picked.id)}
                  fill="none"
                  stroke={picked.color}
                  strokeWidth={5.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  pathLength={1}
                  className={tapped ? 'recap-draw-fast' : 'recap-draw'}
                  style={tapped ? undefined : { animationDelay: `${recap.teams.length * 120}ms` }}
                />
              )}
              {/* Wide invisible strokes, so a line is easy to hit with a finger */}
              {recap.teams.map(team => (
                <path
                  key={`hit-${team.id}`}
                  d={lineOf(team.id)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="stroke"
                  className="cursor-pointer"
                  onClick={() => pick(team.id)}
                />
              ))}
            </svg>
            <div className="flex justify-between text-[11px] mt-1" style={{ color: c.mutedOnSurface }}>
              <span>{r.duration(0)}</span>
              <span>{r.duration(end)}</span>
            </div>
          </div>
          <div className="flex flex-col text-xs shrink-0 max-w-[40%]">
            {recap.teams.map(team => (
              <button
                key={team.id}
                onClick={() => pick(team.id)}
                className="flex items-center gap-1.5 truncate recap-in text-left transition-opacity"
                style={{
                  height: ROW,
                  fontWeight: team.id === selected ? 700 : 500,
                  color: c.onSurface,
                  opacity: picked && team.id !== picked.id ? 0.5 : 1,
                  animationDelay: '1800ms',
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: team.color }} />
                <span className="truncate">{team.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
