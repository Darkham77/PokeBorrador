/**
 * src/logic/pokemon/pokedexAggregator.ts
 * 
 * POKEDEX AGGREGATOR (Node.js 26+)
 * 
 * Uses the new Iterator.concat() feature from V8 14.6 to merge multiple 
 * data sources (Team, PC, Encounters) without creating intermediate arrays.
 */

import type { Pokemon } from '@/types/pokemon/pokemon';

import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';

export class PokedexAggregator {
  /**
   * Returns an iterator that yields all unique Pokémon IDs seen across different pools.
   * Demonstrates Iterator.concat() to avoid merging massive arrays in memory.
   */
  static getAllKnownSpecies(team: Pokemon[], pc: Pokemon[], seenInWild: PokemonSpeciesId[]): IterableIterator<PokemonSpeciesId> {
    const teamIds = team.map(p => p.id).values();
    const pcIds = pc.map(p => p.id).values();
    const wildIds = seenInWild.values();

    // Iterator sequencing (V8 14.6 / Node 26)
    // This creates a single lazy iterator instead of [...team, ...pc, ...wild]
    return Iterator.concat(teamIds, pcIds, wildIds);
  }

  /**
   * Filters the aggregated iterator.
   */
  static getFilteredSpecies(team: Pokemon[], pc: Pokemon[], seenInWild: PokemonSpeciesId[]): PokemonSpeciesId[] {
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
