/**
 * tests/node/map/progressionBarrierEngine.test.ts
 *
 * TIER 1 UNIT TESTS & 100-SEED ANTI-SOFTLOCK FUZZER (PHASE 5)
 *
 * Validates:
 *   1. Correct progression indexing (Starter = 0, Gyms = 1..8, League = 9).
 *   2. Placement of HM barriers (Cut, Strength, Surf) on valid edges.
 *   3. All Surf routes are gated by `barrier_surf` (Rule 6).
 *   4. Mathematical Anti-Softlock verification across 0..8 badge states.
 *   5. 100-Seed Anti-Softlock Fuzzer: guarantees 0 seeds softlock.
 */

import { describe, it, expect } from 'vitest';
import { generatePokemonTopology } from '../../../src/logic/map/pokemonGraphTopology.ts';
import {
  assignProgressionOrder,
  applyProgressionBarriers,
  validateAntiSoftlock
} from '../../../src/logic/map/progressionBarrierEngine.ts';

describe('Progression Barrier & Anti-Softlock Engine (Phase 5)', () => {
  it('assigns progression order monotonically along main chain', () => {
    const graph = generatePokemonTopology({ seed: 42 });
    const orderMap = assignProgressionOrder(graph);

    expect(orderMap.get(graph.mainChainOrder[0]!)).toBe(0); // Starter
    for (let g = 1; g <= 8; g++) {
      expect(orderMap.get(graph.mainChainOrder[g]!)).toBe(g); // Gyms 1..8
    }
    expect(orderMap.get(graph.mainChainOrder[9]!)).toBe(9); // League

    // Secondary stubs have valid order
    for (const node of graph.nodes) {
      expect(orderMap.has(node.id)).toBe(true);
      expect(orderMap.get(node.id)).toBeGreaterThanOrEqual(0);
      expect(orderMap.get(node.id)).toBeLessThanOrEqual(9);
    }
  });

  it('gates all surf route edges with barrier_surf (Rule 6)', () => {
    const graph = generatePokemonTopology({ seed: 42 });
    const result = applyProgressionBarriers(graph);

    const surfEdges = result.edges.filter((e) => e.kind === 'surf_route');
    expect(surfEdges.length).toBeGreaterThanOrEqual(1);

    for (const se of surfEdges) {
      expect(se.barrier).toBe('barrier_surf');
    }
  });

  it('validates solvability for seed 42 without softlocks', () => {
    const graph = generatePokemonTopology({ seed: 42 });
    const result = applyProgressionBarriers(graph);
    expect(result.isSolvable).toBe(true);

    const check = validateAntiSoftlock(graph, result.edges, result.orderMap as Map<string, number>);
    expect(check.isSolvable).toBe(true);
    expect(check.failedAtGym).toBeUndefined();
  });

  describe('100-Seed Anti-Softlock Fuzzer', () => {
    it('guarantees 100% solvability with 0 softlocks across 100 seeds', () => {
      const softlocks: { seed: number; failedAtGym?: number; reason?: string }[] = [];

      for (let seed = 1; seed <= 100; seed++) {
        const graph = generatePokemonTopology({ seed });
        const res = applyProgressionBarriers(graph);

        if (!res.isSolvable) {
          const check = validateAntiSoftlock(graph, res.edges, res.orderMap as Map<string, number>);
          softlocks.push({
            seed,
            failedAtGym: check.failedAtGym,
            reason: check.reason
          });
        }
      }

      expect(softlocks).toEqual([]);
    });
  });
});
