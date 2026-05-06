
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

export {
  getEffectiveStat, 
  getStatBreakdown, 
  calculateDamage, 
  getAbilityMultiplier, 
  calculateCatchRate,
  calculateEscapeChance
};

export function getEffectiveSpeed(pokemon: any, stages: any, options: any = {}) {
  // Uses fallback pattern to avoid runtime crashes
  return getEffectiveStat(pokemon, 'spe', stages, options.weather);
}
