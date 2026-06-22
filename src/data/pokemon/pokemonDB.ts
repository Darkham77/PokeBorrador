/**
 * src/data/pokemon/pokemonDB.ts
 * 
 * Wrapper to export POKEMON_DB loaded from JSON.
 */
import type { PokemonBaseData } from '@/types/system/database';
import dbJson from './pokemonDB.json' with { type: 'json' };

export const POKEMON_DB = dbJson as Record<string, PokemonBaseData>;
