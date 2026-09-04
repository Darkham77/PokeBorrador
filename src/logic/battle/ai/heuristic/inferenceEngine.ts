// ============================================================
// Inference Engine — hidden information tracking per battle
// Adapted from external/pokemon-showdown-ai/src/inference/engine.ts
// ============================================================

import { toID } from '@pkmn/sim';
import { isPokemonMoveId, type PokemonMoveId } from '@/data/battle/moves';
import { isAbilityId } from '@/data/battle/abilities';
import { isItemId } from '@/data/inventory/items';
import { SetsDatabase } from './setsDatabase.ts';
import { PokemonTracker } from './pokemonTracker.ts';
import type { HeuristicBattleSnapshot, HeuristicPokemonState, InferredInfo } from './types.ts';

export class InferenceEngine {
  private readonly db: SetsDatabase;
  private readonly trackers = new Map<string, PokemonTracker>();

  constructor() {
    this.db = new SetsDatabase();
  }

  /** Called every turn after state update */
  update(snapshot: HeuristicBattleSnapshot): void {
    for (const pokemon of snapshot.opponentSide.pokemon) {
      const tracker = this.getOrCreate(pokemon);
      for (const move of pokemon.knownMoves) {
        if (isPokemonMoveId(move)) tracker.observeMove(move);
      }
      if (pokemon.knownAbility && isAbilityId(pokemon.knownAbility)) tracker.observeAbility(pokemon.knownAbility);
      if (pokemon.knownItem && isItemId(pokemon.knownItem)) tracker.observeItem(pokemon.knownItem);
      if (pokemon.itemConsumed) tracker.observeItemConsumed();
    }
  }

  /** Inference hints from events outside the snapshot (e.g. Life Orb recoil) */
  observeNoHazardDamage(species: string): void {
    this.trackers.get(toID(species))?.observeNoHazardDamage();
  }

  observeRecoil(species: string): void {
    this.trackers.get(toID(species))?.observeRecoil();
  }

  /** Probabilistic move map for the opponent's active Pokémon */
  getActiveOpponentMoves(snapshot: HeuristicBattleSnapshot): Map<string, number> {
    const active = snapshot.opponentSide.activePokemon;
    if (!active) return new Map();
    return this.getOrCreate(active).computeMoveProbabilities();
  }

  getLikelyUnrevealed(species: string, threshold = 0.3): Array<{ move: PokemonMoveId; probability: number }> {
    return this.trackers.get(toID(species))?.getLikelyUnrevealedMoves(threshold) ?? [];
  }

  getInferredInfo(species: string): InferredInfo | null {
    return this.trackers.get(toID(species))?.getInferredInfo() ?? null;
  }

  /** Reset between battles */
  reset(): void {
    this.trackers.clear();
  }

  // ──────────────────────────────────────────
  // Private
  // ──────────────────────────────────────────

  private getOrCreate(pokemon: HeuristicPokemonState): PokemonTracker {
    return this.trackers.getOrInsertComputed(toID(pokemon.species), () => 
      new PokemonTracker(pokemon.species, this.db.getSets(pokemon.species))
    );
  }
}
