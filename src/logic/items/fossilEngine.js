import { makePokemon } from '@/logic/pokemonFactory';

/**
 * fossilEngine.js
 * Logic for restoring Pokemon from fossils.
 */

/**
 * Restores a fossil and adds the resulting Pokemon to the player's collection.
 * @param {string} pokemonId - The ID of the species to restore.
 * @param {Object} state - The player's game state.
 * @returns {Object} { pokemon, sentTo }
 */
export function restoreFossil(pokemonId, state) {
  // 1. Generate the Pokemon at Level 1
  const pokemon = makePokemon(pokemonId, 1);
  
  // 2. Register in Pokedex
  if (!state.seenPokedex.includes(pokemonId)) state.seenPokedex.push(pokemonId);
  if (!state.pokedex.includes(pokemonId)) state.pokedex.push(pokemonId);
  
  // 3. Determine where to send it
  let sentTo = 'team';
  if (state.team.length < 6) {
    state.team.push(pokemon);
  } else {
    state.box = state.box || [];
    state.box.push(pokemon);
    sentTo = 'box';
  }
  
  return { pokemon, sentTo };
}
