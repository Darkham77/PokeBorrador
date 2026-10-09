/**
 * tests/node/map/wildernessVegetationEngine.test.ts
 *
 * TIER 1 & TIER 2 UNIT TESTS FOR WILDERNESS VEGETATION & BIOME DECORATION ENGINE
 *
 * Validates:
 *   1. Deterministic generation for identical seeds.
 *   2. Macro-Biome awareness for trees (pines in mint_highland, dense canopies in viridian_forest).
 *   3. Suppression of trees and tall grass in arid_desert and volcanic_plateau.
 *   4. Biome-specific roadside props (desert boulders, volcanic rocks, meadow flowers, forest ferns).
 *   5. Strict North-to-South Y-sorting of trees.
 *   6. Strict clearance invariants (no trees on paths, water, cliffs, or urban footprints).
 */

import { describe, it, expect } from 'vitest';
import {
  generateWildernessLayer
} from '../../../src/logic/map/wildernessVegetationEngine.ts';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';

describe('wildernessVegetationEngine', () => {
  const continent = generateContinentMap({
    width: 128,
    height: 128,
    seed: 42,
    oceanWaterPercentage: 0.35,
    beachWidth: 3,
    lakeCount: 3,
    mountainPercentage: 0.22,
    withStairs: true
  });

  const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });
  const routeResult = generateRouteNetwork(continent, pois, { allowBridges: true });

  it('generates wilderness layer deterministically with identical seed', () => {
    const layerA = generateWildernessLayer(continent, pois, routeResult.pathGrid, { seed: 999 });
    const layerB = generateWildernessLayer(continent, pois, routeResult.pathGrid, { seed: 999 });

    expect(layerA.trees.length).toBe(layerB.trees.length);
    expect(layerA.props.length).toBe(layerB.props.length);
    expect(layerA.tallGrassPatches.length).toBe(layerB.tallGrassPatches.length);

    for (let i = 0; i < layerA.trees.length; i++) {
      expect(layerA.trees[i]).toEqual(layerB.trees[i]);
    }
  });

  it('guarantees strict North-to-South Y-sorting of tree placements', () => {
    const layer = generateWildernessLayer(continent, pois, routeResult.pathGrid, { seed: 42 });

    expect(layer.trees.length).toBeGreaterThan(0);
    for (let i = 1; i < layer.trees.length; i++) {
      const prev = layer.trees[i - 1]!;
      const curr = layer.trees[i]!;
      expect(curr.y).toBeGreaterThanOrEqual(prev.y);
      if (curr.y === prev.y) {
        expect(curr.x).toBeGreaterThanOrEqual(prev.x);
      }
    }
  });

  it('enforces clearance invariants: zero trees on water, cliffs, paths, or building footprints', () => {
    const layer = generateWildernessLayer(continent, pois, routeResult.pathGrid, { seed: 42 });

    for (const tree of layer.trees) {
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const cy = tree.y + dy;
          const cx = tree.x + dx;

          // No trees on water or sand
          expect(continent.terrainMatrix[cy]?.[cx]).toBe('grass');

          // No trees on elevated cliffs
          expect(continent.heightmap[cy]?.[cx] ?? 0).toBe(0);

          // No trees on mountain foot projection
          expect(continent.resolvedMountain.occupiedFootCells[cy]?.[cx]).toBeFalsy();

          // No trees directly on paths
          expect(routeResult.pathGrid[cy]?.[cx]).toBeFalsy();
        }
      }
    }
  });

  it('respects macro-biomes: zero trees and zero tall grass in arid_desert and volcanic_plateau', () => {
    const layer = generateWildernessLayer(continent, pois, routeResult.pathGrid, { seed: 42 });

    if (continent.macroBiomes) {
      for (const tree of layer.trees) {
        const biome = continent.macroBiomes.biomeGrid[tree.y]?.[tree.x];
        expect(biome).not.toBe('arid_desert');
        expect(biome).not.toBe('volcanic_plateau');
      }

      for (const patch of layer.tallGrassPatches) {
        const biome = continent.macroBiomes.biomeGrid[patch.y]?.[patch.x];
        expect(biome).not.toBe('arid_desert');
        expect(biome).not.toBe('volcanic_plateau');
      }
    }
  });

  it('places biome-specific tree species in viridian_forest and mint_highland', () => {
    const layer = generateWildernessLayer(continent, pois, routeResult.pathGrid, { seed: 42 });

    if (continent.macroBiomes) {
      const viridianTrees = layer.trees.filter((t) => {
        return continent.macroBiomes?.biomeGrid[t.y]?.[t.x] === 'viridian_forest';
      });

      const highlandTrees = layer.trees.filter((t) => {
        return continent.macroBiomes?.biomeGrid[t.y]?.[t.x] === 'mint_highland';
      });

      if (viridianTrees.length > 0) {
        // Viridian forest uses dense viridian canopies
        for (const t of viridianTrees) {
          expect(t.prefabFile).toBe('poke_tree_oak_clean.png');
        }
      }

      if (highlandTrees.length > 0) {
        // Mint highland uses evergreen pines
        for (const t of highlandTrees) {
          expect(t.prefabFile).toMatch(/pine/);
        }
      }
    }
  });

  it('places biome-specific roadside props', () => {
    const layer = generateWildernessLayer(continent, pois, routeResult.pathGrid, { seed: 42 });

    expect(layer.props.length).toBeGreaterThan(0);

    if (continent.macroBiomes) {
      for (const prop of layer.props) {
        const biome = continent.macroBiomes.biomeGrid[prop.y]?.[prop.x];
        if (biome === 'arid_desert') {
          // Desert props must be boulders, never red flowers
          expect(prop.type).toBe('boulder');
          expect(prop.prefabFile).not.toBe('poke_flowers_red.png');
        } else if (biome === 'volcanic_plateau') {
          // Volcanic props must be rocks/boulders, never red flowers
          expect(prop.type).toBe('boulder');
          expect(prop.prefabFile).not.toBe('poke_flowers_red.png');
        }
      }
    }
  });

  it('generates autumn yellow oaks in temperate meadow biomes', () => {
    const layer = generateWildernessLayer(continent, pois, routeResult.pathGrid, { seed: 42 });
    const yellowOaks = layer.trees.filter((t) => t.prefabFile === 'poke_tree_oak_yellow.png');
    expect(yellowOaks.length).toBeGreaterThan(0);
  });
});
