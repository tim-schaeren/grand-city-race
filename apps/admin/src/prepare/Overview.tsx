import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { consoleCopy as cc, copy, type CheckIssue } from '@grandcityrace/shared';
import HostsPanel from '../components/HostsPanel';
import Icon from '../components/Icon';
import JoinCodePanel from '../components/JoinCodePanel';
import { phaseOf, type GameWithId } from '../data/games';
import { useAuth } from '../hooks/useAuth';
import { to } from '../shell/to';
import { useNow } from '../shell/useNow';
import { Button, LinkButton } from '../ui/Button';
import { Page } from '../ui/Page';
import { Panel } from '../ui/Panel';
import { Empty, Loading } from '../ui/States';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Status } from '../ui/Status';
import { host } from '../utils/api';
import { formatInZone, gameTimeZone } from '../utils/zonedTime';
import { setGuideStep, useGuideStep } from './guide';
import { targetPath, useReadiness, type Step } from './readiness';

// Scrolls to a part of this page and makes it stand out for a moment
function reveal(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.animate([{ boxShadow: '0 0 0 3px #6366f1' }, { boxShadow: '0 0 0 3px transparent' }], { duration: 1600, easing: 'ease-out' });
}

// A link to where something is done. When that's on this very page, it shows
// the part instead of going nowhere, and can say so with its own label.
function GoTo({ to: target, here, className, children }: { to: string; here?: ReactNode; className: string; children: ReactNode }) {
  const { pathname } = useLocation();
  const [path, id] = target.split('#');
  if (path === pathname && id) {
    return <button type="button" onClick={() => reveal(id)} className={className}>{here ?? children}</button>;
  }
  return <Link to={target} className={className}>{children}</Link>;
}

// The game before the race: what's still missing, what the checker finds,
// the invite code and the hosts
export default function Overview() {
  const { gameId } = useParams();
  const { game, missing, steps, issues } = useReadiness(gameId);
  if (missing) return <Empty title={copy.server.noGame} />;
  if (!game) return <Loading />;
  return <GameOverview game={game} steps={steps} issues={issues} />;
}

function GameOverview({ game, steps, issues }: { game: GameWithId; steps: Step[]; issues: CheckIssue[] }) {
  const { user, isAdmin } = useAuth();
  const { hash } = useLocation();
  const navigate = useNavigate();
  // The guide starts at the first step still to do, on its page
  const startGuide = () => {
    const first = Math.max(0, steps.findIndex(step => !step.done));
    setGuideStep(game.id, first);
    navigate(steps[first].to);
  };
  // Ticking, so the page turns to the race the moment it starts
  const now = useNow(1_000);
  const phase = phaseOf(game, now);
  const zone = gameTimeZone(game);
  const when = cc.gamePage.inZone({ time: formatInZone(game.startDateTime, zone), zone: zone.replace(/_/g, ' ') });

  // Links to the invite code land on it
  useEffect(() => {
    if (hash) reveal(hash.slice(1));
  }, [hash, steps.length]);

  return (
    <Page
      wide
      title={game.name}
      description={
        <span className="inline-flex flex-wrap items-center gap-2">
          <Status tone={phase === 'race' ? 'good' : 'neutral'}>
            {game.endedAt ? cc.gamePage.ended : phase === 'race' ? (game.pausedAt ? cc.gamePage.paused : cc.gamePage.running) : cc.gamePage.upcoming}
          </Status>
          {cc.gamePage.scheduledStart({ formatDateTime: when })}
        </span>
      }
      actions={
        <>
          {phase === 'race' && <LinkButton tone="primary" to={to.controls(game.id)}>{cc.overview.toRaceControl}</LinkButton>}
        </>
      }
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          {!game.endedAt && <Checklist game={game} steps={steps} onGuide={startGuide} />}
          <Checker gameId={game.id} issues={issues} />
        </div>
        <div className="space-y-6">
          <div id="invite">
            <JoinCodePanel gameId={game.id} game={game} />
          </div>
          <HostsPanel gameId={game.id} game={game} isAdmin={isAdmin} currentUserId={user?.uid} />
          {phase === 'prepare' && <StartingTheRace game={game} now={now} when={when} issues={issues} />}
        </div>
      </div>
    </Page>
  );
}

