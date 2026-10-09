/**
 * tests/node/map/corridorPropertyEngine.test.ts
 *
 * TIER 1 UNIT TESTS FOR EMERGENT CORRIDOR PROPERTY ENGINE (PHASE 4)
 *
 * Validates:
 *   1. Emergent continuous properties (width, difficulty, terrain influence).
 *   2. Inverse scaling of width with progression (early routes wider than pre-league route).
 *   3. No-repeat variety constraint across consecutive main-path corridors.
 *   4. Checkpoint gatehouse placement on major surface routes.
 *   5. Wormhole corridors and surf routes do not spawn surface gatehouses.
 */

import { describe, it, expect } from 'vitest';
import { generatePokemonTopology } from '../../../src/logic/map/pokemonGraphTopology.ts';
import { embedPokemonTopology } from '../../../src/logic/map/orthogonalGraphEmbedding.ts';
import { sculptContinentFromGraph } from '../../../src/logic/map/continentGenerator.ts';
import { enrichCorridorProperties } from '../../../src/logic/map/corridorPropertyEngine.ts';

describe('Emergent Corridor Property Engine (Phase 4)', () => {
  it('enriches all corridors with valid continuous property profiles for seed 42', () => {
    const graph = generatePokemonTopology({ seed: 42 });
    const embedded = embedPokemonTopology(graph, { seed: 42, width: 128, height: 128 });
    const continent = sculptContinentFromGraph(embedded, { seed: 42 });
    const enriched = enrichCorridorProperties(embedded, continent);

    expect(enriched.length).toBe(embedded.corridors.length);

    for (const prop of enriched) {
      expect(prop.width).toBeGreaterThanOrEqual(3);
      expect(prop.width).toBeLessThanOrEqual(10);
      expect(prop.difficulty).toBeGreaterThanOrEqual(0.0);
      expect(prop.difficulty).toBeLessThanOrEqual(1.0);
      expect(['plains', 'mountain', 'coastal', 'forest']).toContain(prop.terrainInfluence);
      expect(prop.tallGrassDensity).toBeGreaterThanOrEqual(0.0);
      expect(prop.tallGrassDensity).toBeLessThanOrEqual(1.0);
    }
  });

  it('guarantees early routes have larger width than pre-league route', () => {
    const graph = generatePokemonTopology({ seed: 42 });
    const embedded = embedPokemonTopology(graph, { seed: 42, width: 128, height: 128 });
    const continent = sculptContinentFromGraph(embedded, { seed: 42 });
    const enriched = enrichCorridorProperties(embedded, continent);

    // First main chain corridor (Starter -> Gym 1)
    const starterCorridor = enriched.find((c) => c.fromId === 'node_0' || c.toId === 'node_0')!;
    // Pre-league corridor (Gym 8 -> League)
    const leagueNodeId = embedded.mainChainOrder[embedded.mainChainOrder.length - 1]!;
    const leagueCorridor = enriched.find((c) => c.fromId === leagueNodeId || c.toId === leagueNodeId)!;

    expect(starterCorridor.width).toBeGreaterThan(leagueCorridor.width);
    expect(starterCorridor.difficulty).toBeLessThan(leagueCorridor.difficulty);
  });

  it('enforces the No-Repeat Variety Constraint on consecutive main-path corridors', () => {
    const graph = generatePokemonTopology({ seed: 101 });
    const embedded = embedPokemonTopology(graph, { seed: 101, width: 128, height: 128 });
    const continent = sculptContinentFromGraph(embedded, { seed: 101 });
    const enriched = enrichCorridorProperties(embedded, continent);

    // Find all main chain corridors in order
    const mainCorridors: typeof enriched[number][] = [];
    for (let i = 0; i < embedded.mainChainOrder.length - 1; i++) {
      const a = embedded.mainChainOrder[i]!;
      const b = embedded.mainChainOrder[i + 1]!;
      const match = enriched.find(
        (c) => (c.fromId === a && c.toId === b) || (c.fromId === b && c.toId === a)
      );
      if (match) mainCorridors.push(match);
    }

    for (let i = 0; i < mainCorridors.length - 1; i++) {
      const curr = mainCorridors[i]!;
      const next = mainCorridors[i + 1]!;
      const isIdentical = curr.terrainInfluence === next.terrainInfluence && curr.width === next.width;
      expect(isIdentical, `Consecutive corridors ${curr.corridorId} and ${next.corridorId} must not be identical`).toBe(false);
    }
  });

  it('places gatehouse checkpoints on longer surface routes and omits them on wormholes', () => {
    // Find seed with wormhole
    for (const seed of [42, 101, 777]) {
      const graph = generatePokemonTopology({ seed });
      const embedded = embedPokemonTopology(graph, { seed, width: 128, height: 128 });
      const continent = sculptContinentFromGraph(embedded, { seed });
      const enriched = enrichCorridorProperties(embedded, continent);

      for (let i = 0; i < embedded.corridors.length; i++) {
        const corr = embedded.corridors[i]!;
        const prop = enriched[i]!;

        if (corr.kind === 'wormhole_tunnel') {
          expect(prop.gatehouses.length).toBe(0);
        } else if (corr.kind === 'surf_route') {
          expect(prop.gatehouses.length).toBe(0);
        } else if (corr.pathCells.length >= 12) {
          expect(prop.gatehouses.length).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});
