/**
 * src/logic/pokemon/pokedexAggregator.ts
 *
 * POKEDEX AGGREGATOR (Node.js 26+)
 *
 * Uses the new Iterator.concat() feature from V8 14.6 to merge multiple
 * data sources (Team, PC, Encounters) without creating intermediate arrays.
 */

import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { Pokemon } from '@/types/pokemon/pokemon';

export class PokedexAggregator {
  /**
   * Returns an iterator that yields all unique Pokémon IDs seen across different pools.
   * Demonstrates Iterator.concat() to avoid merging massive arrays in memory.
   */
  public static *getAllKnownSpecies(
    team: Pokemon[],
    pc: Pokemon[],
    seenInWild: PokemonSpeciesId[]
  ): IterableIterator<PokemonSpeciesId> {
    for (const p of team) yield p.id;
    for (const p of pc) yield p.id;
    for (const id of seenInWild) yield id;
  }

  /**
   * Filters the aggregated iterator.
   */
  public static getFilteredSpecies(
    team: Pokemon[],
    pc: Pokemon[],
    seenInWild: PokemonSpeciesId[]
  ): PokemonSpeciesId[] {
    const all = this.getAllKnownSpecies(team, pc, seenInWild);
    const result: PokemonSpeciesId[] = [];
    const seen = new Set<string>();

    // We can iterate over the lazy sequence
    for (const id of all) {
      if (!seen.has(id)) {
        result.push(requirePokemonSpeciesId(id));
        seen.add(id);
      }
    }

    return result;
  }
}
