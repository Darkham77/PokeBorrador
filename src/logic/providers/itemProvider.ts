
import { itemEffects } from '../items/itemEffects.ts';
import type { Pokemon } from '@/types/pokemon';

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
  const effectFn = ITEM_EFFECTS[itemName];
  if (!effectFn) return null;
  
  const result = effectFn(pokemon);
  return result.success ? { message: result.message, pokemon } : null;
}

/**
 * Verifica si un objeto es de uso global (ej: Repelente).
 */
export function isGlobalItem(itemName: string): boolean {
  const globalItems = [
    'Repelente', 'Superrepelente', 'Máximo Repelente',
    'Huevo Suerte Pequeño', 'Ticket Shiny', 'Moneda Amuleto',
    'Escáner de IVs', 'Ticket Safari', 'Ticket Cueva Celeste',
    'Ticket Articuno', 'Ticket Mewtwo', 'Incienso Fuego',
    'Incienso Agua', 'Incienso Planta', 'Incienso Normal',
    'Incienso Fantasma', 'Incienso Psíquico',
    'Fósil Hélix', 'Fósil Domo', 'Ámbar Viejo'
  ];
  return globalItems.includes(itemName);
}
