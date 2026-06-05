import { TYPE_CHART, type PokemonType } from '../../data/types.ts';

import type { Pokemon } from '@/types/pokemon';

/**
 * Get type effectiveness multiplier
 */
export function getTypeEffectiveness(moveType: string | undefined, defType: string | undefined, attacker: Pokemon | null = null): number {
  if (!moveType || !defType) return 1;
  
  // Scrappy (Intrépido) logic: Normal/Fighting can hit Ghost
  if (attacker?.ability === 'Intrépido' && defType.toLowerCase() === 'ghost' && (moveType.toLowerCase() === 'normal' || moveType.toLowerCase() === 'fighting')) {
    return 1;
  }

  const row = TYPE_CHART[moveType.toLowerCase() as PokemonType];
  if (!row) return 1;
  return row[defType.toLowerCase() as PokemonType] ?? 1;
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
