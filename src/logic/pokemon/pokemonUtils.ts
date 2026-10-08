import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
export { getPokemonTier } from '@/logic/pokemon/tierEngine';
import type { Pokemon, PokemonIVs } from '@/types/pokemon/pokemon';
import { calculateTotalBaseStats, calculateTotalIVs, calculateRocketSellPriceRaw } from '@/logic/pokemon/statsMath';
import { calculateEvBonusIvs } from '@/logic/pokemon/evMath';

export {
  DEFAULT_MAX_VIGOR,
  initializePokemonVigor,
  getVigor,
  getMaxVigor
} from './pokemonVigorHelper.ts';

export { getMovesAtLevel } from './pokemonMovesetHelper.ts';
export { getMoveDescription } from './pokemonMoveDescription.ts';

/** Maximum IV roll bound exclusive (0 to 31 inclusive). */
export const MAX_IV_VALUE_EXCLUSIVE = 32;

/**
 * Calculates the total power of a pokemon (BST + total IVs + EV-equivalent IV bonus).
 */
export function calculateTotalPower(p: Pokemon): number {
  if (!p) return 0;
  const species = pokemonDataProvider.getPokemonData(p.id);
  const bst = species ? calculateTotalBaseStats(species) : 0;
  const totalIvs = calculateTotalIVs(p.ivs);
  const totalEvIvs = calculateEvBonusIvs(p.evs);
  return bst + totalIvs + totalEvIvs;
}

/**
 * Generates random IVs (0 to 31) for all stats.
 */
export function generateRandomIVs(): PokemonIVs {
  return {
    hp: Math.floor(Math.random() * MAX_IV_VALUE_EXCLUSIVE),
    atk: Math.floor(Math.random() * MAX_IV_VALUE_EXCLUSIVE),
    def: Math.floor(Math.random() * MAX_IV_VALUE_EXCLUSIVE),
    spa: Math.floor(Math.random() * MAX_IV_VALUE_EXCLUSIVE),
    spd: Math.floor(Math.random() * MAX_IV_VALUE_EXCLUSIVE),
    spe: Math.floor(Math.random() * MAX_IV_VALUE_EXCLUSIVE)
  };
}

/** Dominant level multiplier for Pokémon strength scoring (level 50 min beats level 49 max). */
const SCORE_LEVEL_MULTIPLIER = 10000;

/**
 * Calculates a composite strength score for a Pokémon (Level * 10000 + Total Power).
 * Guarantees strict level dominance while breaking ties by BST, IVs, and EV training.
 */
export function calculatePokemonStrengthScore(p: Pokemon): number {
  if (!p) return 0;
  return (p.level * SCORE_LEVEL_MULTIPLIER) + calculateTotalPower(p);
}

/**
 * Calculates the price for selling a pokemon to the Black Market (Team Rocket).
 */
export function calculateRocketSellPrice(p: Pokemon): number {
  if (!p) return 0;
  const totalIvs = calculateTotalIVs(p.ivs);
  return calculateRocketSellPriceRaw(p.level, totalIvs);
}

/**
 * Determina si un Pokémon está en un estado forzado/bloqueado de ataque (lockedmove, twoturnmove, thrash).
 */
export function isPokemonLocked(p: Pokemon | null | undefined): boolean {
  if (!p) return false;
  const isLockedMove = !!(p.volatileCounters?.['lockedmove'] && p.volatileCounters['lockedmove'] > 0);
  const isTwoTurnActive = !!(p.volatileCounters?.['twoturnmove'] && p.volatileCounters['twoturnmove'] > 0);
  const isMustRecharge = !!(p.volatileCounters?.['mustrecharge'] && p.volatileCounters['mustrecharge'] > 0);
  const isThrashLocked = !!(p.thrashTurns && p.thrashTurns > 0);
  const isBideActive = !!(p.volatileCounters?.['bide'] && p.volatileCounters['bide'] > 0);
  const isTrapped = !!p.trapped;
  return isLockedMove || isTwoTurnActive || isMustRecharge || isThrashLocked || isBideActive || isTrapped;
}
