/**
 * src/logic/pokemon/evolutionEngine.js
 * Centralized logic for traversing pokemon evolution chains.
 */
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS } from '@/data/evolutionData';

/**
 * Get species history from base form up to the given id.
 * Traverses the evolution table backwards.
 */
export function getSpeciesHistory(id) {
  const history = [id];
  let current = id;
  
  const findPreEvo = (speciesId) => {
    // 1. Level Evolutions
    for (const [from, data] of Object.entries(EVOLUTION_TABLE)) {
      if (data.to === speciesId) return from;
    }
    // 2. Stone Evolutions
    for (const [from, data] of Object.entries(STONE_EVOLUTIONS)) {
      if (data.to === speciesId) return from;
    }
    // 3. Trade Evolutions
    for (const [from, to] of Object.entries(TRADE_EVOLUTIONS)) {
      if (to === speciesId) return from;
    }
    return null;
  };

  let pre;
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
export function getFirstEvolution(id) {
  const history = getSpeciesHistory(id);
  return history[0];
}
