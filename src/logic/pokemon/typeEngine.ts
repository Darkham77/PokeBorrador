import { TYPE_CHART, type PokemonType } from '../../data/battle/types.ts';

import type { Pokemon } from '@/types/pokemon/pokemon';

/**
 * Get type effectiveness multiplier
 */
export function getTypeEffectiveness(moveType: PokemonType | string | undefined, defType: PokemonType | string | undefined, attacker: Pokemon | null = null): number {
  if (!moveType || !defType) return 1;
  
  const mType = moveType as PokemonType;
  const dType = defType as PokemonType;

  // Scrappy logic: Normal/Fighting can hit Ghost
  if (attacker?.ability === 'scrappy' && dType === 'ghost' && (mType === 'normal' || mType === 'fighting')) {
    return 1;
  }

  const row = TYPE_CHART[mType];
  if (!row) return 1;
  return row[dType] ?? 1;
}

/**
 * Get combined effectiveness for dual types
 */
export function getCombinedEffectiveness(moveType: string, defender: Partial<Pokemon>, attacker: Pokemon | null = null): number {
  let eff = getTypeEffectiveness(moveType, defender.type, attacker);
  if (defender.type2) {
    eff *= getTypeEffectiveness(moveType, defender.type2, attacker);
  }
  return eff;
}
