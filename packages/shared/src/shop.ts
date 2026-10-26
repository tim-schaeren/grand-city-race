import type { Game, TeamState } from './types';
import { copy, consoleCopy } from './copy';

// Items a team can buy with coins. Hosts turn each one on or off per game and
// set its price, so one race can run without a shop while another leans on it.
export type ShopItemType = 'compass' | 'radar' | 'shield' | 'curse' | 'robbery' | 'donate';

export interface ShopItemConfig {
  enabled: boolean;
  price: number;           // what it costs at the moment asked about: the sale price during a flash sale
  basePrice: number;       // the price the host set
  sale: FlashSale | null;  // a flash sale running at that moment
  durationMinutes: number; // how long it lasts, or for robbery the cooldown
  percent: number;         // robbery: share of the target's coins taken
  cap: number;             // robbery: most coins one robbery can take
}

// A discount for a while, announced to everyone; the price goes back by
// itself when it ends, because prices are worked out at the moment of buying
export interface FlashSale {
  percent: number;
  until: number;
}

export const salePrice = (price: number, percent: number) => Math.max(0, Math.round((price * (100 - percent)) / 100));

// The settings a host sees for an item, beyond on/off and price
export type ShopItemSetting = 'durationMinutes' | 'percent' | 'cap';

export interface ShopItemDefinition {
  type: ShopItemType;
  name: string;
  icon: string;          // Material Design Icons name
  description: string;   // shown to hosts and players; the wording lives in the copy catalog
  // Aimed at another team. These are applied by the server, since a team's
  // app may only ever change its own team.
  targetsTeam: boolean;
  // An attack a Shield stops
  isAttack: boolean;
  settings: Partial<Record<ShopItemSetting, string>>; // setting -> label for hosts
  defaults: Omit<ShopItemConfig, 'basePrice' | 'sale'>;
}

const NO_EXTRAS = { durationMinutes: 0, percent: 0, cap: 0 };

// Adding an item means adding an entry here and teaching the app what it does.
// New items start switched off, so games already set up don't change under
// their hosts.
export const SHOP_ITEMS: ShopItemDefinition[] = [
  {
    type: 'compass',
    name: copy.items.compass.name,
    icon: 'compass-outline',
    description: copy.items.compass.description,
    targetsTeam: false,
    isAttack: false,
    settings: { durationMinutes: consoleCopy.itemSettings.lasts },
    defaults: { ...NO_EXTRAS, enabled: true, price: 25, durationMinutes: 5 },
  },
  {
    type: 'radar',
    name: copy.items.radar.name,
    icon: 'radar',
    description: copy.items.radar.description,
    targetsTeam: false,
    isAttack: false,
    settings: { durationMinutes: consoleCopy.itemSettings.lasts },
    defaults: { ...NO_EXTRAS, enabled: false, price: 15, durationMinutes: 5 },
  },
  {
    type: 'shield',
    name: copy.items.shield.name,
    icon: 'shield-outline',
    description: copy.items.shield.description,
    targetsTeam: false,
    isAttack: false,
    settings: {},
    defaults: { ...NO_EXTRAS, enabled: false, price: 30 },
  },
  {
    type: 'curse',
    name: copy.items.curse.name,
    icon: 'skull-outline',
    description: copy.items.curse.description,
    targetsTeam: true,
    isAttack: true,
    settings: { durationMinutes: consoleCopy.itemSettings.lasts },
    defaults: { ...NO_EXTRAS, enabled: false, price: 40, durationMinutes: 2 },
  },
  {
    type: 'robbery',
    name: copy.items.robbery.name,
    icon: 'sack-percent',
    description: copy.items.robbery.description,
    targetsTeam: true,
    isAttack: true,
    settings: {
      percent: consoleCopy.itemSettings.shareTaken,
      cap: consoleCopy.itemSettings.atMost,
      durationMinutes: consoleCopy.itemSettings.cooldown,
    },
    defaults: { ...NO_EXTRAS, enabled: false, price: 30, percent: 25, cap: 30, durationMinutes: 15 },
  },
  {
    type: 'donate',
    name: copy.items.donate.name,
    icon: 'hand-coin-outline',
    description: copy.items.donate.description,
    targetsTeam: true,
    isAttack: false,
    settings: {},
    defaults: { ...NO_EXTRAS, enabled: false, price: 0 },
  },
];

export const SHOP_ITEMS_BY_TYPE: Record<ShopItemType, ShopItemDefinition> = SHOP_ITEMS.reduce(
  (map, item) => ({ ...map, [item.type]: item }),
  {} as Record<ShopItemType, ShopItemDefinition>,
);

export type ShopConfig = Record<ShopItemType, ShopItemConfig>;

function positiveOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

// Games configured before an item existed fall back to its defaults. Given the
// time, prices are what they are then, flash sales included; without it, the
// prices the host set.
export function shopConfig(game: Partial<Game> | null | undefined, now?: number): ShopConfig {
  const stored = (game?.shop ?? {}) as Record<string, Partial<ShopItemConfig> | undefined>;
  return SHOP_ITEMS.reduce((config, item) => {
    const saved = stored[item.type];
    const basePrice = positiveOr(saved?.price, item.defaults.price);
    const sale = now !== undefined && saved?.sale && saved.sale.until > now ? saved.sale : null;
    config[item.type] = {
      enabled: typeof saved?.enabled === 'boolean' ? saved.enabled : item.defaults.enabled,
      price: sale ? salePrice(basePrice, sale.percent) : basePrice,
      basePrice,
      sale,
      durationMinutes: positiveOr(saved?.durationMinutes, item.defaults.durationMinutes),
      percent: Math.min(100, positiveOr(saved?.percent, item.defaults.percent)),
      cap: positiveOr(saved?.cap, item.defaults.cap),
    };
    return config;
  }, {} as ShopConfig);
}

function msLeft(until: unknown, now: number): number {
  return typeof until === 'number' && until > now ? until - now : 0;
}

// Timed items run for the whole team, not per device
export function compassMsLeft(state: Partial<TeamState> | null | undefined, now: number): number {
  return msLeft(state?.activeCompassUntil, now);
}

export function radarMsLeft(state: Partial<TeamState> | null | undefined, now: number): number {
  return msLeft(state?.activeRadarUntil, now);
}

export function curseMsLeft(state: Partial<TeamState> | null | undefined, now: number): number {
  return msLeft(state?.cursedUntil, now);
}

// What a robbery takes from a team with this many coins
export function robberyTake(targetCoins: number, config: ShopItemConfig): number {
  return Math.max(0, Math.min(config.cap, Math.floor((targetCoins * config.percent) / 100)));
}
