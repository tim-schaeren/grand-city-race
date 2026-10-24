import { useState, useEffect, useMemo, useCallback } from 'react';
import { copy, themeFor, SHOP_ITEMS } from '@gcr26/shared';
import { headingStyle, headingOnSurface, panelStyle, buttonStyle } from '../utils/themeStyle';
import Icon from '../components/Icon';
import ReplaySlide from './ReplaySlide';
import PlacesSlide from './PlacesSlide';
import './recap.css';

const r = copy.recap;

const AWARD_ICONS = {
  mostCursed: 'skull-outline',
  curseMaster: 'skull-outline',
  archrivals: 'sword-cross',
  robinHood: 'sack-percent',
  shieldWall: 'shield-check-outline',
  bouncedOff: 'shield-outline',
  wastedShield: 'shield-outline',
  hintLovers: 'lightbulb-outline',
  noHints: 'check-circle-outline',
  scrooge: 'circle-multiple-outline',
  bigSpender: 'circle-multiple-outline',
  generous: 'hand-coin-outline',
  marathon: 'map-marker-outline',
  comeback: 'trophy-outline',
};

// The recap as a sequence of slides, told the way party games end: one thing
// at a time, and Next (or the arrow keys, on a big screen) goes on. Hosts see
// it in the console; the app shows this same page to players. It wears the
// race's current theme, so a host changing the look needn't build it again.
export default function Recap({ recap, themeId, viewerTeamId = null, onClose }) {
  const theme = themeFor(themeId ?? recap.game.themeId);
  const c = theme.colors;
  const teamById = useMemo(() => Object.fromEntries(recap.teams.map(t => [t.id, t])), [recap]);

  // Awards are revealed one per step
  const steps = useMemo(() => [
    { slide: 'intro' },
    { slide: 'replay' },
    { slide: 'places' },
    ...(recap.awards.length
      ? recap.awards.map((_, i) => ({ slide: 'awards', award: i }))
      : [{ slide: 'awards', award: null }]),
    { slide: 'team' },
    { slide: 'standings' },
  ], [recap]);
  const [step, setStep] = useState(0);
  const last = step === steps.length - 1;
  const go = useCallback(delta => setStep(s => {
    if (delta > 0 && s === steps.length - 1) return 0;
    return Math.max(0, Math.min(steps.length - 1, s + delta));
  }), [steps.length]);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const current = steps[step];
  const slideIndex = ['intro', 'replay', 'places', 'awards', 'team', 'standings'].indexOf(current.slide);
  const props = { recap, theme, teamById, viewerTeamId };

  return (
    <div className="min-h-[100svh] flex flex-col" style={{ background: c.background, color: c.text }}>
      <header className="w-full max-w-3xl mx-auto px-4 pt-4 flex items-center gap-3">
        <div className="flex-1 flex gap-1.5">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <span
              key={i}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: i <= slideIndex ? c.heading : c.border }}
            />
          ))}
        </div>
        {onClose && (
          <button onClick={onClose} aria-label={r.close} style={{ color: c.muted }}>
            <Icon name="close" size={22} />
          </button>
        )}
      </header>

      <main
        key={current.slide === 'awards' ? `award-${current.award}` : current.slide}
        className="recap-in flex-1 w-full max-w-3xl mx-auto px-4 py-6 flex flex-col"
      >
        {current.slide === 'intro' && <IntroSlide {...props} />}
        {current.slide === 'replay' && <ReplaySlide {...props} />}
        {current.slide === 'places' && <PlacesSlide {...props} />}
        {current.slide === 'awards' && <AwardSlide {...props} index={current.award} />}
        {current.slide === 'team' && <TeamSlide {...props} />}
        {current.slide === 'standings' && <StandingsSlide {...props} />}
      </main>

      <footer className="w-full max-w-3xl mx-auto px-4 pb-6 flex gap-3">
        {step > 0 && (
          <button
            onClick={() => go(-1)}
            className="px-5 py-3"
            style={{ ...panelStyle(theme), fontFamily: buttonStyle(theme).fontFamily }}
          >
            {r.back}
          </button>
        )}
        <button onClick={() => go(1)} className="flex-1 py-3 text-base" style={buttonStyle(theme)}>
          {last ? r.again : r.next}
        </button>
      </footer>
    </div>
  );
}

