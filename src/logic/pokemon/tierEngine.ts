
/**
 * Tier system for Pokémon based on the sum of all 6 IVs (max = 186).
 * Scales: S+ (186), S (168–185), A (140–167), B (112–139), C (84–111), D (56–83), F (0–55).
 * 
 * Part of the specialized Pokemon Logic context.
 */

import type { Pokemon } from '@/types/pokemon';

export interface TierConfig {
  min: number;
  max: number;
  color: string;
  rgb: string;
  bg: string;
  label: string;
}

export const BOX_TIER_CONFIG: Record<string, TierConfig> = {
  'S+': { min: 186, max: 186, color: '#ffd700', rgb: '255, 215, 0', bg: 'rgba(255, 215, 0, 0.18)', label: 'S+' },
  'S': { min: 168, max: 185, color: '#ffa500', rgb: '255, 165, 0', bg: 'rgba(255, 165, 0, 0.14)', label: 'S' },
  'A': { min: 140, max: 167, color: '#bf5af2', rgb: '191, 90, 242', bg: 'rgba(191, 90, 242, 0.14)', label: 'A' },
  'B': { min: 112, max: 139, color: '#0a84ff', rgb: '10, 132, 255', bg: 'rgba(10, 132, 255, 0.14)', label: 'B' },
  'C': { min: 84, max: 111, color: '#32d74b', rgb: '50, 215, 75', bg: 'rgba(50, 215, 75, 0.14)', label: 'C' },
  'D': { min: 56, max: 83, color: '#ff9632', rgb: '255, 150, 50', bg: 'rgba(255, 150, 50, 0.14)', label: 'D' },
  'F': { min: 0, max: 55, color: '#ff3b3b', rgb: '255, 59, 59', bg: 'rgba(255, 59, 59, 0.14)', label: 'F' },
};

/**
 * Calculates the total IVs and returns the corresponding tier information.
 * @param {Object} pokemon - The pokemon object containing IVs.
 * @returns {Object} Tier information includes { tier, total, color, bg, label }.
 */
export function getPokemonTier(pokemon: Partial<Pokemon> | null) {
  if (!pokemon) return { tier: 'F', total: 0, ...BOX_TIER_CONFIG['F'] };
  
  const ivs = pokemon.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  const total = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + 
                (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);

  for (const [tier, cfg] of Object.entries(BOX_TIER_CONFIG)) {
    if (total >= cfg.min && total <= cfg.max) {
      return { tier, total, ...cfg };
    }
  }

  return { tier: 'F', total, ...(BOX_TIER_CONFIG['F'] || { min: 0, max: 55, color: '#FF3B3B', bg: 'Rgba(255,59,59,0.14)', label: 'F' }) };
}

/**
 * Checks if a pokemon has any perfect IV (31).
 * @param {Object} pokemon
 * @returns {boolean}
 */
export function hasPerfectIV(pokemon: Partial<Pokemon> | null): boolean {
  if (!pokemon || !pokemon.ivs) return false;
  return Object.values(pokemon.ivs).some(v => v === 31);
}
