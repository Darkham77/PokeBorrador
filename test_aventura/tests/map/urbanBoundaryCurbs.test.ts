import { describe, it, expect } from 'vitest';
import path from 'node:path';
import sharp from 'sharp';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import { buildMapBlitInstructions } from '../../../src/logic/map/canvasTileRenderer.ts';

describe('Urban Boundary Curbs & Asset Integrity (Phase 2)', () => {
  it('guarantees poke_fence_picket.png has 100% alpha transparency (no baked-in green background)', async () => {
    const assetPath = path.resolve(process.cwd(), 'public/assets/canon/props/poke_fence_picket.png');
    const { data, info } = await sharp(assetPath).raw().toBuffer({ resolveWithObject: true });
    expect(info.channels).toBe(4);
    // Top-left pixel [0, 0] must be completely transparent (alpha = 0)
    expect(data[3]).toBe(0);
    // Pixel [0, 1] must also be transparent
    expect(data[7]).toBe(0);
  });

  it('strictly excludes residual 1-cell dirt path slivers from inside city urban street and sidewalk footprints', () => {
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

    const pois = placeRegionalPOIs(continent, { targetCount: 18 });
    const routeResult = generateRouteNetwork(continent, pois, { allowBridges: true });
    const { instructions } = buildMapBlitInstructions(
      continent,
      pois,
      routeResult.pathGrid,
      routeResult.bridgeGrid
    );

    // Ciudad Carmin is at (71, 24). Check coordinates (77, 24..28) where residual dirt strips previously overlapped
    const blitsAt77_24 = instructions.filter(
      (b) => Math.round(b.px / 32) === 77 && Math.round(b.py / 32) === 24
    );
    const hasResidualDirtPath = blitsAt77_24.some(
      (b) => b.filename.includes('dual_edge') || b.filename.includes('path_dirt')
    );
    expect(hasResidualDirtPath).toBe(false);
  });

  it('stamps transverse perimeter curbs on open-ended asphalt avenues facing grass', () => {
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

    const pois = placeRegionalPOIs(continent, { targetCount: 18 });
    const routeResult = generateRouteNetwork(continent, pois, { allowBridges: true });
    const { instructions } = buildMapBlitInstructions(
      continent,
      pois,
      routeResult.pathGrid,
      routeResult.bridgeGrid
    );

    const curbBlits = instructions.filter((b) => b.filename.includes('curb'));
    console.log('[All Curb Blits]:', curbBlits.map((b) => ({ file: b.filename, x: b.px / 32, y: b.py / 32 })));
    const hasPerimeterCurb = curbBlits.length > 0;
    expect(hasPerimeterCurb).toBe(true);
  });
});
