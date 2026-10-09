/**
 * tests/node/map/pokemonGraphTopology.test.ts
 *
 * TIER 1 UNIT TESTS & 100-SEED FUZZER FOR POKÉMON TOPOLOGY GRAPH GENERATOR
 *
 * Validates Phase 1 of the Graph-First Pipeline:
 *   1. Starter node is a dead-end (degree 1).
 *   2. League node is a dead-end (degree 1).
 *   3. Exactly 8 gyms exist in the topology.
 *   4. At least 1 coastal port city is designated.
 *   5. Graph is 100% connected.
 *   6. Exactly 3 to 5 independent cycles are injected.
 *   7. At least 1 Surf route cycle exists.
 *   8. All non-terminal primary nodes have degree >= 2.
 *   9. At least 1 hub city has degree >= 3.
 *  10. 100-seed fuzzer guarantees 0 broken topologies across random seeds.
 *  11. Wormhole tunnels (when spawned) connect nodes >= 4 hops apart.
 */

import { describe, it, expect } from 'vitest';
import {
  generatePokemonTopology,
  validateGraphInvariants
} from '../../../src/logic/map/pokemonGraphTopology.ts';

describe('Pokemon Topology Graph Generator (Phase 1)', () => {
  it('generates a deterministic topology for seed 42', () => {
    const graphA = generatePokemonTopology({ seed: 42 });
    const graphB = generatePokemonTopology({ seed: 42 });

    expect(graphA.nodes.length).toBe(graphB.nodes.length);
    expect(graphA.edges.length).toBe(graphB.edges.length);
    expect(graphA.mainChainOrder).toEqual(graphB.mainChainOrder);

    const validation = validateGraphInvariants(graphA);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it('guarantees Starter and League endpoints are degree 1', () => {
    const graph = generatePokemonTopology({ seed: 101 });
    const starter = graph.nodes.find((n) => n.role === 'starter')!;
    const league = graph.nodes.find((n) => n.role === 'league')!;

    const starterEdges = graph.edges.filter(
      (e) => e.fromId === starter.id || e.toId === starter.id
    );
    const leagueEdges = graph.edges.filter(
      (e) => e.fromId === league.id || e.toId === league.id
    );

    expect(starterEdges.length).toBe(1);
    expect(leagueEdges.length).toBe(1);
  });

  it('contains exactly 8 gyms and at least 1 port city', () => {
    const graph = generatePokemonTopology({ seed: 777 });
    const gyms = graph.nodes.filter((n) => n.role === 'gym_city');
    const ports = graph.nodes.filter((n) => n.hasPort);

    expect(gyms.length).toBe(8);
    expect(ports.length).toBeGreaterThanOrEqual(1);

    const gymNumbers = gyms.map((g) => g.gymNumber).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(gymNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('contains between 3 and 5 cycles, including at least 1 surf route', () => {
    const graph = generatePokemonTopology({ seed: 999 });
    const cycleEdges = graph.edges.filter(
      (e) => e.kind === 'cycle' || e.kind === 'surf_route'
    );
    const surfEdges = graph.edges.filter((e) => e.kind === 'surf_route');

    expect(cycleEdges.length).toBeGreaterThanOrEqual(3);
    expect(cycleEdges.length).toBeLessThanOrEqual(5);
    expect(surfEdges.length).toBeGreaterThanOrEqual(1);
  });

  it('ensures wormhole tunnels connect nodes at least 4 hops apart on the surface graph', () => {
    let wormholeFound = false;

    // Search seeds until wormhole is found
    for (let s = 1; s <= 50; s++) {
      const graph = generatePokemonTopology({ seed: s });
      const wormholes = graph.edges.filter((e) => e.kind === 'wormhole_tunnel');
      if (wormholes.length > 0) {
        wormholeFound = true;
        for (const w of wormholes) {
          expect(w.tunnelPairId).toBeDefined();
          // Find their positions on main chain
          const idxA = graph.mainChainOrder.indexOf(w.fromId);
          const idxB = graph.mainChainOrder.indexOf(w.toId);
          expect(Math.abs(idxA - idxB)).toBeGreaterThanOrEqual(4);
        }
      }
    }

    expect(wormholeFound).toBe(true);
  });

  describe('100-Seed Fuzzer Invariant Validation', () => {
    it('passes all 10 topological invariants across 100 seeds with 0 errors', () => {
      const failures: { seed: number; errors: readonly string[] }[] = [];

      for (let seed = 1; seed <= 100; seed++) {
        const graph = generatePokemonTopology({ seed });
        const res = validateGraphInvariants(graph);
        if (!res.isValid) {
          failures.push({ seed, errors: res.errors });
        }
      }

      expect(failures).toEqual([]);
    });
  });
});
