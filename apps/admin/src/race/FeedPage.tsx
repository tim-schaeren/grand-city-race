import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { consoleCopy as cc, copy, type ActivityEntry } from '@grandcityrace/shared';
import { useActivity } from '../data/activity';
import { dataOr } from '../data/live';
import { useTeams } from '../data/teams';
import { FeedList } from '../feed/FeedList';
import { Button } from '../ui/Button';
import { Select, TextInput } from '../ui/Field';
import { Page } from '../ui/Page';
import { Panel } from '../ui/Panel';
import { Show } from '../ui/States';
import { Toggle } from '../ui/Toggle';
import { logActivity } from '../utils/activity';
import { sendPushToPlayers } from '../utils/push';

const NOTE_LENGTH = 500;

// Everything that happened in the race, and the hosts' notes to every team
export default function FeedPage() {
  const { gameId } = useParams();
  const feed = useActivity(gameId);
  const teams = dataOr(useTeams(gameId), []);
  const [teamId, setTeamId] = useState('');
  const entries = dataOr(feed, [] as ActivityEntry[]);
  const visible = teamId ? entries.filter(e => e.teamId === teamId || e.targetTeamId === teamId) : entries;

  return (
    <Page title={cc.activityPage.activity}>
      <div className="space-y-6">
        <Panel title={cc.activityPage.postANote}>
          <PostNote gameId={gameId!} />
        </Panel>
        {teams.length > 1 && (
          <div className="max-w-xs">
            <Select value={teamId} onChange={e => setTeamId(e.target.value)} aria-label={cc.activityPage.allTeams}>
              <option value="">{cc.activityPage.allTeams}</option>
              {[...teams].sort((a, b) => a.name.localeCompare(b.name)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
        )}
        <Show live={feed}>{() => <FeedList entries={visible} />}</Show>
      </div>
    </Page>
  );
}

function PostNote({ gameId }: { gameId: string }) {
  const [note, setNote] = useState('');
  const [push, setPush] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post() {
    const text = note.trim();
    if (!text || posting) return;
    setPosting(true);
    setError(null);
    try {
      await logActivity(gameId, { type: 'admin_note', text });
      if (push) await sendPushToPlayers(gameId, copy.hostPush.announcement, text);
      setNote('');
      setPush(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <TextInput
            value={note}
            maxLength={NOTE_LENGTH}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && post()}
            placeholder={cc.activityPage.bonusChallengeAtTheFountain}
            aria-label={cc.activityPage.postANote}
          />
        </div>
        <Button tone="primary" disabled={!note.trim() || posting} onClick={post}>
          {posting ? cc.activityPage.posting : cc.activityPage.post}
        </Button>
      </div>
      <Toggle on={push} onChange={setPush} label={cc.activityPage.alsoPush} />
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}
