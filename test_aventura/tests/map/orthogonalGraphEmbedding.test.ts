/**
 * tests/node/map/orthogonalGraphEmbedding.test.ts
 *
 * TIER 1 UNIT TESTS & 100-SEED FUZZER FOR ORTHOGONAL GRAPH EMBEDDING (PHASE 2)
 *
 * Validates Phase 2 of the Graph-First Pipeline:
 *   1. Deterministic embedding for fixed seed.
 *   2. Strict corridor orthogonality (Rule 3: 100% horizontal or vertical segments, zero diagonals).
 *   3. 4-connected continuous path cells without gaps.
 *   4. Zero node overlaps across all primary and secondary settlements.
 *   5. All nodes contained within world dimensions with safe margins.
 *   6. Wormhole tunnels bypass surface corridors (empty waypoints / pathCells).
 *   7. 100-seed spatial fuzzer verifying all spatial embedding invariants.
 */

import { describe, it, expect } from 'vitest';
import { generatePokemonTopology } from '../../../src/logic/map/pokemonGraphTopology.ts';
import {
  embedPokemonTopology,
  validateEmbeddedGraphInvariants,
  computeBandGrid
} from '../../../src/logic/map/orthogonalGraphEmbedding.ts';

describe('Orthogonal Graph Embedding Engine (Phase 2)', () => {
  it('computes valid band grid dimensions for variable node counts', () => {
    const grid16 = computeBandGrid(12, 128, 128);
    expect(grid16.cols * grid16.rows).toBeGreaterThanOrEqual(14);
    expect(grid16.colX.length).toBe(grid16.cols);
    expect(grid16.rowY.length).toBe(grid16.rows);

    // Columns and rows should be monotonically increasing
    for (let i = 0; i < grid16.colX.length - 1; i++) {
      expect(grid16.colX[i + 1]!).toBeGreaterThan(grid16.colX[i]!);
    }
    for (let i = 0; i < grid16.rowY.length - 1; i++) {
      expect(grid16.rowY[i + 1]!).toBeGreaterThan(grid16.rowY[i]!);
    }
  });

  it('embeds topology deterministically for seed 42', () => {
    const graphA = generatePokemonTopology({ seed: 42 });
    const graphB = generatePokemonTopology({ seed: 42 });

    const embeddedA = embedPokemonTopology(graphA, { seed: 42 });
    const embeddedB = embedPokemonTopology(graphB, { seed: 42 });

    expect(embeddedA.nodes.length).toBe(embeddedB.nodes.length);
    expect(embeddedA.corridors.length).toBe(embeddedB.corridors.length);

    for (let i = 0; i < embeddedA.nodes.length; i++) {
      expect(embeddedA.nodes[i]!.gridX).toBe(embeddedB.nodes[i]!.gridX);
      expect(embeddedA.nodes[i]!.gridY).toBe(embeddedB.nodes[i]!.gridY);
    }

    const validation = validateEmbeddedGraphInvariants(embeddedA);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it('enforces 100% orthogonal corridors with zero diagonals (Rule 3)', () => {
    const graph = generatePokemonTopology({ seed: 101 });
    const embedded = embedPokemonTopology(graph, { seed: 101 });

    for (const corridor of embedded.corridors) {
      if (corridor.kind === 'wormhole_tunnel') {
        expect(corridor.waypoints.length).toBe(0);
        expect(corridor.pathCells.length).toBe(0);
        continue;
      }

      expect(corridor.waypoints.length).toBeGreaterThanOrEqual(2);
      expect(corridor.waypoints.length).toBeLessThanOrEqual(3); // H, V, or single right-angle L-turn

      for (let i = 0; i < corridor.waypoints.length - 1; i++) {
        const p1 = corridor.waypoints[i]!;
        const p2 = corridor.waypoints[i + 1]!;
        const isHorizontal = p1.y === p2.y && p1.x !== p2.x;
        const isVertical = p1.x === p2.x && p1.y !== p2.y;
        expect(isHorizontal || isVertical).toBe(true);
      }
    }
  });

  it('preserves wormhole tunnel properties without creating surface corridors', () => {
    // Find seed with wormhole
    for (let s = 1; s <= 50; s++) {
      const graph = generatePokemonTopology({ seed: s });
      const wormholes = graph.edges.filter((e) => e.kind === 'wormhole_tunnel');
      if (wormholes.length > 0) {
        const embedded = embedPokemonTopology(graph, { seed: s });
        const embeddedWormholes = embedded.corridors.filter(
          (c) => c.kind === 'wormhole_tunnel'
        );
        expect(embeddedWormholes.length).toBe(wormholes.length);
        for (const ew of embeddedWormholes) {
          expect(ew.waypoints.length).toBe(0);
          expect(ew.pathCells.length).toBe(0);
          expect(ew.tunnelPairId).toBeDefined();
        }
        break;
      }
    }
  });

  describe('100-Seed Spatial Embedding Fuzzer', () => {
    it('passes all spatial embedding invariants across 100 random seeds with 0 errors', () => {
      const failures: { seed: number; errors: readonly string[] }[] = [];

      for (let seed = 1; seed <= 100; seed++) {
        const graph = generatePokemonTopology({ seed });
        const embedded = embedPokemonTopology(graph, { seed });
        const res = validateEmbeddedGraphInvariants(embedded);
        if (!res.isValid) {
          failures.push({ seed, errors: res.errors });
        }
      }

      expect(failures).toEqual([]);
    });
  });
});
