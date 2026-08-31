
import { getPreEvolution } from '@/data/pokemon/evolutionData.ts';
import { isPokemonSpeciesId, requirePokemonSpeciesId } from '@/data/pokemon/pokedex.ts';

/**
 * Get species history from base form up to the given id.
 * Traverses the pre-compiled evolution map backwards in O(1) per step.
 */
export function getSpeciesHistory(id: string): string[] {
  const history = [id];
  let current = id;

  while (isPokemonSpeciesId(current)) {
    const pre = getPreEvolution(requirePokemonSpeciesId(current));
    if (!pre || history.includes(pre)) break; // Prevent loops
    history.unshift(pre);
    current = pre;
  }
  return history;
}

/**
 * Find the most basic form of a pokemon.
 */
export function getFirstEvolution(id: string): string {
  const history = getSpeciesHistory(id);
  return history[0] || id;
}
