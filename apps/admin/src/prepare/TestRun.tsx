import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where } from 'firebase/firestore';
import QRCode from 'qrcode';
import {
  consoleCopy as cc, curseMsLeft, paths, testLink, TEST_TEAM_ID,
  type GamePlayer, type Team, type TeamState,
} from '@grandcityrace/shared';
import { db } from '../firebase';
import { phaseOf, useGame, type GameWithId } from '../data/games';
import { dataOr, useLiveDoc, useLiveQuery } from '../data/live';
import { inOrder, useQuests } from '../data/quests';
import { useNow } from '../shell/useNow';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Page } from '../ui/Page';
import { Panel } from '../ui/Panel';
import { Empty, Loading } from '../ui/States';
import { host } from '../utils/api';

const GIFT = 50;

// Before the race: the host plays it on a phone, on a hidden test team, and
// moves that team along from here. See testRun.ts in the shared package.
export default function TestRun() {
  const { gameId } = useParams();
  const game = dataOr(useGame(gameId), null);
  if (!game) return <Loading />;
  return <TestRunPage game={game} />;
}

function TestRunPage({ game }: { game: GameWithId }) {
  const now = useNow(5_000);
  const team = useLiveDoc(paths.team(game.id, TEST_TEAM_ID), (id, data) => ({ id, ...data }) as Team);
  const state = useLiveDoc(paths.teamState(game.id, TEST_TEAM_ID), (_, data) => data as TeamState);
  const testers = useLiveQuery(
    `testers:${game.id}`,
    () => query(collection(db, paths.players(game.id)), where('teamId', '==', TEST_TEAM_ID)),
    (_, data) => data as GamePlayer,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(type: string, data: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    try {
      await host('testRun', { gameId: game.id, type, ...data });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const page = (children: React.ReactNode) => (
    <Page wide title={cc.testRun.title} description={cc.testRun.description}>
      {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}
      {children}
    </Page>
  );

  if (phaseOf(game, now) !== 'prepare') return page(<Empty title={cc.testRun.raceStarted} />);
  if (team.status !== 'ready' || state.status !== 'ready') return page(<Loading />);
  if (!team.data || !state.data) {
    return page(
      <Empty
        title={cc.testRun.description}
        action={<Button tone="primary" disabled={busy} onClick={() => run('open')}>{cc.testRun.start}</Button>}
      />,
    );
  }

  return page(
    <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Panel title={cc.testRun.onYourPhone}>
          <Invite gameId={game.id} code={state.data.testCode ?? ''} onNewLink={() => run('open')} busy={busy} />
        </Panel>
        <Panel title={cc.testRun.testing}>
          {dataOr(testers, []).length === 0 ? (
            <p className="text-sm text-gray-400">{cc.testRun.nobodyYet}</p>
          ) : (
            <ul className="space-y-1 text-sm text-gray-800">{dataOr(testers, []).map(p => <li key={p.uid}>{p.name}</li>)}</ul>
          )}
        </Panel>
      </div>
      <Controls game={game} team={team.data} state={state.data} busy={busy} run={run} />
    </div>,
  );
}

// The QR code and link that put a phone on the test team
function Invite({ gameId, code, onNewLink, busy }: { gameId: string; code: string; onNewLink: () => void; busy: boolean }) {
  const link = testLink(gameId, code);
  const [image, setImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    QRCode.toDataURL(link, { margin: 1, width: 240 }).then(setImage).catch(() => setImage(null));
  }, [link]);
  return (
    <div className="space-y-3">
      {image && <img src={image} alt="" width={240} height={240} className="mx-auto rounded-lg border border-gray-200" />}
      <p className="text-sm text-gray-600">{cc.testRun.scan}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="small" onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(true))}>
          {copied ? cc.testRun.copied : cc.testRun.copyLink}
        </Button>
        <Button size="small" tone="quiet" disabled={busy} onClick={onNewLink} title={cc.testRun.newLinkHelp}>{cc.testRun.newLink}</Button>
      </div>
    </div>
  );
}

// Moving the test team along, and the rival's attacks on it
function Controls({ game, team, state, busy, run }: {
  game: GameWithId; team: Team; state: TeamState; busy: boolean; run: (type: string, data?: Record<string, unknown>) => void;
}) {
  const quests = inOrder(dataOr(useQuests(game.id), []), game.questOrder);
  const now = useNow(1_000);
  const [ending, setEnding] = useState(false);
  const current = quests.find(q => q.id === (state.currentQuestId ?? game.questOrder?.[0]));
  const cursed = curseMsLeft(state, now) > 0;
  const facts = [
    cc.testRun.coins({ n: state.coins }),
    cursed && cc.testRun.cursed,
    (state.shields ?? 0) > 0 && cc.testRun.shields({ n: state.shields! }),
  ].filter(Boolean).join(' · ');

  return (
    <div className="space-y-6">
      <Panel title={cc.testRun.team} description={facts}>
        <p className="mb-3 text-sm text-gray-800">
          {team.finishedAt || !current
            ? cc.testRun.finished
            : <>{cc.testRun.onQuest({ n: current.number, of: quests.length, title: current.title })}{' '}
                <span className="text-gray-500">· {state.quest?.unlockedAt ? cc.testRun.arrived : cc.testRun.lookingForIt}</span></>}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button tone="primary" disabled={busy || !current || !!state.quest?.unlockedAt} title={cc.testRun.arriveHelp} onClick={() => run('arrive')}>
            {cc.testRun.arrive}
          </Button>
          <Button disabled={busy} onClick={() => host('adjustCoins', { gameId: game.id, teamId: TEST_TEAM_ID, delta: GIFT, reason: cc.testRun.coinsReason })}>
            {cc.testRun.giveCoins({ n: GIFT })}
          </Button>
          {/* Sent by the test rival, a hidden second team, so real teams are never touched */}
          <Button disabled={busy || cursed} onClick={() => run('curse')}>{cc.testRun.curse}</Button>
          <Button disabled={busy} onClick={() => run('robbery')}>{cc.testRun.rob}</Button>
          <Button disabled={busy} title={cc.testRun.restartHelp} onClick={() => run('restart')}>{cc.testRun.restart}</Button>
        </div>
        <ol className="mt-4 divide-y divide-gray-100">
          {quests.map(q => (
            <li key={q.id} className="flex items-center gap-3 py-1.5 text-sm">
              <span className="w-5 text-right text-xs text-gray-400">{q.number}</span>
              <span className="min-w-0 flex-1 truncate">{q.title}</span>
              {q.id === current?.id && !team.finishedAt
                ? <span className="text-xs font-semibold text-gray-900">{cc.testRun.current}</span>
                : <Button size="small" tone="quiet" disabled={busy} onClick={() => run('move', { questId: q.id })}>{cc.testRun.moveHere}</Button>}
            </li>
          ))}
        </ol>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center gap-3">
          <Button tone="danger" disabled={busy} onClick={() => setEnding(true)}>{cc.testRun.end}</Button>
        </div>
        {ending && (
          <ConfirmDialog
            title={cc.testRun.endTitle}
            confirmLabel={cc.testRun.end}
            onConfirm={() => host('testRun', { gameId: game.id, type: 'end' })}
            onClose={() => setEnding(false)}
          >
            {cc.testRun.endHelp}
          </ConfirmDialog>
        )}
      </Panel>
    </div>
  );
}
