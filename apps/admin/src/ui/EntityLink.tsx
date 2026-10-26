import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SHOP_ITEMS_BY_TYPE, type ShopItemType } from '@grandcityrace/shared';
import Icon from '../components/Icon';
import { useEntityLinkState } from '../shell/sheet';
import { to } from '../shell/to';

// Every mention of a team, quest, item or player links to its page, like a
// wiki: from the feed, the standings, the map, the chat and each other's pages

const linkClass = 'font-medium text-gray-900 underline decoration-gray-300 underline-offset-2 hover:decoration-gray-900';

function EntityLink({ href, children }: { href: string; children: ReactNode }) {
  const state = useEntityLinkState();
  return (
    <Link to={href} state={state} className={linkClass} onClick={e => e.stopPropagation()}>
      {children}
    </Link>
  );
}

// The game the page is about; links only ever point within it
function useGameId(): string {
  return useParams().gameId!;
}

export function TeamDot({ color, size = 10 }: { color?: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full align-middle"
      style={{ width: size, height: size, background: color ?? '#6b7280' }}
    />
  );
}

export function TeamLink({ id, name, color }: { id: string; name: ReactNode; color?: string }) {
  const gameId = useGameId();
  return (
    <span className="inline-flex items-baseline gap-1.5">
      {color && <TeamDot color={color} />}
      <EntityLink href={to.team(gameId, id)}>{name}</EntityLink>
    </span>
  );
}

export function QuestLink({ id, children }: { id: string; children: ReactNode }) {
  return <EntityLink href={to.quest(useGameId(), id)}>{children}</EntityLink>;
}

export function ItemLink({ type, children }: { type: ShopItemType; children?: ReactNode }) {
  const gameId = useGameId();
  const item = SHOP_ITEMS_BY_TYPE[type];
  return (
    <span className="inline-flex items-baseline gap-1">
      {!children && <Icon name={item.icon} size={14} className="self-center text-gray-500" />}
      <EntityLink href={to.item(gameId, type)}>{children ?? item.name}</EntityLink>
    </span>
  );
}

export function PlayerLink({ uid, name }: { uid: string; name: ReactNode }) {
  return <EntityLink href={to.player(useGameId(), uid)}>{name}</EntityLink>;
}
