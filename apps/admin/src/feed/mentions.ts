import { consoleCopy as cc, copy, SHOP_ITEMS, type ActivityEntry, type Quest, type ShopItemType } from '@grandcityrace/shared';

// The item an entry is about, and the word in its sentence that stands for it
export function entryItems(entry: ActivityEntry): { type: ShopItemType; word: string }[] {
  const words = cc.feedLinks;
  switch (entry.type) {
    case 'item_bought': {
      // Older entries name the item only by its words
      const type = (entry.itemType
        ?? SHOP_ITEMS.find(item => copy.items[item.type].bought === entry.itemName)?.type) as ShopItemType | undefined;
      return type && copy.items[type] ? [{ type, word: copy.items[type].bought }] : [];
    }
    case 'flash_sale':
      return (entry.itemTypes ?? []).flatMap(t => {
        const type = t as ShopItemType;
        return copy.items[type] ? [{ type, word: copy.items[type].name }] : [];
      });
    case 'price_changed': {
      const type = entry.itemType as ShopItemType | undefined;
      return type && copy.items[type] ? [{ type, word: copy.items[type].name }] : [];
    }
    case 'team_cursed': return [{ type: 'curse', word: words.cursed }];
    case 'team_robbed': return [{ type: 'robbery', word: words.robbed }];
    case 'coins_donated': return [{ type: 'donate', word: words.gave }];
    case 'attack_blocked': {
      const robbery = entry.itemType === 'robbery';
      return [
        { type: 'shield', word: words.shield },
        { type: robbery ? 'robbery' : 'curse', word: robbery ? words.robbery : words.curse },
      ];
    }
    default: return [];
  }
}

// The quest an entry is about. Older entries name it only by title or number.
export function entryQuest(entry: ActivityEntry, quests: Quest[], order: string[]): { id: string; text: string } | null {
  const id = entry.questId
    ?? (entry.questTitle ? quests.find(q => q.title === entry.questTitle)?.id : undefined)
    ?? (entry.questNumber ? order[entry.questNumber - 1] : undefined);
  if (!id) return null;
  const text = entry.questTitle ? copy.feed.quoted(entry.questTitle) : cc.feedLinks.questN({ n: entry.questNumber ?? 0 });
  return { id, text };
}
