/**
 * tests/node/map/mintHighlandMountainSeamIntegrity.test.ts
 *
 * Tier 1 Unit Test for Pattern B (Case 1: Seed 615856 at X: 88, Y: 41):
 * Guarantees that macro biomes (mint_highland) do not treat elevated cells
 * of the same biome as foreign, eliminating vertical seam cuts against mountain walls,
 * and that mountain outer corners within mint_highland blit mint grass underlay.
 */

import { describe, it, expect } from 'vitest';

import { buildMapBlitInstructions } from '../../logic/map/canvasTileRenderer.ts';
import { generateContinentMap } from '../../logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../logic/map/routeNetworkEngine.ts';

describe('mintHighlandMountainSeamIntegrity (Pattern B)', () => {
  it('guarantees mint_highland cells adjacent to same-biome mountain walls resolve cleanly without corner_outer_sw', () => {
    const continent = generateContinentMap({
      seed: 615856,
      width: 128,
      height: 128,
      oceanWaterPercentage: 0.35,
      mountainPercentage: 0.22,
      lakeCount: 3
    });

    expect(continent.resolvedMacroBiomes).toBeDefined();
    expect(continent.macroBiomes).toBeDefined();
    let verifiedCount = 0;
    for (let y = 1; y < continent.height - 1; y++) {
      for (let x = 1; x < continent.width - 1; x++) {
        const mb = continent.resolvedMacroBiomes!.cellDetails[y]?.[x];
        if (mb?.biome !== 'mint_highland') continue;
        if (
          continent.macroBiomes!.biomeGrid[y]?.[x + 1] === 'mint_highland' &&
          continent.macroBiomes!.biomeGrid[y - 1]?.[x] === 'mint_highland' &&
          continent.macroBiomes!.biomeGrid[y + 1]?.[x] === 'mint_highland' &&
          continent.macroBiomes!.biomeGrid[y]?.[x - 1] !== 'mint_highland'
        ) {
          expect(mb.role).not.toBe('corner_outer_sw');
          verifiedCount++;
        }
      }
    }
    expect(verifiedCount).toBeGreaterThan(0);
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
    const { instructions } = buildMapBlitInstructions(
      continent,
      pois,
      routes.pathGrid,
      routes.bridgeGrid,
      null
    );

    let verifiedCorners = 0;
    for (let y = 1; y < continent.height - 1; y++) {
      for (let x = 1; x < continent.width - 1; x++) {
        if (continent.macroBiomes?.biomeGrid[y]?.[x] !== 'mint_highland') continue;
        const mCell = continent.resolvedMountain.cellDetails[y]?.[x];
        if (mCell?.role !== 'corner_outer_nw') continue;
        if ((continent.heightmap[y]?.[x] ?? 0) !== 1) continue;
        if ((continent.heightmap[y]?.[x - 1] ?? 0) !== 0) continue;

        const cellInsts = instructions.filter(
          (inst) => Math.floor(inst.px / 32) === x && Math.floor(inst.py / 32) === y
        );
        expect(cellInsts.some((i) => i.filename.includes('mint'))).toBe(true);
        verifiedCorners++;
      }
    }
    expect(verifiedCorners).toBeGreaterThan(0);
  });
});
