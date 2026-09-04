
import { ITEMS_BY_ID, isItemId, type ItemId } from '@/data/inventory/items';
import { getAssetUrl, ASSET_TYPES } from '../services/assetService.ts';
import type { Inventory } from '@/types/inventory/items';

/**
 * Inventory logic engine for non-battle interactions.
 */

/**
 * Calculates the sell price of an item (usually 50% of buying price).
 */
export function getSellPrice(itemId: ItemId): number {
  if (!isItemId(itemId)) return 0;
  const item = ITEMS_BY_ID[itemId];
  if (!item) return 0;
  if (item.showInNormalShop === false && (!item.price || item.price <= 0)) return 0;
  
  return Math.floor((item.price || 0) * 0.5);
}

/**
 * Returns the PokéAPI sprite URL for a given item.
 * @param {string} itemId - The internal ID of the item (e.g., 'pokeball').
 */
export function getItemSpriteUrl(itemId: ItemId): string {
  return getAssetUrl(ASSET_TYPES.ITEM, itemId);
}

/**
 * Filters inventory by category.
 * @param {Object} inventory - { itemId: quantity }
 * @param {string} category - 'pokeballs', 'pociones', 'stones', etc.
 * @returns {Array} List of [itemId, quantity]
 */
export function filterInventoryByCategory(inventory: Inventory | Record<string, number>, category: string): [string, number][] {
  return Object.entries(inventory)
  .filter((entry): entry is [string, number] => entry[1] !== undefined)
  .filter(([id, qty]) => {
    if (qty <= 0 || !isItemId(id)) return false;
    const item = ITEMS_BY_ID[id];
    if (!item) return false;
    if (category === 'all' || category === 'todos') return true;
    
    // Modern category mapping
    if (category === 'potion' || category === 'potions') return item.cat === 'potions';
    if (category === 'ball' || category === 'pokeballs') return item.cat === 'pokeballs';
    if (category === 'stones') return item.cat === 'stones';
    if (category === 'etc' || category === 'especial') return !['potions', 'pokeballs', 'stones'].includes(item.cat || '');
    
    return item.cat === category;
  });
}
