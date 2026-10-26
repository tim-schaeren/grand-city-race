import { Link, useParams } from 'react-router-dom';
import { consoleCopy as cc } from '@grandcityrace/shared';
import Icon from '../../components/Icon';
import { to } from '../../shell/to';
import { TeamDot } from '../../ui/EntityLink';
import { STALE_MS, type LastLocation } from '../positions';
import { formatAge } from './markers';
import type { Row } from './rows';

// The teams beside the map (on phones, in a sheet over it): a picked team
// opens to its players, each with when their position last came in
export function TeamList({ rows, selectedId, now, onPick, onPlayer }: {
  rows: Row[];
  selectedId: string | null;
  now: number;
  onPick: (teamId: string) => void;
  onPlayer: (at: LastLocation) => void;
}) {
  const { gameId } = useParams();
  return (
    <ul className="divide-y divide-gray-100">
      {rows.map(({ team, members, position, status }) => {
        const picked = team.id === selectedId;
        return (
          <li key={team.id} className={picked ? 'bg-gray-100' : ''}>
            <button
              type="button"
              aria-pressed={picked}
              onClick={() => onPick(team.id)}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${picked ? '' : 'hover:bg-gray-50'}`}
            >
              <span className="mt-0.5"><TeamDot color={team.color} size={14} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate text-sm text-gray-900 ${picked ? 'font-bold' : 'font-semibold'}`}>{team.name}</span>
                  <span className={`shrink-0 text-xs ${!position || position.stale ? 'text-red-500' : 'text-gray-400'}`}>
                    {position ? formatAge(position.updatedAt, now) : cc.liveMapPage.noPosition}
                  </span>
                </span>
                {status && (
                  <span className={`flex items-center gap-1 text-xs ${status.tone === 'plain' ? 'text-gray-500' : 'text-green-700'}`}>
                    {status.tone === 'done' && <Icon name="check" size={13} />}
                    {status.text}
                  </span>
                )}
              </span>
            </button>
            {picked && (
              <ul className="pb-2 pl-[2.625rem] pr-4">
                <li className="pb-1 text-xs">
                  <Link to={to.team(gameId!, team.id)} className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-2 hover:decoration-gray-900">
                    {cc.liveMapPage.teamPage}
                  </Link>
                </li>
                {members.length === 0 && <li className="py-1 text-xs text-gray-400">{cc.liveMapPage.noPlayers}</li>}
                {[...members].sort((a, b) => a.name.localeCompare(b.name)).map(p => {
                  const at = p.position?.updatedAt;
                  return (
                    <li key={p.uid}>
                      <button
                        type="button"
                        disabled={!p.position}
                        onClick={() => p.position && onPlayer(p.position)}
                        className="flex w-full items-baseline justify-between gap-2 py-1 text-left text-xs hover:underline disabled:cursor-default disabled:no-underline"
                      >
                        <span className="truncate text-gray-700">{p.name}</span>
                        <span className={`shrink-0 ${!at || now - at > STALE_MS ? 'text-red-500' : 'text-gray-400'}`}>
                          {at ? formatAge(at, now) : cc.liveMapPage.noPosition}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
