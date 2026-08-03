
/**
 * src/logic/pokemon/evolutionEngine.ts
 * Centralized logic for traversing pokemon evolution chains.
 */
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS } from '@/data/pokemon/evolutionData';

/**
 * Get species history from base form up to the given id.
 * Traverses the evolution table backwards.
 */
export function getSpeciesHistory(id: string): string[] {
  const history = [id];
  let current = id;
  
  const findPreEvo = (speciesId: string): string | null => {
    // 1. Level Evolutions
    for (const [from, data] of Object.entries(EVOLUTION_TABLE as Record<string, { to: string }>)) { // open-record
      if (data.to === speciesId) return from;
    }
    // 2. Stone Evolutions
    for (const [from, data] of Object.entries(STONE_EVOLUTIONS as Record<string, { to: string }>)) { // open-record
      if (data.to === speciesId) {
        // Limpiar sufijos como _alola o _hisui para obtener el ID base de origen si no es Eevee
        if (from.startsWith('eevee_')) return 'eevee';
        const baseId = from.split('_')[0];
        return baseId || from;
      }
    }
    // 3. Trade Evolutions
    for (const [from, to] of Object.entries(TRADE_EVOLUTIONS)) {
      if (to === speciesId) return from;
    }
    return null;
  };

  let pre: string | null;
  while ((pre = findPreEvo(current))) {
    if (history.includes(pre)) break; // Prevent loops
    history.unshift(pre);
    current = pre;
  }
  return history;
}

/**
 * Find the most basic form of a pokemon.
 */
export function getFirstEvolution(id: string): string {
  const history = getSpeciesHistory(id);
  return history[0] || id;
}
