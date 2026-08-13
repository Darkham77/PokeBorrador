import { useGameStore } from '@/stores/game.ts';
import { getItemById, requireItemId } from '@/data/inventory/items';
import { itemEffects as ITEM_EFFECTS, getDynamicItemEffect } from '@/logic/items/itemEffects';
import { isGlobalItem } from '@/logic/providers/itemProvider.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { Inventory, Item as ItemData, ItemCategory, BagMainTab } from '@/types/inventory/items';

import type { ItemId } from '@/data/inventory/items';

export function findInventoryKey(gameStore: ReturnType<typeof useGameStore>, id: ItemId | string): ItemId | string | null {
  if (!id) return null;
  const inv = gameStore.state.inventory || {};
  if (inv[id] !== undefined) return id;
  return null;
}

export function isItemUsableOn(itemId: string, pokemon: Pokemon) {
  if (!pokemon) return false;
  
  if (isGlobalItem(itemId)) return false;

  let item;
  try {
    item = getItemById(itemId);
  } catch {
    return false;
  }

  if (pokemon.inDaycare) {
    if (!item) return false;
    const isVigorRestorer = item.id === 'vigorrestorer' || item.id === 'vigorcandy';
    const isBreedingHeld = item.cat === 'breeding_held';
    return !!(isVigorRestorer || isBreedingHeld);
  }

  if (item && isEquippableHeldItem(item)) return true;

  const p = JSON.parse(JSON.stringify(pokemon)) as Pokemon;

  const effectFn = ITEM_EFFECTS[itemId];
  if (effectFn) {
    const res = effectFn(p);
    return res && res.success;
  }

  const dynamicRes = getDynamicItemEffect(itemId, p);
  return dynamicRes && dynamicRes.success;
}

export function isEquippableHeldItem(item: Pick<ItemData, 'cat' | 'id'>): boolean {
  return item.cat === 'combat_held'
    || (item.cat === 'breeding_held' && item.id !== 'vigorrestorer' && !item.id.includes('berry'));
}

export function consumeItem(gameStore: ReturnType<typeof useGameStore>, itemId: ItemId | string) {
  const inv = gameStore.state.inventory;
  if (!inv) return;
  const actualKey = findInventoryKey(gameStore, itemId);
  if (actualKey && inv[actualKey]) {
    inv[actualKey]--;
    if (inv[actualKey] <= 0) {
      delete inv[actualKey];
    }
    gameStore.state.inventory = { ...inv };
  }
}
export interface ItemTierQuery {
  cat?: ItemCategory;
  sprite?: string;
  craftingTier?: number;
}

export function getItemTier(item: ItemTierQuery): number {
  if (item.craftingTier !== undefined) return item.craftingTier;
  const cat = item.cat || 'otros';
  if (cat === 'raw_material' || item.sprite?.includes('crafting/tier0/')) return 0;
  if (cat === 'refined_material' || item.sprite?.includes('crafting/tier1/')) return 1;
  if (cat === 'component' || item.sprite?.includes('crafting/tier2/')) return 2;
  return 3;
}

export function isItemProduct(item: ItemData): boolean {
  if (getItemTier(item) === 3) return true;

  const cat = item.cat;
  const id = item.id;

  if (id) {
    if (id.endsWith('fossil') || id.includes('fossilized') || id === 'oldamber') {
      return true;
    }
  }

  if (
    cat === 'potions' ||
    cat === 'pokeballs' ||
    cat === 'stones' ||
    cat === 'combat_held' ||
    cat === 'breeding_held' ||
    cat === 'tools' ||
    cat === 'tms'
  ) {
    return true;
  }

  if (id && ITEM_EFFECTS[id]) return true;
  if (id?.startsWith('tm')) return true;

  return false;
}

export function getAdjustedProductCategory(item: Pick<ItemData, 'cat' | 'id' | 'name'>): ItemCategory {
  const cat = item.cat;
  const id = item.id;

  if (id) {
    if (id.endsWith('fossil') || id.includes('fossilized') || id === 'oldamber') {
      return 'breeding_held';
    }
  }

  if (!['raw_material', 'refined_material', 'component'].includes(cat)) {
    return cat;
  }

  const nameLower = item.name.toLowerCase(); // text-ok

  if (id.includes('stone') || nameLower.includes('piedra')) {
    return 'stones';
  }

  if (id.includes('root') || id.includes('revive') || nameLower.includes('pocion') || nameLower.includes('revivir')) {
    return 'potions';
  }

  return 'otros';
}

export interface Item extends ItemData {
  qty: number;
}

export function mapInventoryToItems(
  inventory: Inventory,
  isBattleActive: boolean,
  mainTab: BagMainTab
 ): Item[] {
   let items: Item[] = Object.entries(inventory)
     .filter((entry): entry is [string, number] => entry[1] !== undefined && entry[1] > 0)
     .map(([id, qty]) => {
        const item = getItemById(requireItemId(id));
        const builtItem: Item = { ...item, qty, name: item.name };
        return builtItem;
     })

   if (isBattleActive) {
     items = items.filter(item => {
       const dbItem = getItemById(item.id)
       return !(dbItem && dbItem.nonCombat)
     })
   }

  // Filter by main tab
  if (mainTab === 'materiales') {
    items = items
      .filter(item => getItemTier(item) < 3)
      .map(item => {
        const tier = getItemTier(item)
        let cat: ItemCategory = item.cat
        if (tier === 0) cat = 'raw_material'
        else if (tier === 1) cat = 'refined_material'
        else if (tier === 2) cat = 'component'
        return { ...item, cat }
      })
  } else {
    // Tab is productos
    items = items
      .filter(item => getItemTier(item) === 3 || isItemProduct(item))
      .map(item => ({
        ...item,
        cat: getAdjustedProductCategory(item)
      }))
  }

  return items
}
