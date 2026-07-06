import { useGameStore } from '@/stores/game.ts';
import { getItemById } from '@/data/inventory/items';
import { itemEffects as ITEM_EFFECTS, getDynamicItemEffect } from '@/logic/items/itemEffects';
import { isGlobalItem } from '@/logic/providers/itemProvider.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';

export function findInventoryKey(gameStore: ReturnType<typeof useGameStore>, id: string): string | null {
  if (!id) return null;
  const normalizedId = String(id).toLowerCase().trim();

  const inv = gameStore.state.inventory || {};
  if (inv[normalizedId] !== undefined) return normalizedId;
  if (inv[id] !== undefined) return id;

  const keys = Object.keys(inv);
  const matchCaseInsensitive = keys.find(k => k.toLowerCase() === normalizedId || k.toLowerCase() === id.toLowerCase());
  if (matchCaseInsensitive) return matchCaseInsensitive;

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
    const isBreedingHeld = item.cat === 'breeding' || item.cat === 'breeding_held';
    return !!(isVigorRestorer || isBreedingHeld);
  }

  if (item && (
    item.cat === 'held' || 
    item.type === 'held' || 
    ((item.cat === 'breeding' || item.cat === 'breeding_held') && item.id !== 'vigorrestorer' && !item.id.includes('berry'))
  )) return true;

  const p = JSON.parse(JSON.stringify(pokemon)) as Pokemon;

  const effectFn = ITEM_EFFECTS[itemId];
  if (effectFn) {
    const res = effectFn(p);
    return res && res.success;
  }

  const dynamicRes = getDynamicItemEffect(itemId, p);
  return dynamicRes && dynamicRes.success;
}

export function consumeItem(gameStore: ReturnType<typeof useGameStore>, itemName: string) {
  const inv = gameStore.state.inventory;
  if (!inv) return;
  const itemId = itemName.toLowerCase();
  const actualKey = findInventoryKey(gameStore, itemId);
  if (actualKey && inv[actualKey]) {
    inv[actualKey]--;
    if (inv[actualKey] <= 0) {
      delete inv[actualKey];
    }
    gameStore.state.inventory = { ...inv };
  }
}

export function getItemTier(item: { cat?: string; sprite?: string; craftingTier?: number }): number {
  if (item.craftingTier !== undefined) return item.craftingTier;
  const cat = item.cat || 'otros';
  if (cat === 'raw_material' || item.sprite?.includes('crafting/tier0/')) return 0;
  if (cat === 'refined_material' || item.sprite?.includes('crafting/tier1/')) return 1;
  if (cat === 'component' || item.sprite?.includes('crafting/tier2/')) return 2;
  return 3;
}

export function isItemProduct(item: { name: string; cat?: string; type?: string; id?: string; sprite?: string }): boolean {
  if (getItemTier(item) === 3) return true;

  const cat = item.cat;
  const type = item.type;
  const id = item.id;

  if (
    cat === 'potions' ||
    cat === 'pokeballs' ||
    cat === 'stones' ||
    cat === 'combat_held' ||
    cat === 'breeding_held' ||
    type === 'stone' ||
    type === 'held' ||
    type === 'usable' ||
    type === 'booster' ||
    cat === 'tools' ||
    cat === 'tms'
  ) {
    return true;
  }

  if (id && ITEM_EFFECTS[id]) return true;
  if (id?.toLowerCase().startsWith('tm')) return true;

  return false;
}

export function getAdjustedProductCategory(item: { name: string; cat?: string; id?: string }): string {
  const cat = item.cat || 'otros';

  if (!['raw_material', 'refined_material', 'component'].includes(cat)) {
    return cat;
  }

  const id = item.id || '';
  if (id.includes('stone') || item.name.toLowerCase().includes('piedra')) {
    return 'stones';
  }

  if (id.includes('root') || id.includes('revive') || item.name.toLowerCase().includes('pocion') || item.name.toLowerCase().includes('revivir')) {
    return 'potions';
  }

  return 'otros';
}

export interface Item {
  name: string;
  qty: number;
  id: string;
  cat?: string;
  type?: string;
  sprite?: string;
  desc?: string;
  price?: number;
  craftingTier?: number;
  tier?: 'common' | 'rare' | 'epic' | 'legend';
  nonCombat?: boolean;
}

export function mapInventoryToItems(
  inventory: Record<string, number>,
  isBattleActive: boolean,
  mainTab: 'productos' | 'materiales'
 ): Item[] {
   let items: Item[] = Object.entries(inventory)
     .map(([id, qty]) => {
       if (id === 'bicycle') {
         return { id: 'bicycle', name: 'Bicicleta', sprite: 'tools/bicycle', desc: 'Bicicleta para moverte rápido.', cat: 'tools', qty } as Item;
       }
       const item = getItemById(id);
       return { ...item, qty, name: item.name } as Item;
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
        let cat = item.cat
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

