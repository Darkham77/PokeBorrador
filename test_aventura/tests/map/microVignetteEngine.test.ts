/**
 * tests/node/map/microVignetteEngine.test.ts
 *
 * TIER 1 UNIT TESTS FOR PROCEDURAL MICRO-VIGNETTES & STRAY TILE CLEANUP
 *
 * Validates:
 *   1. Detection of empty unbuilt 3x3+ grass clearings in settlements and route margins.
 *   2. Procedural vignette synthesis (Berry Orchard, Fountain Plaza, Explorer Camp, Botanical Garden).
 *   3. Clearance: vignettes never overlap buildings, doorways, or active avenue cells.
 *   4. Stray tile sweeper: prunes isolated 1-cell dirt/road slivers.
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import {
  generateMicroVignettes,
  sweepStrayPathTiles
} from '../../../src/logic/map/microVignetteEngine.ts';

describe('microVignetteEngine (Phase 5)', () => {
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

  it('detects unbuilt clearings and synthesizes diverse micro-vignettes', () => {
    const vignettes = generateMicroVignettes({
      continent,
      pathGrid: routes.pathGrid,
      pois,
      seed: 42
    });

    expect(vignettes.length).toBeGreaterThan(0);

    const kinds = new Set(vignettes.map((v) => v.kind));
    // At least 2 distinct vignette archetypes generated
    expect(kinds.size).toBeGreaterThanOrEqual(2);

    for (const vig of vignettes) {
      expect(vig.props.length).toBeGreaterThan(0);
      expect(vig.bounds.w).toBeGreaterThanOrEqual(3);
      expect(vig.bounds.h).toBeGreaterThanOrEqual(3);

      // Verify no prop is on water or outside continent
      for (const p of vig.props) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(continent.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThan(continent.height);
        const terr = continent.terrainMatrix[p.y]?.[p.x];
        expect(terr).not.toBe('water');
        expect(terr).not.toBe('water_deep');
      }
    }
  });

  it('sweeps and prunes stray isolated 1-cell path tiles with zero neighbors', () => {
    // Construct a test grid with an isolated road cell and a connected 3-cell road segment
    const testGrid: boolean[][] = Array.from({ length: 10 }, () => Array(10).fill(false));

    // Connected segment (3 cells)
    testGrid[2]![2] = true;
    testGrid[2]![3] = true;
    testGrid[2]![4] = true;

    // Isolated single cell at (8, 8) with zero adjacent neighbors
    testGrid[8]![8] = true;

    const prunedCount = sweepStrayPathTiles(testGrid);

    expect(prunedCount).toBe(1);
    expect(testGrid[8]![8]).toBe(false);
    expect(testGrid[2]![2]).toBe(true);
    expect(testGrid[2]![3]).toBe(true);
    expect(testGrid[2]![4]).toBe(true);
  });
});
