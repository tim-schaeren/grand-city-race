import { doc, updateDoc } from 'firebase/firestore';
import { copy, formatActivity, paths, type ActivityEntry, type FlashSale, type ShopItemType } from '@grandcityrace/shared';
import { db } from '../firebase';
import { logActivity } from '../utils/activity';
import { sendPushToPlayers } from '../utils/push';

export type ItemFields = { enabled?: boolean; price?: number; durationMinutes?: number; percent?: number; cap?: number };

// An item's settings, field by field, so a flash sale running on it stays.
// While the race runs a new price is news, and goes in the feed.
export async function saveItem(gameId: string, type: ShopItemType, fields: ItemFields, { racing, priceChanged }: { racing: boolean; priceChanged: boolean }) {
  await updateDoc(doc(db, paths.game(gameId)), Object.fromEntries(Object.entries(fields).map(([k, v]) => [`shop.${type}.${k}`, v])));
  if (racing && priceChanged && fields.price !== undefined) {
    await logActivity(gameId, { type: 'price_changed', itemType: type, amount: fields.price });
  }
}

// A flash sale over the items picked: each carries it until it ends, and it's
// announced once, in the feed and on every phone
export async function startSale(gameId: string, types: ShopItemType[], percent: number, minutes: number) {
  const sale: FlashSale = { percent, until: Date.now() + minutes * 60_000 };
  await updateDoc(doc(db, paths.game(gameId)), Object.fromEntries(types.map(type => [`shop.${type}.sale`, sale])));
  const entry = { type: 'flash_sale', itemTypes: types, amount: percent, durationMinutes: minutes } as const;
  await logActivity(gameId, entry);
  const { text } = formatActivity({ ...entry, id: '', at: Date.now(), visibility: 'public', teamId: null, teamName: null } as ActivityEntry);
  await sendPushToPlayers(gameId, copy.hostPush.flashSale, text);
}

export async function endSale(gameId: string, types: ShopItemType[]) {
  await updateDoc(doc(db, paths.game(gameId)), Object.fromEntries(types.map(type => [`shop.${type}.sale`, null])));
}
