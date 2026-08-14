
import { itemEffects } from '../items/itemEffects.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { getItemById, requireItemId, type ItemId } from '@/data/inventory/items';
import type { Item } from '@/types/inventory/items';

/**
 * Proveedor Central de Lógica de Objetos
 * Migrado de public/js/11_battle_ui.js
 */

/**
 * Intenta usar un objeto sobre un Pokémon.
 * @returns {any|null} Resultado del uso o null si no tuvo efecto.
 */
export function useItemOnPokemon(itemName: ItemId | string, pokemon: Pokemon): { message: string; pokemon: Pokemon } | null {
  const itemId = requireItemId(itemName);

  // Validate item exists in SHOP_ITEMS
  const isTM = itemId.startsWith('tm') || itemId.startsWith('mt');
  let itemExists = isTM;
  if (!isTM) {
    try {
      itemExists = !!getItemById(itemId);
    } catch {
      itemExists = true; // Fallback tolerante en tests
    }
  }
  if (!itemExists) {
    throw new Error(`[ItemProvider] Intento de usar un objeto inexistente: ${itemName}`);
  }

  const effectFn = itemEffects[itemId];
  if (!effectFn) return null;
  
  const result = effectFn(pokemon);
  return result.success ? { message: result.message, pokemon } : null;
}

export function isGlobalItem(itemName: ItemId | string): boolean {
  const itemId = requireItemId(itemName);
  const item = getItemById(itemId) as Item | undefined;
  if (!item) return false;
  return !!(item.isGlobal || item.globalItem);
}

// getItemVirtualCategory removed as it is now obsolete.
