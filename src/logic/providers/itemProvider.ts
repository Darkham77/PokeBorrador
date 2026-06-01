
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
    'Caña de pescar', 'Caña Buena', 'Supercaña',
    'Pico de excavación', 'Pico Bueno', 'Superpico',
    'Pincel de excavación', 'Pincel Bueno', 'Superpincel',
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

/**
 * Categorizes items into virtual categories: tools, minerals (including fossils, excluding evolutionary stones), or their base category.
 */
export function getItemVirtualCategory(item: { name: string; id: string; cat?: string }): string {
  const itemCat = item.cat || 'otros';
  // Guard: Only items in the 'especial' category can be categorized as tools or minerals
  if (itemCat !== 'especial') {
    return itemCat;
  }

  const name = item.name.toLowerCase();
  const id = item.id.toLowerCase();

  // 1. Check if it's a Tool (Herramientas)
  if (
    id.includes('pickaxe') || id.includes('brush') || id.includes('fishing_rod') ||
    name.includes('pico') || name.includes('pincel') || name.includes('caña')
  ) {
    return 'tools';
  }

  // 2. Check if it's a Purified Material (Materiales Purificados)
  if (
    name.includes('lingote') || name.includes('pulido') || name.includes('pulida') ||
    id.startsWith('polished_') ||
    ['copper', 'iron', 'silver', 'gold', 'tungsten', 'uranium'].includes(id)
  ) {
    return 'purified';
  }

  // 3. Check if it's a Mineral or Fossil (excluding evolutionary stones)
  const isEvolutionStone = (name.startsWith('piedra ') && !name.includes('preciosa') && !name.includes('mineral')) || 
                           (id.endsWith('_stone') && !id.includes('ore'));

  if (!isEvolutionStone) {
    if (
      id.includes('fossil') || id.includes('amber') || id.includes('nugget') ||
      id.includes('pearl') || id.includes('stardust') || id.includes('star_piece') ||
      id.endsWith('_ore') ||
      name.includes('fósil') || name.includes('mineral') || name.includes('pepita') ||
      name.includes('perla') || name.includes('polvo estelar') || name.includes('trozo estrella') ||
      name.includes('ámbar viejo')
    ) {
      return 'minerals';
    }
  }

  return itemCat;
}

