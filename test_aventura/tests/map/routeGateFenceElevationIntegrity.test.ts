/**
 * tests/node/map/routeGateFenceElevationIntegrity.test.ts
 *
 * Tier 1 Unit Test: Guarantees that lateral barrier fences for route gates and dungeon forests
 * do not cross elevation boundaries, climb onto mountain cliffs, or appear on water.
 */

import { describe, it, expect } from 'vitest';
import { generateSettlementLayout, type SettlementTerrainContext } from '../../../src/logic/map/cityLayoutEngine.ts';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import type { POINode } from '../../../src/types/map/poiTypes.ts';

describe('routeGateFenceElevationIntegrity', () => {
  it('stops route_gate lateral barrier fences when encountering an elevation change', () => {
    const gateNode: POINode = {
      id: 'test_gate',
      name: 'Test Gate',
      type: 'route_gate',
      footprint: { width: 6, height: 6 },
      terrainPreference: 'flat_grass',
      gridX: 10,
      gridY: 10,
      elevation: 0,
      facing: 'south'
    };

    // Construct mock context where elevation 1 mountain wall starts at x=7 (3 cells west of gate at x=10)
    const H = 25;
    const W = 25;
    const heightmap: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
    // Set mountain at x <= 8
    for (let y = 0; y < H; y++) {
      for (let x = 0; x <= 8; x++) {
        heightmap[y]![x] = 1;
      }
    }

    const context: SettlementTerrainContext = {
      heightmap,
      terrainMatrix: Array.from({ length: H }, () => Array(W).fill('grass')),
      occupiedFootCells: Array.from({ length: H }, () => Array(W).fill(false)),
      width: W,
      height: H
    };

    const layout = generateSettlementLayout(gateNode, context);
    const fences = layout.props.filter((p) => p.type === 'fence_h');

    expect(fences.length).toBeGreaterThan(0);
    // None of the fences should be at x <= 8 (where height is 1)
    for (const f of fences) {
      expect(heightmap[f.y]![f.x]).toBe(0);
      expect(f.x).toBeGreaterThan(8);
    }
  });

  it('guarantees seed 615856 gate_north_pass has zero fences climbing onto elevation 1 mountain plateau', () => {
    const continent = generateContinentMap({
      seed: 615856,
      width: 128,
      height: 128,
      oceanWaterPercentage: 0.35,
      mountainPercentage: 0.22,
      lakeCount: 3
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 615856 });
    const gateNorthPass = pois.find((p) => p.id === 'gate_north_pass');
    expect(gateNorthPass).toBeDefined();

    const fences = gateNorthPass!.urbanLayout?.props.filter((p) => p.type === 'fence_h') ?? [];
    expect(fences.length).toBeGreaterThan(0);

    for (const f of fences) {
      const elev = continent.heightmap[f.y]?.[f.x] ?? 0;
      const isFoot = continent.resolvedMountain.occupiedFootCells[f.y]?.[f.x] ?? false;
      expect(elev).toBe(gateNorthPass!.elevation);
      expect(isFoot).toBe(false);
    }
  });
});
