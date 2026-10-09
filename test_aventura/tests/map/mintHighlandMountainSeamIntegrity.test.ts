/**
 * tests/node/map/mintHighlandMountainSeamIntegrity.test.ts
 *
 * Tier 1 Unit Test for Pattern B (Case 1: Seed 615856 at X: 88, Y: 41):
 * Guarantees that macro biomes (mint_highland) do not treat elevated cells
 * of the same biome as foreign, eliminating vertical seam cuts against mountain walls,
 * and that mountain outer corners within mint_highland blit mint grass underlay.
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import { buildMapBlitInstructions } from '../../../src/logic/map/canvasTileRenderer.ts';

describe('mintHighlandMountainSeamIntegrity (Pattern B)', () => {
  it('guarantees seed 615856 at (88, 41) does not resolve to corner_outer_sw against same-biome mountain wall', () => {
    const continent = generateContinentMap({
      seed: 615856,
      width: 128,
      height: 128,
      oceanWaterPercentage: 0.35,
      mountainPercentage: 0.22,
      lakeCount: 3
    });

    expect(continent.resolvedMacroBiomes).toBeDefined();
    const mbCell = continent.resolvedMacroBiomes!.cellDetails[41]?.[88];
    expect(mbCell).toBeDefined();
    expect(mbCell?.biome).toBe('mint_highland');

    // The cell at (88, 41) has mint_highland to its North and East (mountain wall).
    // It should NOT resolve to corner_outer_sw (which has a foreign East border).
    // Instead its only foreign border is West (temperate grass plain), resolving to edge_west.
    expect(mbCell?.role).not.toBe('corner_outer_sw');
    expect(mbCell?.role).toBe('edge_west');
  });

  it('guarantees mountain outer corners within mint_highland blit mint grass underlay instead of plain grass', () => {
    const continent = generateContinentMap({
      seed: 615856,
      width: 128,
      height: 128,
      oceanWaterPercentage: 0.35,
      mountainPercentage: 0.22,
      lakeCount: 3
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 615856 });
    const routes = generateRouteNetwork(continent, pois, { allowBridges: true });
    const { instructions } = buildMapBlitInstructions(continent, pois, routes.pathGrid, routes.bridgeGrid, null);

    // At (89, 41), it is a mountain corner outer nw on height 1 bordering height 0 at (88, 41)
    const mCell = continent.resolvedMountain.cellDetails[41]?.[89];
    expect(mCell).toBeDefined();
    expect(mCell?.role).toBe('corner_outer_nw');

    // Underlay instructions at (89, 41) should include mint grass
    const cellInsts = instructions.filter(
      (inst) => Math.floor(inst.px / 32) === 89 && Math.floor(inst.py / 32) === 41
    );

    const filenames = cellInsts.map((i) => i.filename);
    expect(filenames.some((f) => f.includes('mint'))).toBe(true);
  });
});
