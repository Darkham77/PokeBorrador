/**
 * tests/node/map/pokemonContinentalWorldPipeline.test.ts
 *
 * TIER 2 INTEGRATION TESTS FOR THE COMPLETE POKÉMON GRAPH-FIRST CONTINENTAL PIPELINE
 *
 * Validates:
 *   1. Full 6-phase master pipeline execution (generatePokemonContinentalWorld).
 *   2. Complete contract output: ContinentMapResult + Graph + Embedded + CorridorProps + Progression + SVG.
 *   3. Semantic SVG export validity (nodes, corridors, barriers, wormholes, gatehouses).
 *   4. Zero-regression test for legacy generateContinent function.
 *   5. Robustness across multiple procedural seeds.
 */

import { describe, it, expect } from 'vitest';
import {
  generatePokemonContinentalWorld,
  generateContinent
} from '../../../src/logic/map/continent/continentalEngine.ts';
import { validateGraphInvariants } from '../../../src/logic/map/pokemonGraphTopology.ts';
import { validateEmbeddedGraphInvariants } from '../../../src/logic/map/orthogonalGraphEmbedding.ts';

describe('Pokemon Continental World Pipeline (Integration)', () => {
  it('executes full 6-phase pipeline generating terrain, graph, and SVG for seed 42', () => {
    const result = generatePokemonContinentalWorld({
      seed: 42,
      width: 128,
      height: 128
    });

    // 1. Continent terrain matrix integrity
    expect(result.continent.width).toBe(128);
    expect(result.continent.height).toBe(128);
    expect(result.continent.terrainMatrix.length).toBe(128);
    expect(result.continent.resolvedWater).toBeDefined();
    expect(result.continent.resolvedMountain).toBeDefined();

    // 2. Abstract graph adheres to all 7 Pokémon rules
    const graphValidation = validateGraphInvariants(result.graph);
    expect(graphValidation.isValid).toBe(true);
    expect(graphValidation.errors).toEqual([]);

    // 3. Embedded graph satisfies all spatial orthogonality invariants
    const spatialValidation = validateEmbeddedGraphInvariants(result.embedded);
    expect(spatialValidation.isValid).toBe(true);
    expect(spatialValidation.errors).toEqual([]);

    // 4. Corridor properties generated for all corridors
    expect(result.corridorProperties.length).toBe(result.embedded.corridors.length);

    // 5. Progression anti-softlock solvability guaranteed
    expect(result.progression.isSolvable).toBe(true);

    // 5b. Phase 4 & 5: Ledges, HM Obstacles, and Micro-Vignettes
    expect(result.ledges).toBeDefined();
    expect(result.progressionObstacles).toBeDefined();
    expect(result.microVignettes).toBeDefined();

    // 6. Semantic SVG vector export structure
    expect(result.svgMarkup).toContain('<svg');
    expect(result.svgMarkup).toContain('id="corridors"');
    expect(result.svgMarkup).toContain('id="nodes"');
    expect(result.svgMarkup).toContain('class="topology-node');
    expect(result.svgMarkup).toContain('</svg>');
  });

  it('generates unique, solvable worlds across diverse seeds', () => {
    for (const seed of [101, 555, 777]) {
      const result = generatePokemonContinentalWorld({ seed, width: 128, height: 128 });

      expect(result.graph.nodes.length).toBeGreaterThanOrEqual(12);
      expect(result.embedded.corridors.length).toBeGreaterThanOrEqual(13);
      expect(result.progression.isSolvable).toBe(true);
      expect(result.svgMarkup.length).toBeGreaterThan(500);

      // Verify at least 1 port city exists
      const portNode = result.embedded.nodes.find((n) => n.hasPort);
      expect(portNode).toBeDefined();

      // Verify Starter and League are degree 1
      const starter = result.embedded.nodes.find((n) => n.role === 'starter')!;
      const league = result.embedded.nodes.find((n) => n.role === 'league')!;
      const starterEdges = result.graph.edges.filter(
        (e) => e.fromId === starter.id || e.toId === starter.id
      );
      const leagueEdges = result.graph.edges.filter(
        (e) => e.fromId === league.id || e.toId === league.id
      );
      expect(starterEdges.length).toBe(1);
      expect(leagueEdges.length).toBe(1);
    }
  });

  describe('Legacy Backward Compatibility (Zero Regression)', () => {
    it('preserves legacy generateContinent function without regressions', () => {
      const legacyResult = generateContinent({
        dimensions: { width: 1600, height: 1600, tileSize: 32 },
        seed: 42,
        cityCount: 6,
        biomes: {
          waterPercent: 30,
          forestPercent: 25,
          mountainPercent: 20,
          snowPercent: 10,
          beachPercent: 15
        },
        roadWidth: 2
      });

      expect(legacyResult.gridWidth).toBe(50);
      expect(legacyResult.gridHeight).toBe(50);
      expect(Object.keys(legacyResult.nodes).length).toBeGreaterThanOrEqual(5);
      expect(legacyResult.connections.length).toBeGreaterThanOrEqual(4);
      expect(legacyResult.roads.size).toBeGreaterThan(0);
    });
  });
});
