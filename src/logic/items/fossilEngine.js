/**
 * src/logic/items/fossilEngine.js
 * Logic for restoring fossils into Pokemon.
 */
import { makePokemon } from '../pokemonFactory';

/**
 * Restores a fossil into a Level 1 Pokemon.
 * @param {String} pokemonId - The ID of the pokemon to create.
 * @param {Object} state - Current player state.
 * @returns {Object} { pokemon, sentTo } where sentTo is 'team' or 'box'
 */
export function restoreFossil(pokemonId, state) {
  const p = makePokemon(pokemonId, 1);
  
  // Register in Pokedex
  state.pokedex = state.pokedex || [];
  state.seenPokedex = state.seenPokedex || [];
  if (!state.pokedex.includes(p.id)) state.pokedex.push(p.id);
  if (!state.seenPokedex.includes(p.id)) state.seenPokedex.push(p.id);

  let sentTo = 'box';
  if (state.team.length < 6) {
    state.team.push(p);
    sentTo = 'team';
  } else {
    state.box = state.box || [];
    state.box.push(p);
    sentTo = 'box';
  }

  return {
    pokemon: p,
    sentTo
  };
}
