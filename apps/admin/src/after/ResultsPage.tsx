import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { consoleCopy as cc, formatDuration, gameEconomy, raceTimeMs, teamCoins } from '@grandcityrace/shared';
import { useGame, type GameWithId } from '../data/games';
import { dataOr } from '../data/live';
import { useTeams } from '../data/teams';
import { rankTeams } from '../race/standings';
import { to } from '../shell/to';
import { Button, LinkButton } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TeamLink } from '../ui/EntityLink';
import { Page } from '../ui/Page';
import { Panel } from '../ui/Panel';
import { Empty, Loading, Show } from '../ui/States';
import { host } from '../utils/api';
import { fromZonedInput, gameTimeZone, toZonedInput } from '../utils/zonedTime';

// After the race: the final standings, where a team's result is put right,
// and starting over to run the race again
export default function ResultsPage() {
  const { gameId } = useParams();
  const game = dataOr(useGame(gameId), null);
  if (!game) return <Loading />;
  return <Results game={game} />;
}

function Results({ game }: { game: GameWithId }) {
  const teams = useTeams(game.id);
  const economy = gameEconomy(game);
  const total = game.questOrder?.length ?? 0;
  return (
    <Page
      title={cc.results.title}
      description={game.endedAt ? undefined : cc.results.notOver}
      actions={<LinkButton to={to.recap(game.id)}>{cc.results.toRecap}</LinkButton>}
    >
      <div className="space-y-6">
        <Panel title={game.endedAt ? cc.results.standings : cc.results.standingsSoFar} description={cc.results.corrections}>
          <Show live={teams} isEmpty={t => t.length === 0} empty={<Empty title={cc.results.noTeams} />}>
            {list => (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="w-10 py-2 font-medium">#</th>
                    <th className="py-2 font-medium">{cc.results.team}</th>
                    <th className="py-2 font-medium">{cc.results.result}</th>
                    <th className="py-2 text-right font-medium">{cc.results.coins}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rankTeams(list).map((team, i) => {
                    const time = raceTimeMs(team, game);
                    return (
                      <tr key={team.id}>
                        <td className="py-2 tabular-nums text-gray-500">{i + 1}</td>
                        <td className="py-2"><TeamLink id={team.id} name={team.name} color={team.color} /></td>
                        <td className="py-2 text-gray-700">
                          {team.finishedAt && time !== null
                            ? cc.results.finishedIn({ time: formatDuration(time) })
                            : cc.results.solved({ n: team.solvedCount ?? 0, of: total })}
                        </td>
                        <td className="py-2 text-right tabular-nums text-gray-700">{teamCoins(team, economy)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Show>
        </Panel>
        {game.endedAt && <ResetGame game={game} />}
      </div>
    </Page>
  );
}

// Everyone back to the start, to run the race again: at a new start, so the
// race waits for it instead of running again at once
function ResetGame({ game }: { game: GameWithId }) {
  const navigate = useNavigate();
  const zone = gameTimeZone(game);
  const [asking, setAsking] = useState(false);
  // Tomorrow, on the hour, as a start to change
  const [start, setStart] = useState(() => toZonedInput(Math.ceil((Date.now() + 86_400_000) / 3_600_000) * 3_600_000, zone));
  return (
    <Panel title={cc.results.reset}>
      <Button onClick={() => setAsking(true)}>{cc.results.reset}</Button>
      {asking && (
        <ConfirmDialog
          title={cc.results.resetTitle}
          confirmLabel={cc.results.reset}
          typeToConfirm={game.name}
          onConfirm={async () => {
            const startDateTime = fromZonedInput(start, zone);
            if (!(startDateTime > Date.now())) throw new Error(cc.settings.startInFuture);
            await host('reset', { gameId: game.id, startDateTime });
            navigate(to.overview(game.id));
          }}
          onClose={() => setAsking(false)}
        >
          <p className="mb-3">{cc.results.resetConfirm}</p>
          <label className="block">
            <span className="mb-1 block text-sm text-gray-700">{cc.results.newStart({ zone: zone.replace(/_/g, ' ') })}</span>
            <input
              type="datetime-local"
              value={start}
              onChange={e => setStart(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </label>
        </ConfirmDialog>
      )}
    </Panel>
  );
}
