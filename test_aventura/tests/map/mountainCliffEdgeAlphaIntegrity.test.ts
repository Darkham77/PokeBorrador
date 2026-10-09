/**
 * tests/node/map/mountainCliffEdgeAlphaIntegrity.test.ts
 *
 * Tier 1 Unit Test for Pattern C (Case 8: Seed 615856 at X: 66, Y: 35..36):
 * Guarantees that mountain cliff edge and corner tiles have alpha transparency
 * without baked-in opaque green grass, and that adjacent higher cliff faces
 * blit as underlay beneath transparent mountain wall edges.
 */

import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import { buildMapBlitInstructions } from '../../../src/logic/map/canvasTileRenderer.ts';

const GRASS_PALETTE_COLORS = [
  '112,200,160', // base green
  '184,224,160', // light grass
  '64,176,136',  // grass shadow
  '160,224,192'  // grass highlight
];

const CLIFF_EDGE_TILES = [
  'poke_cliff_gray_left.png',
  'poke_cliff_gray_corner_bl.png',
  'poke_cliff_gray_right.png',
  'poke_cliff_gray_corner_br.png',
  'poke_cliff_brown_left.png',
  'poke_cliff_brown_corner_bl.png',
  'poke_cliff_brown_right.png',
  'poke_cliff_brown_corner_br.png'
];

describe('mountainCliffEdgeAlphaIntegrity (Pattern C)', () => {
  it('guarantees cliff side edges and bottom foot corners do not contain opaque green grass pixels', async () => {
    for (const filename of CLIFF_EDGE_TILES) {
      const p = path.resolve(process.cwd(), 'public/assets/tiles', filename);
      expect(fs.existsSync(p), `Tile must exist: ${filename}`).toBe(true);

      const { data } = await sharp(p).raw().toBuffer({ resolveWithObject: true });
      let grassPixelCount = 0;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3]!;
        if (a === 0) continue;
        const k = `${data[i]},${data[i + 1]},${data[i + 2]}`;
        if (GRASS_PALETTE_COLORS.includes(k)) {
          grassPixelCount++;
        }
      }

      expect(grassPixelCount, `${filename} should have 0 opaque grass pixels`).toBe(0);
    }
  });

  it('guarantees seed 615856 at (59, 35) blits adjacent higher cliff face as underlay under vertical edge wall', () => {
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

    const cellInsts = instructions.filter(
      (inst) => Math.floor(inst.px / 32) === 59 && Math.floor(inst.py / 32) === 35
    );

    const filenames = cellInsts.map((i) => i.filename);
    const hasFace = filenames.some(f => f.includes('face') && !f.includes('bottom'));
    const hasRightWall = filenames.some(f => f.includes('right'));
    expect(hasFace, 'Must contain face underlay').toBe(true);
    expect(hasRightWall, 'Must contain vertical edge right wall').toBe(true);

    // Face must be blitted BEFORE the transparent side wall
    const faceIdx = filenames.findIndex(f => f.includes('face') && !f.includes('bottom'));
    const wallIdx = filenames.findIndex(f => f.includes('right'));
    expect(faceIdx).toBeLessThan(wallIdx);
  });
});
