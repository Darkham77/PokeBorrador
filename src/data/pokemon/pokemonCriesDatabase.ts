import type { AssetUri } from '@francogp/auditor';

import { isPokemonSpeciesId, type PokemonSpeciesId } from './pokedex.ts';
/**
 * src/data/pokemon/pokemonCriesDatabase.ts
 *
 * Lightweight domain wrapper for Pokemon cries mapping.
 * Avoids pulling the heavy pokemonFeetDatabase (1.2 MB) on app boot.
 */
import criesJson from './pokemonCriesDatabase.json' with { type: 'json' };

// fallow-ignore-next-line unused-export
export const POKEMON_CRIES_DATABASE: Partial<Record<PokemonSpeciesId, AssetUri>> = criesJson;

// fallow-ignore-next-line unused-export
export function isPokemonCryId(value: string): boolean {
  return Object.hasOwn(POKEMON_CRIES_DATABASE, value);
}

export function getPokemonCryFilename(speciesId: string): string {
  if (isPokemonSpeciesId(speciesId)) {
    return POKEMON_CRIES_DATABASE[speciesId] ?? `${speciesId}.mp3`;
  }
  return `${speciesId}.mp3`;
}
