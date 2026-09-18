import type { Pokemon, PokemonStorageLocation } from '@/types/pokemon/pokemon';
import type { Item } from '@/types/inventory/items';
import { getItemById, type ItemId } from '@/data/inventory/items';
import { isValidTarget } from '@/logic/items/itemEffects';
import { isEquippableHeldItem, type Item as InventoryListItem } from '@/stores/inventory/inventoryHelpers';

export interface InventoryTarget {
  context: PokemonStorageLocation;
  index: number;
}

const SELL_PRICE_MULTIPLIER = 0.5 as const;

export function filterBattleItemsByCategoryAndQuery(
  items: readonly InventoryListItem[],
  category: string,
  searchQuery: string,
): InventoryListItem[] {
  const query = searchQuery.trim().toLowerCase();
  return items.filter(item => {
    if (item.qty <= 0) return false;
    const resolvedCat = item.cat || 'otros';
    if (category !== 'todos' && category !== 'utilizables' && resolvedCat !== category) return false;
    if (query && !item.name.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function filterUtilizableBattleItems(
  items: readonly InventoryListItem[],
  target: InventoryTarget | null | undefined,
  team: readonly (Pokemon | null)[],
  box: readonly (Pokemon | null)[],
  isBattleActive: boolean,
): readonly InventoryListItem[] {
  if (!target) return items;
  const list = target.context === 'team' ? team : box;
  const pokemon = list[target.index];
  if (!pokemon) return items;

  return items.filter(item => {
    const dbItem = getItemById(item.id);
    if (isBattleActive && dbItem?.nonCombat) return false;
    return isValidTarget(item.id, pokemon);
  });
}

export function calculateEstimatedGain(selectedItems: ReadonlyMap<ItemId, number>): number {
  let estimatedGain = 0;
  for (const [id, qty] of selectedItems.entries()) {
    const itemInfo = getItemById(id);
    if (itemInfo) {
      estimatedGain += Math.floor((itemInfo.price || 0) * SELL_PRICE_MULTIPLIER) * qty;
    }
  }
  return estimatedGain;
}

export function resolveValidPokemonTargets(
  dbItem: Item,
  team: readonly (Pokemon | null)[],
): Pokemon[] {
  const teamList = team.filter((p): p is Pokemon => p !== null);
  const isHeld = isEquippableHeldItem(dbItem);
  return isHeld ? teamList : teamList.filter(p => isValidTarget(dbItem.id, p));
}