export function TeamChip({ team, theme, size = 'sm' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${size === 'lg' ? 'text-lg font-semibold' : 'text-sm font-medium'}`}>
      <span
        className={`${size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} rounded-full shrink-0`}
        style={{ background: team.color, boxShadow: `0 0 0 2px ${theme.colors.background}` }}
      />
      {team.name}
    </span>
  );
}

function Heading({ theme, children, size = 32 }) {
  return <h1 className="mb-1" style={headingStyle(theme, size)}>{children}</h1>;
}

function IntroSlide({ recap, theme }) {
  const c = theme.colors;
  const { game, teams } = recap;
  const date = new Date(game.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const covered = teams.reduce((sum, t) => sum + t.stats.distanceMeters, 0);
  const facts = [
    r.intro.teams(teams.length),
    r.duration(game.durationSeconds),
    r.intro.quests(game.questCount),
    ...(covered ? [r.intro.covered(r.distance(covered))] : []),
  ];
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
      <p className="text-xs tracking-[0.25em] uppercase" style={{ color: c.muted }}>{r.intro.kicker}</p>
      <Heading theme={theme} size={44}>{game.name}</Heading>
      <p style={{ color: c.muted }}>{r.intro.when(game.city, date)}</p>
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {facts.map((fact, i) => (
          <span key={fact} className="recap-pop px-3 py-1.5 text-sm" style={{ ...panelStyle(theme), animationDelay: `${300 + i * 150}ms` }}>
            {fact}
          </span>
        ))}
      </div>
    </div>
  );
}

function AwardSlide({ recap, theme, teamById, index }) {
  const c = theme.colors;
  if (index === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
        <Heading theme={theme}>{r.awards.heading}</Heading>
        <p style={{ color: c.muted }}>{r.awards.none}</p>
      </div>
    );
  }
  const award = recap.awards[index];
  const words = r.awards[award.id];
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
      <p className="text-xs tracking-[0.25em] uppercase" style={{ color: c.muted }}>
        {r.awards.heading} · {index + 1}/{recap.awards.length}
      </p>
      <div className="recap-pop w-full max-w-sm px-6 py-8 flex flex-col items-center gap-4" style={panelStyle(theme)}>
        <span className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: c.accent, color: c.onAccent }}>
          <Icon name={AWARD_ICONS[award.id]} size={34} />
        </span>
        <h2 style={{ ...headingStyle(theme, 28), color: headingOnSurface(theme) }}>{words.title}</h2>
        <div className="flex flex-col items-center gap-1.5">
          {award.teamIds.map(id => teamById[id] && <TeamChip key={id} team={teamById[id]} theme={theme} size="lg" />)}
        </div>
        <p style={{ color: c.mutedOnSurface }}>{words.text(award.value)}</p>
        {award.feud && (
          <div className="flex flex-col gap-0.5 text-sm font-semibold" style={{ color: c.onSurface }}>
            {award.feud.map(f => (
              <span key={f.from}>{r.awards.feud(teamById[f.from]?.name ?? '', teamById[f.to]?.name ?? '', f.count)}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamSlide({ recap, theme, teamById, viewerTeamId }) {
  const c = theme.colors;
  const [teamId, setTeamId] = useState(
    recap.teams.some(t => t.id === viewerTeamId) ? viewerTeamId : recap.teams[0]?.id,
  );
  const team = recap.teams.find(t => t.id === teamId);
  if (!team) return null;
  const s = team.stats;
  const rows = [
    [r.team.distance, r.distance(s.distanceMeters), true],
    [r.team.hints, String(s.hints), true],
    [r.team.earned, r.team.coins(s.coinsEarned), true],
    [r.team.spent, r.team.coins(s.coinsSpent), true],
    [r.team.left, r.team.coins(s.coinsLeft), true],
    [r.team.cursed, r.team.times(s.cursesCast), s.cursesCast > 0],
    [r.team.wasCursed, r.team.times(s.cursesReceived), s.cursesReceived > 0],
    [r.team.stole, r.team.coins(s.stolen), s.stolen > 0],
    [r.team.lost, r.team.coins(s.lostToRobbery), s.lostToRobbery > 0],
    [r.team.gave, r.team.coins(s.donatedOut), s.donatedOut > 0],
    [r.team.got, r.team.coins(s.donatedIn), s.donatedIn > 0],
    [r.team.blocked, r.team.times(s.blocksByShield), s.blocksByShield > 0],
    [r.team.nemesis, s.nemesisId ? r.team.nemesisValue(teamById[s.nemesisId]?.name ?? '', s.nemesisAttacks) : '', !!s.nemesisId],
  ].filter(row => row[2]);
  const bought = SHOP_ITEMS.filter(item => s.bought[item.type]).map(item => `${s.bought[item.type]}× ${item.name}`);
  const others = recap.teams.filter(t => t.id !== viewerTeamId);

  return (
    <div className="flex flex-col gap-4">
      <Heading theme={theme}>{team.id === viewerTeamId ? r.team.heading : team.name}</Heading>
      <div className="recap-pop px-5 py-5 flex flex-col gap-4" style={panelStyle(theme)}>
        <div className="flex items-center justify-between gap-3">
          <TeamChip team={team} theme={theme} size="lg" />
          <span style={{ ...headingStyle(theme, 22), color: headingOnSurface(theme) }}>{r.team.place(s.place)}</span>
        </div>
        <p className="text-sm" style={{ color: c.mutedOnSurface }}>
          {s.finishedAt !== null
            ? r.team.finishedAfter(r.duration(s.finishedAt))
            : r.team.questsSolved(s.questsSolved, recap.game.questCount)}
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt style={{ color: c.mutedOnSurface }}>{label}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}
          <dt style={{ color: c.mutedOnSurface }}>{r.team.bought}</dt>
          <dd className="text-right font-semibold">{bought.length ? bought.join(', ') : r.team.boughtNothing}</dd>
        </dl>
      </div>
      {others.length > 0 && (
        <div className="flex flex-col gap-2">
          {viewerTeamId && <p className="text-xs tracking-[0.2em] uppercase" style={{ color: c.muted }}>{r.team.allTeams}</p>}
          <div className="flex flex-wrap gap-2">
            {recap.teams.map(t => (
              <button
                key={t.id}
                onClick={() => setTeamId(t.id)}
                className="px-3 py-1.5"
                style={{ ...panelStyle(theme), outline: t.id === teamId ? `2px solid ${c.heading}` : 'none', outlineOffset: 2 }}
              >
                <TeamChip team={t} theme={theme} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StandingsSlide({ recap, theme, viewerTeamId }) {
  const c = theme.colors;
  const [winner, ...others] = recap.teams;
  const outline = id => (id === viewerTeamId ? { outline: `2px solid ${c.heading}`, outlineOffset: 3 } : null);
  const result = team => (team.stats.finishedAt !== null
    ? r.standings.finished(r.duration(team.stats.finishedAt))
    : r.standings.quests(team.stats.questsSolved, recap.game.questCount));
  if (!winner) return null;
  return (
    <div className="flex flex-col gap-4">
      <Heading theme={theme}>{r.standings.heading}</Heading>
      {/* The winner, revealed last, in the theme's strongest colour, and half
          again the size of the other rows */}
      <div
        className="recap-winner px-5 py-4 flex items-center gap-4"
        style={{
          ...panelStyle(theme),
          background: c.accent,
          color: c.onAccent,
          borderColor: theme.shape.shadowOffset ? c.shadow : c.accent,
          animationDelay: `${others.length * 180 + 250}ms`,
          ...outline(winner.id),
        }}
      >
        <span className="w-16 shrink-0 flex flex-col items-start gap-0.5">
          <span className="recap-trophy" style={{ animationDelay: `${others.length * 180 + 750}ms` }}>
            <Icon name="trophy-outline" size={26} />
          </span>
          <span style={{ ...headingStyle(theme, 33), color: c.onAccent, textShadow: 'none' }}>
            {r.places.place(winner.stats.place)}
          </span>
        </span>
        <span className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="inline-flex items-center gap-2.5 text-[21px] font-semibold leading-tight">
            <span className="w-[18px] h-[18px] rounded-full shrink-0" style={{ background: winner.color, boxShadow: `0 0 0 2px ${c.onAccent}` }} />
            {winner.name}
          </span>
          <span className="text-sm opacity-85">{result(winner)}</span>
        </span>
      </div>
      <ol className="flex flex-col gap-2">
        {others.map((team, i) => (
          <li
            key={team.id}
            className="recap-pop px-4 py-3 flex items-center gap-4"
            style={{
              ...panelStyle(theme),
              animationDelay: `${(others.length - 1 - i) * 180}ms`,
              ...outline(team.id),
            }}
          >
            <span
              className="w-12 shrink-0"
              style={{ ...headingStyle(theme, i < 2 ? 24 : 20), color: headingOnSurface(theme) }}
            >
              {r.places.place(team.stats.place)}
            </span>
            <span className="flex-1 min-w-0">
              <TeamChip team={team} theme={theme} />
            </span>
            <span className="text-xs text-right shrink-0 opacity-75">{result(team)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
