import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  consoleCopy as cc, compassMsLeft, curseMsLeft, radarMsLeft, shopConfig, SHOP_ITEMS_BY_TYPE,
  type ShopItemConfig, type ShopItemSetting, type ShopItemType,
} from '@grandcityrace/shared';
import Icon from '../components/Icon';
import { FeedList } from '../feed/FeedList';
import { entryItems } from '../feed/mentions';
import { useActivity } from '../data/activity';
import { useGame, type GameWithId } from '../data/games';
import { dataOr } from '../data/live';
import { useTeams, type HostTeam } from '../data/teams';
import { useNow } from '../shell/useNow';
import { to } from '../shell/to';
import { LinkButton } from '../ui/Button';
import { TeamLink } from '../ui/EntityLink';
import { Page } from '../ui/Page';
import { Panel } from '../ui/Panel';
import { Empty, Show } from '../ui/States';
import { gameTimeZone } from '../utils/zonedTime';
import { BackLink } from './BackLink';
import { clock } from './time';

// One shop item: its settings in this game, which teams have it running,
// and every time it was bought or used
export default function ItemPage() {
  const { gameId, item } = useParams();
  const game = useGame(gameId);
  const definition = SHOP_ITEMS_BY_TYPE[item as ShopItemType];
  return (
    <div>
      <BackLink fallback={to.shop(gameId!)} />
      <Show live={game}>
        {g => (!g || !definition ? <Empty title={cc.entities.notFound} /> : <ItemDetails game={g} type={item as ShopItemType} />)}
      </Show>
    </div>
  );
}

function ItemDetails({ game, type }: { game: GameWithId; type: ShopItemType }) {
  const now = useNow(15_000);
  const zone = gameTimeZone(game);
  const definition = SHOP_ITEMS_BY_TYPE[type];
  const config = shopConfig(game, now)[type];
  const teams = dataOr(useTeams(game.id), []);
  const activity = dataOr(useActivity(game.id), []);
  const feed = useMemo(() => activity.filter(e => entryItems(e).some(m => m.type === type)), [activity, type]);
  const running = teams.flatMap(team => {
    const note = runningNote(type, team, config, now, zone);
    return note ? [{ team, note }] : [];
  });

  return (
    <Page
      wide
      title={<span className="inline-flex items-center gap-3"><Icon name={definition.icon} size={24} className="text-gray-500" />{definition.name}</span>}
      description={!config.enabled ? cc.itemPage.off : config.sale ? cc.itemPage.inSale({ price: config.price }) : cc.itemPage.available({ price: config.price })}
      actions={<LinkButton to={to.shop(game.id)}>{cc.itemPage.change}</LinkButton>}
    >
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Panel title={cc.itemPage.settings} description={definition.description}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
              <dt className="text-gray-500">{cc.itemPage.price}</dt>
              <dd className="tabular-nums">{config.basePrice}</dd>
              {(Object.entries(definition.settings) as [ShopItemSetting, string][]).map(([key, label]) => (
                <Setting key={key} label={label} value={config[key]} />
              ))}
            </dl>
          </Panel>

          {type !== 'donate' && (
            <Panel title={cc.itemPage.running}>
              {running.length === 0 ? (
                <p className="text-sm text-gray-400">{cc.itemPage.nothingRunning}</p>
              ) : (
                <ul className="space-y-1.5">
                  {running.map(({ team, note }) => (
                    <li key={team.id} className="flex items-baseline justify-between gap-2 text-sm">
                      <TeamLink id={team.id} name={team.name} color={team.color} />
                      <span className="text-xs text-gray-500">{note}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </div>

        <Panel title={cc.itemPage.history} description={feed.length ? cc.itemPage.times({ n: feed.length }) : undefined}>
          <FeedList entries={feed} empty={cc.itemPage.never} />
        </Panel>
      </div>
    </Page>
  );
}

function Setting({ label, value }: { label: string; value: number }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="tabular-nums">{String(value)}</dd>
    </>
  );
}

// How the item stands for one team right now, if it's running at all
function runningNote(type: ShopItemType, team: HostTeam, config: ShopItemConfig, now: number, zone: string): string | null {
  const until = (ms: number) => (ms > 0 ? cc.entities.until({ time: clock(now + ms, zone) }) : null);
  switch (type) {
    case 'compass': return until(compassMsLeft(team, now));
    case 'radar': return until(radarMsLeft(team, now));
    case 'curse': return until(curseMsLeft(team, now));
    case 'shield': return (team.shields ?? 0) > 0 ? cc.itemPage.shields({ n: team.shields! }) : null;
    case 'robbery': {
      const left = team.robbedAt ? team.robbedAt + config.durationMinutes * 60_000 - now : 0;
      return left > 0 ? `${cc.itemPage.cooldown} ${until(left)}` : null;
    }
    default: return null;
  }
}
