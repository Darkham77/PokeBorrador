
import { SHOP_ITEMS } from '@/data/items';
import { getAssetUrl, ASSET_TYPES } from '../services/assetService.ts';
import type { Inventory } from '@/types/items';

/**
 * Inventory logic engine for non-battle interactions.
 */

/**
 * Calculates the sell price of an item (usually 50% of buying price).
 */
export function getSellPrice(itemName: string): number {
  const item = (SHOP_ITEMS as unknown as { name: string, price: number, market?: boolean }[]).find(i => i.name === itemName);
  if (!item) return 0;
  if (item.market === false && (!item.price || item.price <= 0)) return 0;
  
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
  return Object.entries(inventory).filter(([name, qty]) => {
    if (qty <= 0) return false;
    const item = (SHOP_ITEMS as { name: string, cat?: string }[]).find(i => i.name === name);
    if (!item) return false;
    if (category === 'all' || category === 'todos') return true;
    
    // Modern category mapping
    if (category === 'potion' || category === 'pociones') return item.cat === 'pociones';
    if (category === 'ball' || category === 'pokeballs') return item.cat === 'pokeballs';
    if (category === 'stones') return item.cat === 'stones';
    if (category === 'etc' || category === 'especial') return !['pociones', 'pokeballs', 'stones'].includes(item.cat || '');
    
    return item.cat === category;
  });
}
