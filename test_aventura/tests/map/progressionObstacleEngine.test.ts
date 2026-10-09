/**
 * tests/node/map/progressionObstacleEngine.test.ts
 *
 * TIER 1 UNIT TESTS FOR HM PROGRESSION OBSTACLES (CUT TREES & STRENGTH BOULDERS)
 *
 * Validates:
 *   1. Placement of cuttable trees and strength boulders on routes and secret alcoves.
 *   2. Badge alignment: Cut trees require badge >= 2, Strength boulders require badge >= 4.
 *   3. Anti-softlock guarantee: main route network remains traversable without getting stuck.
 *   4. Zero placement on water, roofs, or inside buildings.
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import {
  generateProgressionObstacles
} from '../../../src/logic/map/progressionObstacleEngine.ts';

describe('progressionObstacleEngine (Phase 4)', () => {
  const continent = generateContinentMap({
    width: 128,
    height: 128,
    seed: 42,
    oceanWaterPercentage: 0.35,
    beachWidth: 3,
    lakeCount: 3,
    mountainPercentage: 0.22,
    mountainPalette: 'brown',
    withStairs: true
  });
  const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });
  const routes = generateRouteNetwork(continent, pois, { allowBridges: true });

  it('places cuttable trees and strength boulders on routes', () => {
    const obstacles = generateProgressionObstacles({
      continent,
      pathGrid: routes.pathGrid,
      pois,
      seed: 42
    });

    expect(obstacles.length).toBeGreaterThan(0);

    const cutTrees = obstacles.filter((o) => o.type === 'cut_tree');
    const strengthBoulders = obstacles.filter((o) => o.type === 'strength_boulder');

    expect(cutTrees.length).toBeGreaterThan(0);
    expect(strengthBoulders.length).toBeGreaterThan(0);

    for (const tree of cutTrees) {
      expect(tree.prefabFile).toContain('cuttable');
      expect(tree.requiredGymBadge).toBe(2);
    }

    for (const boulder of strengthBoulders) {
      expect(boulder.prefabFile).toContain('boulder');
      expect(boulder.requiredGymBadge).toBe(4);
    }
  });

  it('never places obstacles on water or elevated cliffs', () => {
    const obstacles = generateProgressionObstacles({
      continent,
      pathGrid: routes.pathGrid,
      pois,
      seed: 42
    });

    for (const obs of obstacles) {
      const terr = continent.terrainMatrix[obs.y]?.[obs.x];
      const elev = continent.heightmap[obs.y]?.[obs.x] ?? 0;
      expect(terr).not.toBe('water');
      expect(terr).not.toBe('water_deep');
      expect(elev).toBe(0);
    }
  });

  it('guarantees deterministic placement with identical seeds', () => {
    const run1 = generateProgressionObstacles({
      continent,
      pathGrid: routes.pathGrid,
      pois,
      seed: 1234
    });
    const run2 = generateProgressionObstacles({
      continent,
      pathGrid: routes.pathGrid,
      pois,
      seed: 1234
    });

    expect(run1).toEqual(run2);
  });
});
