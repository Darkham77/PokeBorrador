import type { ID } from '@pkmn/sim';
import { ACTIVE_GENERATION } from '../../data/system/constants.ts';
import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';
import type { BaseStats } from '../pokemon/statsMath.ts';
import type { PokemonSpeciesId } from '../../data/pokemon/pokedex.ts';

export { mapToShowdownSet } from './showdownSetMapper.ts';

const DEFAULT_FALLBACK_BASE_SPEED = 45 as const;

/**
 * Resolves the base stats of a species from the game database.
 */
export function resolveBaseStats(speciesId: PokemonSpeciesId): BaseStats {
  const data = pokemonDataProvider.getPokemonData(speciesId, true);
  return {
    hp: data.hp,
    atk: data.atk,
    def: data.def,
    spa: data.spa ?? data.atk,
    spd: data.spd ?? data.def,
    spe: data.spe ?? DEFAULT_FALLBACK_BASE_SPEED
  };
}

export const SHOWDOWN_GAME_TYPES = ['singles', 'doubles'] as const;
export type ShowdownGameType = (typeof SHOWDOWN_GAME_TYPES)[number];

/**
 * Returns the official Pokémon Showdown format ID.
 */
export function getShowdownFormatId(gen?: number, gameType?: ShowdownGameType): ID {
  const finalGen = gen !== undefined ? gen : ACTIVE_GENERATION;
  const prefix = gameType === 'doubles' ? 'doubles' : '';
  if (finalGen < 5) {
    return `gen${finalGen}${prefix}customgame` as ID;
  }
  return `gen${finalGen}${prefix}customgame@@@!Team Preview` as ID;
}
