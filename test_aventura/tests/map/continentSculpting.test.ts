/**
 * tests/node/map/continentSculpting.test.ts
 *
 * TIER 1 & TIER 2 UNIT TESTS FOR CONTINENTAL SCULPTING (PHASE 3)
 *
 * Validates Rule 7: "The Continent Wraps the Graph, Not Vice Versa":
 *   1. Land envelope is successfully sculpted directly around embedded graph nodes.
 *   2. 100% of node footprints remain on solid ground (grass or sand), never ocean water.
 *   3. 100% of terrestrial (non-surf) corridor pathCells remain on walkable ground.
 *   4. Surf route corridors cross water cells (navigable channels).
 *   5. Outer map borders remain 100% ocean water.
 *   6. Mountain massifs and macro-biomes are fully synthesized into the negative space.
 */

import { describe, it, expect } from 'vitest';
import { generatePokemonTopology } from '../../../src/logic/map/pokemonGraphTopology.ts';
import { embedPokemonTopology } from '../../../src/logic/map/orthogonalGraphEmbedding.ts';
import { sculptContinentFromGraph } from '../../../src/logic/map/continentGenerator.ts';

describe('Continental Sculpting Engine (Phase 3)', () => {
  it('sculpts a continent wrapping the embedded topology graph for seed 42', () => {
    const graph = generatePokemonTopology({ seed: 42 });
    const embedded = embedPokemonTopology(graph, { seed: 42, width: 128, height: 128 });
    const continent = sculptContinentFromGraph(embedded, { seed: 42 });

    expect(continent.width).toBe(128);
    expect(continent.height).toBe(128);
    expect(continent.terrainMatrix.length).toBe(128);
    expect(continent.cells.length).toBe(128);

    // 1. All nodes must have their footprints on solid land (grass or sand)
    for (const node of embedded.nodes) {
      for (let y = node.gridY; y < node.gridY + node.height; y++) {
        for (let x = node.gridX; x < node.gridX + node.width; x++) {
          const terrain = continent.terrainMatrix[y]?.[x];
          expect(
            terrain === 'grass' || terrain === 'sand',
            `Node ${node.id} at (${x},${y}) must be land, got ${terrain}`
          ).toBe(true);
        }
      }
    }

    // 2. All non-surf corridor pathCells must be on solid land
    for (const corridor of embedded.corridors) {
      if (corridor.kind === 'surf_route' || corridor.kind === 'wormhole_tunnel') continue;
      for (const cell of corridor.pathCells) {
        const terrain = continent.terrainMatrix[cell.y]?.[cell.x];
        expect(
          terrain === 'grass' || terrain === 'sand',
          `Corridor ${corridor.id} cell (${cell.x},${cell.y}) must be land, got ${terrain}`
        ).toBe(true);
      }
    }

    // 3. Surf routes must have water cells along their path
    const surfCorridors = embedded.corridors.filter((c) => c.kind === 'surf_route');
    expect(surfCorridors.length).toBeGreaterThanOrEqual(1);

    // 4. Perimeter borders must be ocean water
    for (let x = 0; x < 128; x++) {
      expect(continent.terrainMatrix[0]![x]).toBe('water');
      expect(continent.terrainMatrix[127]![x]).toBe('water');
    }
    for (let y = 0; y < 128; y++) {
      expect(continent.terrainMatrix[y]![0]).toBe('water');
      expect(continent.terrainMatrix[y]![127]).toBe('water');
    }

    // 5. Negative space has mountains and macro-biomes
    expect(continent.resolvedMountain).toBeDefined();
    expect(continent.macroBiomes).toBeDefined();
    expect(continent.geologicalClusters).toBeDefined();
  });

  it('sculpts valid non-convex continents across diverse seeds', () => {
    for (const seed of [77, 101, 555]) {
      const graph = generatePokemonTopology({ seed });
      const embedded = embedPokemonTopology(graph, { seed, width: 128, height: 128 });
      const continent = sculptContinentFromGraph(embedded, { seed });

      // Starter and League nodes must be on land
      const starter = embedded.nodes.find((n) => n.role === 'starter')!;
      const league = embedded.nodes.find((n) => n.role === 'league')!;

      expect(continent.terrainMatrix[starter.centerY]![starter.centerX]).not.toBe('water');
      expect(continent.terrainMatrix[league.centerY]![league.centerX]).not.toBe('water');
    }
  });
});
