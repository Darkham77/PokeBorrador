
import { itemEffects } from '../items/itemEffects.ts';
import type { Pokemon } from '@/types/pokemon';
import { getItemById } from '@/data/items';
import type { Item } from '@/types/items';

/**
 * Proveedor Central de Lógica de Objetos
 * Migrado de public/js/11_battle_ui.js
 */

export const ITEM_EFFECTS = itemEffects;

/**
 * Intenta usar un objeto sobre un Pokémon.
 * @returns {any|null} Resultado del uso o null si no tuvo efecto.
 */
export function useItemOnPokemon(itemName: string, pokemon: Pokemon): { message: string; pokemon: Pokemon } | null {
  const itemId = itemName.toLowerCase();

  // Validate item exists in SHOP_ITEMS
  const isTM = itemId.startsWith('tm') || itemId.startsWith('mt');
  const itemExists = isTM || !!getItemById(itemId);
  if (!itemExists) {
    throw new Error(`[ItemProvider] Intento de usar un objeto inexistente: ${itemName}`);
  }

  const effectFn = ITEM_EFFECTS[itemId];
  if (!effectFn) return null;
  
  const result = effectFn(pokemon);
  return result.success ? { message: result.message, pokemon } : null;
}

export function isGlobalItem(itemName: string): boolean {
  const itemId = itemName.toLowerCase();
  const targetPokemonItems = ['nature_patch', 'ability_pill', 'vigor_candy', 'move_relearner'];
  if (targetPokemonItems.includes(itemId)) return false;

  const item = getItemById(itemId) as Item | undefined;
  if (!item) return false;
  return !!(
    item.isGlobal || 
    item.globalItem || 
    item.id === 'iv_scanner' ||
    (item.cat === 'tools' && (item.type === 'usable' || item.type === 'booster')) || 
    (item.cat === 'otros' && (
      item.type === 'booster' || 
      item.type === 'usable' || 
      item.id.includes('ticket') || 
      item.id.includes('incense') || 
      item.id.includes('fossil') || 
      item.id === 'old_amber' ||
      item.id === 'repel' ||
      item.id === 'super_repel' ||
      item.id === 'max_repel'
    ))
  );
}

// getItemVirtualCategory removed as it is now obsolete.