// Before the race: it starts by itself at its time, and can be started
// earlier, but not with a problem the checker found. Starting is for everyone
// at once, so it asks for the game's name, after showing what's still worth a look.
function StartingTheRace({ game, now, when, issues }: { game: GameWithId; now: number; when: string; issues: CheckIssue[] }) {
  const navigate = useNavigate();
  const [asking, setAsking] = useState(false);
  const problems = issues.filter(i => i.level === 'problem').length;
  const worthALook = issues.filter(i => i.level !== 'problem');
  // Held: its time came with problems in it, so it waits for the host
  const held = game.startHeld && now >= game.startDateTime;
  const status = held
    ? problems > 0 ? cc.overview.didntStart({ when }) : cc.overview.waitingForYou({ when })
    : problems > 0 ? cc.overview.startsOnceFixed({ when }) : cc.overview.startsBy({ when });
  return (
    <Panel title={cc.overview.startPanel}>
      <p className={`mb-3 text-sm ${held ? 'font-medium text-red-700' : 'text-gray-600'}`}>{status}</p>
      <Button tone={held ? 'primary' : undefined} disabled={problems > 0} onClick={() => setAsking(true)}>{cc.gamePage.startNow}</Button>
      {problems > 0 && (
        <p className="mt-2 text-xs text-red-600">
          {cc.overview.fixFirst({ n: problems })}{' '}
          <button type="button" onClick={() => reveal('checker')} className="underline">{cc.checker.show}</button>
        </p>
      )}
      {asking && (
        <ConfirmDialog
          title={cc.overview.startTitle}
          confirmLabel={cc.overview.startForGood}
          tone="primary"
          typeToConfirm={game.name}
          onConfirm={async () => {
            await host('start', { gameId: game.id });
            navigate(to.controls(game.id));
          }}
          onClose={() => setAsking(false)}
        >
          {worthALook.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 font-medium text-gray-800">{cc.overview.beforeYouStart}</p>
              <ul className="list-disc space-y-1 pl-5">
                {worthALook.map(issue => <li key={issue.key}>{issue.text}</li>)}
              </ul>
            </div>
          )}
          {cc.overview.startBody}
        </ConfirmDialog>
      )}
    </Panel>
  );
}

// What's still to do before the race, each step linked to where it's done
function Checklist({ game, steps, onGuide }: { game: GameWithId; steps: Step[]; onGuide: () => void }) {
  const guideStep = useGuideStep(game.id);
  const done = steps.filter(s => s.done).length;
  return (
    <Panel
      title={cc.checklist.title}
      description={cc.checklist.progress({ done, of: steps.length })}
      actions={guideStep === null && done < steps.length && (
        <Button size="small" onClick={onGuide}>{cc.checklist.guide}</Button>
      )}
    >
      <ol className="divide-y divide-gray-100">
        {steps.map(step => (
          <li key={step.key}>
            <GoTo to={step.to} className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-md px-2 py-2.5 text-left hover:bg-gray-50">
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${step.done ? 'bg-green-600 text-white' : 'border-2 border-gray-300'}`}>
                {step.done && <Icon name="check" size={14} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-medium ${step.done ? 'text-gray-500' : 'text-gray-900'}`}>{step.title}</span>
                {!step.done && <span className="block text-xs text-gray-500">{step.why}</span>}
              </span>
              <Icon name="chevron-right" size={16} className="mt-0.5 shrink-0 text-gray-300" />
            </GoTo>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

const LEVELS = {
  problem: { tone: 'bad', label: cc.checker.problem },
  warning: { tone: 'warn', label: cc.checker.warning },
  note: { tone: 'neutral', label: cc.checker.note },
} as const;

// What would go wrong in the race as it's set up now
function Checker({ gameId, issues }: { gameId: string; issues: CheckIssue[] }) {
  return (
    <Panel title={cc.checker.title} id="checker">
      {issues.length === 0 ? (
        <p className="text-sm text-gray-500">{cc.checker.allGood}</p>
      ) : (
        <ul className="space-y-2">
          {issues.map(issue => (
            <li key={issue.key} className="flex items-start gap-3 text-sm">
              <span className="w-16 shrink-0"><Status tone={LEVELS[issue.level].tone}>{LEVELS[issue.level].label}</Status></span>
              <span className="min-w-0 flex-1 text-gray-800">{issue.text}</span>
              <GoTo to={targetPath(gameId, issue.target)} here={cc.checker.show} className="shrink-0 text-gray-500 hover:text-gray-900">{cc.checker.fix}</GoTo>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
