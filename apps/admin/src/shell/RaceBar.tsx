import { useState } from 'react';
import { consoleCopy as cc, formatDuration, hasStarted, pausedMsNow } from '@grandcityrace/shared';
import { host } from '../utils/api';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Status } from '../ui/Status';
import { useNow } from './useNow';
import type { GameWithId } from '../data/games';

// Above every race page: how long the race has run, and pausing, resuming
// and ending it, so they're never more than a glance away
export function RaceBar({ game }: { game: GameWithId }) {
  const now = useNow(1000);
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: 'pause' | 'resume') {
    setBusy(true);
    setError(null);
    try {
      await host(action, { gameId: game.id });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const started = hasStarted(game, now);
  const elapsed = started ? now - game.startDateTime - pausedMsNow(game, now) : 0;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 bg-white px-4 py-2 md:px-8">
      {game.pausedAt ? (
        <Status tone="warn">{cc.raceBar.paused}</Status>
      ) : started ? (
        <Status tone="good">{cc.raceBar.running}</Status>
      ) : (
        <Status>{cc.raceBar.startsIn}</Status>
      )}
      {started && <span className="text-sm tabular-nums text-gray-600">{formatDuration(elapsed)}</span>}
      <span className="flex-1" />
      {error && <span className="text-xs text-red-600">{error}</span>}
      <span className="flex gap-2">
        {game.pausedAt
          ? <Button size="small" disabled={busy} onClick={() => run('resume')}>{cc.raceBar.resume}</Button>
          : started && <Button size="small" disabled={busy} onClick={() => run('pause')}>{cc.raceBar.pause}</Button>}
        <Button size="small" tone="danger" disabled={busy} onClick={() => setConfirmEnd(true)}>{cc.raceBar.end}</Button>
      </span>
      {confirmEnd && (
        <ConfirmDialog
          title={cc.raceBar.endTitle}
          confirmLabel={cc.raceBar.endForGood}
          typeToConfirm={game.name}
          onConfirm={() => host('end', { gameId: game.id })}
          onClose={() => setConfirmEnd(false)}
        >
          {cc.raceBar.endBody}
        </ConfirmDialog>
      )}
    </div>
  );
}
