import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import type { Pokemon, PokemonStorageLocation } from '@/types/pokemon/pokemon';
import type { GameState } from '@/types/system/game';
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';

/**
 * fossilEngine.ts
 * Logic for restoring Pokemon from fossils.
 */

/**
 * Restores a fossil and adds the resulting Pokemon to the player's collection.
 */
export function restoreFossil(pokemonId: PokemonSpeciesId, state: GameState): { pokemon: Pokemon; sentTo: PokemonStorageLocation } {
  const speciesId = requirePokemonSpeciesId(pokemonId);

  // 1. Generate the Pokemon at Level 1
  const pokemon = makePokemon(speciesId, 1) as Pokemon;
  
  // 2. Register in Pokedex
  if (!state.seenPokedex.includes(speciesId)) state.seenPokedex.push(speciesId);
  if (!state.pokedex.includes(speciesId)) state.pokedex.push(speciesId);
  
  // 3. Determine where to send it
  let sentTo: PokemonStorageLocation = 'team';
  if (state.team.length < 6) {
    state.team.push(pokemon);
  } else {
    state.box = state.box || [];
    state.box.push(pokemon);
    sentTo = 'box';
  }
  
  return { pokemon, sentTo };
}
