
/**
 * Battle Engine (V5 Core)
 * Refactored to delegate mathematical logic to battleFormulas.js
 * in accordance with the Zero-Hardcoding and Single Source of Truth mandates.
 */

export { getTypeEffectiveness, getCombinedEffectiveness } from '../pokemon/typeEngine';
export { getStatMultiplier } from '../pokemon/statEngine';

import { 
  getEffectiveStat, 
  getStatBreakdown, 
  calculateDamage, 
  getAbilityMultiplier, 
  calculateCatchRate,
  calculateEscapeChance
} from './battleFormulas';

import type { Pokemon } from '@/types/pokemon';
import type { BattleStages, BattleWeather } from '@/types/battle';

export {
  getEffectiveStat, 
  getStatBreakdown, 
  calculateDamage, 
  getAbilityMultiplier, 
  calculateCatchRate,
  calculateEscapeChance
};

export function getEffectiveSpeed(pokemon: Pokemon, stages: Partial<BattleStages>, options: { weather?: BattleWeather | null } = {}) {
  // Uses fallback pattern to avoid runtime crashes
  return getEffectiveStat(pokemon, 'spe', stages, options.weather || null);
}
