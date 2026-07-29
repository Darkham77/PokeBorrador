
import { SHOP_ITEMS } from '@/data/inventory/items';
import { getAssetUrl, ASSET_TYPES } from '../services/assetService.ts';
import type { Inventory } from '@/types/inventory/items';

/**
 * Inventory logic engine for non-battle interactions.
 */

/**
 * Calculates the sell price of an item (usually 50% of buying price).
 */
export function getSellPrice(itemName: string): number {
  const item = (SHOP_ITEMS as unknown as { name: string, price: number, showInNormalShop?: boolean }[]).find(i => i.name === itemName);
  if (!item) return 0;
  if (item.showInNormalShop === false && (!item.price || item.price <= 0)) return 0;
  
  return Math.floor((item.price || 0) * 0.5);
}

/**
 * Returns the PokéAPI sprite URL for a given item.
 * @param {string} itemId - The internal ID of the item (e.g., 'pokeball').
 */
export function getItemSpriteUrl(itemId: string): string {
  return getAssetUrl(ASSET_TYPES.ITEM, itemId);
}

/**
 * Filters inventory by category.
 * @param {Object} inventory - { itemName: quantity }
 * @param {string} category - 'pokeballs', 'pociones', 'stones', etc.
 * @returns {Array} List of [itemName, quantity]
 */
export function filterInventoryByCategory(inventory: Inventory, category: string): [string, number][] {
  return Object.entries(inventory)
  .filter((entry): entry is [string, number] => entry[1] !== undefined)
  .filter(([name, qty]) => {
    if (qty <= 0) return false;
    const item = (SHOP_ITEMS as { name: string, cat?: string }[]).find(i => i.name === name);
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
