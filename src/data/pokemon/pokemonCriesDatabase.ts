/**
 * src/data/pokemon/pokemonCriesDatabase.ts
 * 
 * Lightweight domain wrapper for Pokemon cries mapping.
 * Avoids pulling the heavy pokemonFeetDatabase (1.2 MB) on app boot.
 */
import criesJson from './pokemonCriesDatabase.json' with { type: 'json' };

// fallow-ignore-next-line unused-export
export const POKEMON_CRIES_DATABASE: Record<string, string> = criesJson; // open-record

// fallow-ignore-next-line unused-export
export function isPokemonCryId(value: string): boolean {
  return Object.hasOwn(POKEMON_CRIES_DATABASE, value);
}

export function getPokemonCryFilename(speciesId: string): string { // domain-ok
  return POKEMON_CRIES_DATABASE[speciesId] ?? `${speciesId}.mp3`;
}
