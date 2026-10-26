import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { consoleCopy as cc, type ChatMessage } from '@grandcityrace/shared';
import { useMessages } from '../data/chat';
import { useGame, type GameWithId } from '../data/games';
import { dataOr } from '../data/live';
import { usePlayers, type HostPlayer } from '../data/players';
import { useTeams } from '../data/teams';
import { useNow } from '../shell/useNow';
import { to } from '../shell/to';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Select } from '../ui/Field';
import { TeamLink } from '../ui/EntityLink';
import { Page } from '../ui/Page';
import { Panel } from '../ui/Panel';
import { Empty, Show } from '../ui/States';
import { host } from '../utils/api';
import { gameTimeZone } from '../utils/zonedTime';
import { BackLink } from './BackLink';
import { ago, clock } from './time';

// One player: their team, where they last were, what they wrote to the
// hosts; moving them to another team, or out of the game
export default function PlayerPage() {
  const { gameId, uid } = useParams();
  const game = useGame(gameId);
  const players = usePlayers(gameId);
  return (
    <div>
      <BackLink fallback={to.teams(gameId!)} />
      <Show live={players}>
        {list => {
          const player = list.find(p => p.uid === uid);
          const g = dataOr(game, null);
          if (!player) return <Empty title={cc.entities.notFound} />;
          if (!g) return null;
          return <PlayerDetails game={g} player={player} />;
        }}
      </Show>
    </div>
  );
}

function PlayerDetails({ game, player }: { game: GameWithId; player: HostPlayer }) {
  const navigate = useNavigate();
  const now = useNow(15_000);
  const zone = gameTimeZone(game);
  const teams = dataOr(useTeams(game.id), []);
  const team = teams.find(t => t.id === player.teamId) ?? null;
  const messages = dataOr(useMessages(game.id), [] as ChatMessage[]).filter(m => m.authorId === player.uid && !m.fromHost);
  const [moveTo, setMoveTo] = useState(player.teamId ?? '');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const joined = new Date(player.joinedAt).toLocaleDateString([], { day: 'numeric', month: 'long', timeZone: zone });

  return (
    <Page
      title={player.name}
      description={cc.playerPage.joined({ when: joined })}
      actions={<Button tone="danger" onClick={() => setConfirmRemove(true)}>{cc.playerPage.remove}</Button>}
    >
      {confirmRemove && (
        <ConfirmDialog
          title={cc.playerPage.removeTitle({ name: player.name })}
          confirmLabel={cc.playerPage.removeForGood}
          typeToConfirm={player.name}
          onConfirm={async () => {
            await host('removePlayer', { gameId: game.id, uid: player.uid });
            navigate(to.teams(game.id), { replace: true });
          }}
          onClose={() => setConfirmRemove(false)}
        >
          {cc.playerPage.removeConfirm}
        </ConfirmDialog>
      )}
      {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}
      <div className="space-y-6">
        <Panel title={cc.playerPage.inTeam}>
          <p className="mb-3 text-sm">
            {team ? <TeamLink id={team.id} name={team.name} color={team.color} /> : <span className="text-gray-400">{cc.playerPage.noTeam}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <Select aria-label={cc.playerPage.moveTo} value={moveTo} onChange={e => setMoveTo(e.target.value)}>
                <option value="">{cc.playerPage.noTeamOption}</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </div>
            <Button disabled={busy || moveTo === (player.teamId ?? '')} onClick={() =>
              run(() => host('movePlayer', { gameId: game.id, uid: player.uid, teamId: moveTo || null }))
            }>{cc.playerPage.move}</Button>
          </div>
        </Panel>

        <Panel
          title={cc.playerPage.position}
          actions={player.position && team && (
            <Button size="small" onClick={() => navigate(to.map(game.id), { state: { focusTeamId: team.id } })}>{cc.entities.showOnMap}</Button>
          )}
        >
          <p className="text-sm text-gray-700">
            {player.position ? ago(player.position.updatedAt, now) : <span className="text-gray-400">{cc.playerPage.noPosition}</span>}
          </p>
        </Panel>

        <Panel title={cc.playerPage.messages}>
          {messages.length === 0 ? (
            <p className="text-sm text-gray-400">{cc.playerPage.noMessages}</p>
          ) : (
            <ul className="space-y-2">
              {messages.map(m => (
                <li key={m.id} className="flex items-baseline gap-3 text-sm">
                  <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{m.text}</span>
                  <span className="shrink-0 text-xs tabular-nums text-gray-400">{clock(m.sentAt, zone)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </Page>
  );
}
