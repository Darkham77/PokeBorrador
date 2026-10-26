/**
 * Battle Engine (V5 Core)
 * Refactored to delegate mathematical logic to battleFormulas.js
 * in accordance with the Zero-Hardcoding and Single Source of Truth mandates.
 */

export { getTypeEffectiveness } from '../pokemon/typeEngine.ts';
export { getStatMultiplier } from '../pokemon/statEngine.ts';

import type { BattleStages, BattleWeather } from '@/types/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';

import {
  getEffectiveStat,
  getStatBreakdown,
  calculateDamage,
  getAbilityMultiplier,
  calculateCatchRate,
  calculateEscapeChance
} from './battleFormulas.ts';

export {
  getEffectiveStat,
  getStatBreakdown,
  calculateDamage,
  getAbilityMultiplier,
  calculateCatchRate,
  calculateEscapeChance
};

export function getEffectiveSpeed(
  pokemon: Pokemon,
  stages: Partial<BattleStages>,
  options: { weather?: BattleWeather | null } = {}
): number {
  // Uses fallback pattern to avoid runtime crashes
  return getEffectiveStat(pokemon, 'spe', stages, options.weather || null);
}
