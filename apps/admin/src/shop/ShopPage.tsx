import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  consoleCopy as cc, formatActivityTime, SHOP_ITEMS, shopConfig,
  type ShopItemConfig, type ShopItemDefinition, type ShopItemSetting,
} from '@grandcityrace/shared';
import Icon from '../components/Icon';
import { phaseOf, useGame, type GameWithId } from '../data/games';
import { dataOr } from '../data/live';
import { useNow } from '../shell/useNow';
import { Button } from '../ui/Button';
import { ItemLink } from '../ui/EntityLink';
import { Page } from '../ui/Page';
import { Loading } from '../ui/States';
import { Status } from '../ui/Status';
import { Toggle } from '../ui/Toggle';
import { gameTimeZone } from '../utils/zonedTime';
import { FlashSalePanel } from './FlashSalePanel';
import { saveItem, type ItemFields } from './saveItem';

const SETTING_MIN: Record<ShopItemSetting, number> = { durationMinutes: 1, percent: 1, cap: 1 };

export default function ShopPage() {
  const { gameId } = useParams();
  const game = dataOr(useGame(gameId), null);
  const now = useNow(15_000);
  if (!game) return <Loading />;
  const config = shopConfig(game, now);
  const racing = phaseOf(game, now) === 'race';
  return (
    <Page title={cc.shop.title}>
      {racing && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{cc.shop.liveNote}</p>}
      {/* A flash sale only means something while teams are buying */}
      {racing && (
        <div className="mb-6">
          <FlashSalePanel game={game} config={config} />
        </div>
      )}
      <div className="space-y-3">
        {SHOP_ITEMS.map(item => (
          // Remounting when a stored value changes picks up another host's
          // edit, without an effect that would fight this host's typing
          <ItemCard
            key={`${item.type}:${JSON.stringify({ ...config[item.type], sale: null })}`}
            game={game}
            item={item}
            config={config[item.type]}
            racing={racing}
          />
        ))}
      </div>
    </Page>
  );
}

function ItemCard({ game, item, config, racing }: { game: GameWithId; item: ShopItemDefinition; config: ShopItemConfig; racing: boolean }) {
  const settings = Object.entries(item.settings) as [ShopItemSetting, string][];
  const initial = { price: String(config.basePrice), ...Object.fromEntries(settings.map(([key]) => [key, String(config[key])])) } as Record<string, string>;
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = Object.keys(initial).some(key => values[key] !== initial[key]);

  async function save(fields: ItemFields) {
    setSaving(true);
    try {
      await saveItem(game.id, item.type, fields, { racing, priceChanged: fields.price !== undefined && fields.price !== config.basePrice });
    } finally {
      setSaving(false);
    }
  }

  function saveValues() {
    const price = Number(values.price);
    if (!Number.isInteger(price) || price < 0) return setError(cc.shop.zeroOrMore);
    const fields: ItemFields = { price };
    for (const [key, label] of settings) {
      const n = Number(values[key]);
      const name = label.replace(/ \(.*\)$/, '');
      if (!Number.isInteger(n) || n < SETTING_MIN[key]) return setError(cc.shop.atLeastOne({ label: name }));
      if (key === 'percent' && n > 100) return setError(cc.shop.upTo100({ label: name }));
      fields[key] = n;
    }
    setError(null);
    save(fields);
  }

  const input = (key: string, label: string) => (
    <label key={key} className="block">
      <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>
      <input
        type="number"
        min={0}
        maxLength={6}
        value={values[key]}
        onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
        className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
    </label>
  );

  return (
    <section className={`rounded-lg border bg-white p-5 ${config.enabled ? 'border-gray-200' : 'border-gray-100'}`}>
      <div className="flex items-start gap-3">
        <Icon name={item.icon} size={24} className="text-gray-700" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className={`text-sm ${config.enabled ? '' : 'opacity-50'}`}><ItemLink type={item.type}>{item.name}</ItemLink></h2>
            {item.targetsTeam && <span className="text-[11px] text-gray-400">{cc.shop.onAnotherTeam}</span>}
            {config.sale && (
              <Status tone="good">{cc.shop.saleNow({ percent: config.sale.percent, until: formatActivityTime(config.sale.until, gameTimeZone(game)) })}</Status>
            )}
            <span className="ml-auto">
              <Toggle on={config.enabled} onChange={enabled => save({ enabled })} name={item.name} />
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">{item.description}</p>
          {config.enabled && (
            <>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                {input('price', cc.shop.price)}
                {settings.map(([key, label]) => input(key, label))}
                <Button tone="primary" disabled={!dirty || saving} onClick={saveValues}>
                  {saving ? cc.shop.saving : dirty ? cc.shop.save : cc.shop.saved}
                </Button>
              </div>
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
