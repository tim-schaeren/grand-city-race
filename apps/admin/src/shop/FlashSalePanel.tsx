import { useState } from 'react';
import {
  consoleCopy as cc, formatActivityTime, SHOP_ITEMS, type ShopConfig, type ShopItemType,
} from '@grandcityrace/shared';
import type { GameWithId } from '../data/games';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { gameTimeZone } from '../utils/zonedTime';
import { endSale, startSale } from './saveItem';

const PERCENTS = [25, 50, 75, 100];
const MINUTES = [5, 10, 15, 30];
const names = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

// While the race runs: a sale in the shop for a while, over the items the
// host picks, announced to everyone, and over by itself when the time is up
export function FlashSalePanel({ game, config }: { game: GameWithId; config: ShopConfig }) {
  const onSale = SHOP_ITEMS.filter(item => config[item.type].enabled);
  const inSale = onSale.filter(item => config[item.type].sale);
  const [picked, setPicked] = useState<ShopItemType[]>([]);
  const [percent, setPercent] = useState(50);
  const [minutes, setMinutes] = useState(15);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try { await action(); } finally { setBusy(false); }
  }

  const choice = (options: number[], value: number, onChange: (n: number) => void, label: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>
      <select value={value} onChange={e => onChange(Number(e.target.value))} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
        {options.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  );

  let body;
  if (inSale.length > 0) {
    const sale = config[inSale[0].type].sale!;
    body = (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-green-700">
          {cc.shop.saleRunning({
            items: names.format(inSale.map(item => item.name)),
            percent: sale.percent,
            until: formatActivityTime(sale.until, gameTimeZone(game)),
          })}
        </span>
        <Button size="small" disabled={busy} onClick={() => run(() => endSale(game.id, inSale.map(item => item.type)))}>{cc.shop.endSale}</Button>
      </div>
    );
  } else if (onSale.length === 0) {
    body = <p className="text-sm text-gray-500">{cc.shop.flashSaleNothing}</p>;
  } else {
    body = (
      <div className="space-y-4">
        <fieldset>
          <legend className="mb-1 text-xs font-medium text-gray-700">{cc.shop.saleItems}</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {onSale.map(item => (
              <label key={item.type} className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  className="accent-gray-900"
                  checked={picked.includes(item.type)}
                  onChange={e => setPicked(p => (e.target.checked ? [...p, item.type] : p.filter(t => t !== item.type)))}
                />
                {item.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-end gap-3">
          {choice(PERCENTS, percent, setPercent, cc.shop.discount)}
          {choice(MINUTES, minutes, setMinutes, cc.shop.minutes)}
          <Button tone="primary" disabled={busy || picked.length === 0} onClick={() => run(async () => {
            await startSale(game.id, picked, percent, minutes);
            setPicked([]);
          })}>{cc.shop.startSale}</Button>
        </div>
      </div>
    );
  }

  return <Panel title={cc.shop.flashSale} description={cc.shop.flashSaleHelp}>{body}</Panel>;
}
