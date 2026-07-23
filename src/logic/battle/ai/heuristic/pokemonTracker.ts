// ============================================================
// Pokemon Tracker — probabilistic set distribution per Pokémon
// Adapted from external/pokemon-showdown-ai/src/inference/tracker.ts
// ============================================================

import type { InferredSet, InferredInfo, RandomBattleSetEntry } from './types.ts';

function toId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export class PokemonTracker {
  readonly species: string;
  private sets: InferredSet[];
  private readonly revealedMoves = new Set<string>();
  private revealedAbility: string | null = null;
  private revealedItem: string | null = null;
  private itemConsumed = false;
  private repeatedMove: string | null = null;
  private lastMove: string | null = null;
  private tookRecoil = false;

  constructor(species: string, baseSets: RandomBattleSetEntry[]) {
    this.species = toId(species);
    if (baseSets.length === 0) {
      this.sets = [{ moves: [], ability: 'unknown', item: 'unknown', role: 'unknown', probability: 1.0 }];
    } else {
      const prob = 1.0 / baseSets.length;
      this.sets = baseSets.map(s => ({ ...s, probability: prob }));
    }
  }

  observeMove(moveId: string): void {
    const mv = toId(moveId);
    this.revealedMoves.add(mv);
    if (this.lastMove === mv) this.repeatedMove = mv;
    this.lastMove = mv;
    this.eliminateSetsWithout('move', mv);
  }

  observeAbility(ability: string): void {
    this.revealedAbility = toId(ability);
    this.eliminateSetsWithout('ability', this.revealedAbility);
  }

  observeItem(item: string): void {
    this.revealedItem = toId(item);
    this.eliminateSetsWithout('item', this.revealedItem);
  }

  observeItemConsumed(): void { this.itemConsumed = true; }

  observeNoHazardDamage(): void {
    this.adjustItemProbability('heavydutyboots', 2.0);
  }

  observeRecoil(): void {
    this.tookRecoil = true;
    this.adjustItemProbability('lifeorb', 5.0);
  }

  computeMoveProbabilities(): Map<string, number> {
    const probs = new Map<string, number>();
    for (const m of this.revealedMoves) probs.set(m, 1.0);
    for (const set of this.sets) {
      if (set.probability <= 0) continue;
      for (const move of set.moves) {
        const mid = toId(move);
        if (!this.revealedMoves.has(mid)) {
          probs.set(mid, Math.min(1.0, (probs.get(mid) ?? 0) + set.probability));
        }
      }
    }
    return probs;
  }

  getInferredInfo(): InferredInfo {
    return {
      pokemon: this.species,
      possibleSets: this.sets.filter(s => s.probability > 0),
      likelyMoves: this.computeMoveProbabilities(),
      likelyAbility: this.computeAbilityProbabilities(),
      likelyItem: this.computeItemProbabilities(),
    };
  }

  getLikelyUnrevealedMoves(threshold = 0.3): Array<{ move: string; probability: number }> {
    const probs = this.computeMoveProbabilities();
    const result: Array<{ move: string; probability: number }> = [];
    for (const [move, prob] of probs) {
      if (!this.revealedMoves.has(move) && prob >= threshold) result.push({ move, probability: prob });
    }
    return result.sort((a, b) => b.probability - a.probability);
  }

  isMoveLikely(moveId: string, threshold = 0.5): boolean {
    return (this.computeMoveProbabilities().get(toId(moveId)) ?? 0) >= threshold;
  }

  // ──────────────────────────────────────────
  // Private
  // ──────────────────────────────────────────

  private eliminateSetsWithout(field: 'move' | 'ability' | 'item', value: string): void {
    let changed = false;
    for (const set of this.sets) {
      if (set.probability <= 0) continue;
      const matches = field === 'move'
        ? set.moves.some(m => toId(m) === value)
        : field === 'ability' ? toId(set.ability) === value
        : toId(set.item) === value;
      if (!matches) { set.probability = 0; changed = true; }
    }
    if (changed) this.renormalize();
  }

  private adjustItemProbability(itemId: string, multiplier: number): void {
    for (const set of this.sets) {
      if (set.probability <= 0) continue;
      if (toId(set.item) === itemId) set.probability *= multiplier;
    }
    this.renormalize();
  }

  private renormalize(): void {
    const total = this.sets.reduce((s, x) => s + x.probability, 0);
    if (total <= 0) {
      const p = 1.0 / this.sets.length;
      for (const s of this.sets) s.probability = p;
      return;
    }
    for (const s of this.sets) s.probability /= total;
  }

  private computeAbilityProbabilities(): Map<string, number> {
    if (this.revealedAbility) return new Map([[this.revealedAbility, 1.0]]);
    const probs = new Map<string, number>();
    for (const set of this.sets) {
      if (set.probability <= 0) continue;
      const aid = toId(set.ability);
      probs.set(aid, (probs.get(aid) ?? 0) + set.probability);
    }
    return probs;
  }

  private computeItemProbabilities(): Map<string, number> {
    if (this.revealedItem) return new Map([[toId(this.revealedItem), 1.0]]);
    const probs = new Map<string, number>();
    if (this.repeatedMove) {
      const choice = ['choiceband', 'choicescarf', 'choicespecs'];
      for (const set of this.sets) {
        if (set.probability <= 0) continue;
        const iid = toId(set.item);
        probs.set(iid, (probs.get(iid) ?? 0) + set.probability * (choice.includes(iid) ? 3.0 : 1.0));
      }
      const total = [...probs.values()].reduce((a, b) => a + b, 0);
      if (total > 0) for (const [k, v] of probs) probs.set(k, v / total);
      return probs;
    }
    for (const set of this.sets) {
      if (set.probability <= 0) continue;
      const iid = toId(set.item);
      probs.set(iid, (probs.get(iid) ?? 0) + set.probability);
    }
    return probs;
  }

  // suppress unused-variable warning for tookRecoil / itemConsumed
  // (tracked for future heuristic extensions)
  _diagnostics(): Record<string, unknown> {
    return { tookRecoil: this.tookRecoil, itemConsumed: this.itemConsumed };
  }
}
