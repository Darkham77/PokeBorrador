import { SHOP_ITEMS } from '@/data/items';
import { itemEffects } from '../items/itemEffects';

/**
 * Proveedor Central de Lógica de Objetos
 * Migrado de public/js/11_battle_ui.js
 */

export const ITEM_EFFECTS = itemEffects;

/**
 * Intenta usar un objeto sobre un Pokémon.
 * @returns {string|null} Resultado del uso o null si no tuvo efecto.
 */
export function useItemOnPokemon(itemName, pokemon) {
  const effectFn = ITEM_EFFECTS[itemName];
  if (!effectFn) return null;
  
  const result = effectFn(pokemon);
  return result.success ? result.message : null;
}

/**
 * Verifica si un objeto es de uso global (ej: Repelente).
 */
export function isGlobalItem(itemName) {
  const globalItems = [
    'Repelente', 'Superrepelente', 'Máximo Repelente',
    'Huevo Suerte Pequeño', 'Ticket Shiny', 'Moneda Amuleto',
    'Escáner de IVs', 'Moneda Amuleto'
  ];
  return globalItems.includes(itemName);
}
