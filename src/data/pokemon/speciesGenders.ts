/**
 * src/data/pokemon/speciesGenders.ts
 *
 * Precomputed gender metadata for all 1,417 Pokémon species across Gen 1–9.
 * Avoids loading @pkmn/sim Dex into the client runtime.
 */
import gendersJson from './speciesGenders.json' with { type: 'json' };
import type { GenderName } from '@pkmn/types';
import type { PokemonSpeciesId } from './pokedex.ts';

export type SpeciesGenderRule = GenderName | number;

export const SPECIES_GENDERS: Partial<Record<PokemonSpeciesId, SpeciesGenderRule>> = gendersJson as Partial<Record<PokemonSpeciesId, SpeciesGenderRule>>; // open-record: Generic key-value data dictionary container
