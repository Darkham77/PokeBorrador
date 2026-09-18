/**
 * src/components/modals/war-shop/warShopHelpers.ts
 *
 * Sorting and catalog helpers for the Faction War shop modal.
 */

import type { Item } from '@/types/inventory/items';
import type { ItemSortKey, SortOrder } from '@/types/system/game';

const RARITY_TIERS: Readonly<Record<string, number>> = {
  common: 0,
  rare: 1,
  epic: 2,
  legend: 3
} as const;

function compareWarShopByPrice(a: Item, b: Item): number {
  return (a.warPrice || 0) - (b.warPrice || 0);
}

function compareWarShopByRarity(a: Item, b: Item): number {
  const aTier = RARITY_TIERS[a.tier || 'common'] ?? 0;
  const bTier = RARITY_TIERS[b.tier || 'common'] ?? 0;
  return bTier - aTier;
}

function compareWarShopByDefault(
  a: Item,
  b: Item,
  coins: number,
  trainerLevel: number
): number {
  const aUnlocked = trainerLevel >= (a.unlockLv || 1);
  const bUnlocked = trainerLevel >= (b.unlockLv || 1);
  const aAffordable = coins >= (a.warPrice || 0);
  const bAffordable = coins >= (b.warPrice || 0);

  const aCanBuy = aUnlocked && aAffordable;
  const bCanBuy = bUnlocked && bAffordable;

  if (aCanBuy !== bCanBuy) return aCanBuy ? -1 : 1;
  if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1;
  if ((a.unlockLv || 1) !== (b.unlockLv || 1)) {
    return (a.unlockLv || 1) - (b.unlockLv || 1);
  }
  return (a.warPrice || 0) - (b.warPrice || 0);
}

export function sortWarShopItems(
  items: readonly Item[],
  sortKey: ItemSortKey,
  sortOrder: SortOrder,
  coins: number,
  trainerLevel: number
): Item[] {
  return [...items].sort((a, b) => {
    const comp = sortKey === 'price'
      ? compareWarShopByPrice(a, b)
      : sortKey === 'rarity'
        ? compareWarShopByRarity(a, b)
        : compareWarShopByDefault(a, b, coins, trainerLevel);
    return sortOrder === 'asc' ? comp : -comp;
  });
}
