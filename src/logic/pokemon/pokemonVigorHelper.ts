/**
 * src/logic/pokemon/pokemonVigorHelper.ts
 *
 * Pokémon vigor initialization and accessor helpers.
 */

import type { Pokemon, ObtainedMethod } from '@/types/pokemon/pokemon';
import { toID } from '@/logic/utils/strings.ts';
import { isLegendaryPokemonSpeciesId, isFossilPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';

/** Default maximum vigor value for standard non-legendary Pokémon. */
export const DEFAULT_MAX_VIGOR = 10;

function isLegendaryOrFossil(pokemonId: PokemonSpeciesId): boolean {
  if (!pokemonId) return false;
  const cleanId = toID(pokemonId);
  return isLegendaryPokemonSpeciesId(cleanId) || isFossilPokemonSpeciesId(cleanId);
}

/**
 * Canonical SSoT for initializing Pokemon vigor and maxVigor.
 * Non-legendary/non-fossil wild Pokémon roll 1d4+2 (3 to 6).
 * Player-bred eggs roll 1d3 (1 to 3) with starting vigor at half maxVigor.
 * Legendary and Fossil Pokémon have 0/0 vigor.
 */
export function initializePokemonVigor(
  p: Pokemon,
  obtainedMethod: ObtainedMethod = 'wild',
  isNpcEgg = false
): void {
  if (!p) return;
  if (isLegendaryOrFossil(p.id)) {
    p.maxVigor = 0;
    p.vigor = 0;
    return;
  }
  if (typeof p.maxVigor !== 'number' || isNaN(p.maxVigor) || p.maxVigor <= 0) {
    if (obtainedMethod === 'egg' && !isNpcEgg) {
      p.maxVigor = Math.floor(Math.random() * 3) + 1;
      p.vigor = Math.max(1, Math.floor(p.maxVigor / 2));
    } else {
      p.maxVigor = Math.floor(Math.random() * 4) + 3;
      p.vigor = p.maxVigor;
    }
  }
}

export function getVigor(p: Pokemon | null | undefined): number {
  if (!p) return 0;
  if (isLegendaryOrFossil(p.id)) return 0;
  return p.vigor !== undefined ? p.vigor : DEFAULT_MAX_VIGOR;
}

export function getMaxVigor(p: Pokemon | null | undefined): number {
  if (!p) return 0;
  if (isLegendaryOrFossil(p.id)) return 0;
  return p.maxVigor !== undefined ? p.maxVigor : DEFAULT_MAX_VIGOR;
}
