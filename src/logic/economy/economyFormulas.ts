
/**
 * ECONOMY FORMULAS
 * Centralized logic for shop costs, healing prices, and penalties.
 */
import type { Pokemon } from '@/types/pokemon';
import { getPokemonTier } from '../pokemon/tierEngine.ts';

/**
 * Multipliers based on Pokemon Tier (IV sum).
 * High-tier weapons of war cost more to maintain.
 */
export const HEAL_COST_TIER_MULTIPLIERS: Record<string, number> = {
  'S+': 10,
  'S': 6,
  'A': 4,
  'B': 2.5,
  'C': 1.5,
  'D': 1.2,
  'F': 1
};

/**
 * Calculates the individual healing cost for a single Pokemon.
 */
export function calculateIndividualHealCost(pokemon: Pokemon, trainerLevel: number, playerClass: string): number {
  if (playerClass !== 'rocket') return 0;
  
  const tierInfo = getPokemonTier(pokemon);
  const basePrice = 20 + (trainerLevel * 3);
  const multiplier = HEAL_COST_TIER_MULTIPLIERS[tierInfo.tier] || 1;
  
  return Math.floor(basePrice * multiplier);
}

/**
 * Checks if a pokemon requires healing (HP, Status, or PP).
 */
export function pokemonNeedsHealing(p: Pokemon): boolean {
  const isDamaged = p.hp < p.maxHp;
  const hasStatus = !!p.status;
  const needsPP = p.moves?.some(m => m && m.pp < (m.maxPP || 20)) || false;
  
  return isDamaged || hasStatus || needsPP;
}

/**
 * Calculates the total healing cost for a team.
 */
export function calculateTotalHealCost(team: (Pokemon | null)[], trainerLevel: number, playerClass: string): number {
  if (playerClass !== 'rocket') return 0;
  
  return team.reduce((total, p) => {
    if (p && pokemonNeedsHealing(p)) {
      return total + calculateIndividualHealCost(p, trainerLevel, playerClass);
    }
    return total;
  }, 0);
}

/**
 * Calculates the Pokemon Center cooldown in seconds based on trainer level.
 */
export function calculatePokemonCenterCooldown(trainerLevel: number): number {
  if (trainerLevel <= 1) return 0;
  // Potencia: (nivel - 1)^1.5 * 5.5 segundos
  return Math.floor(Math.pow(trainerLevel - 1, 1.5) * 5.5);
}

