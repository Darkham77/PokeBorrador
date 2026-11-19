/**
 * tests/node/map/mountainCliffEdgeAlphaIntegrity.test.ts
 *
 * Tier 1 Unit Test for Pattern C (Case 8: Seed 615856 at X: 66, Y: 35..36):
 * Guarantees that mountain cliff edge and corner tiles have alpha transparency
 * without baked-in opaque green grass, and that adjacent higher cliff faces
 * blit as underlay beneath transparent mountain wall edges.
 */

import fs from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';
import { describe, it, expect } from 'vitest';

import { buildMapBlitInstructions } from '../../logic/map/canvasTileRenderer.ts';
import { generateContinentMap } from '../../logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../logic/map/routeNetworkEngine.ts';

const GRASS_PALETTE_COLORS = [
  '112,200,160', // base green
  '184,224,160', // light grass
  '64,176,136', // grass shadow
  '160,224,192' // grass highlight
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
      const p = path.resolve(process.cwd(), 'test_aventura/assets/tiles', filename);
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

  it('guarantees vertical wall edges adjacent to higher cliff faces blit face underlay beneath wall', () => {
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

    // Locate any cell where a projected south cliff face underlays a vertical side wall
    const byTile = new Map<string, string[]>();
    for (const inst of instructions) {
      const key = `${Math.floor(inst.px / 32)}_${Math.floor(inst.py / 32)}`;
      const list = byTile.get(key) ?? [];
      list.push(inst.filename);
      byTile.set(key, list);
    }

    let verifiedPairs = 0;
    for (const [, filenames] of byTile) {
      const faceIdx = filenames.findIndex((f) => f.includes('_face'));
      const wallIdx = filenames.findIndex(
        (f) => f.startsWith('poke_cliff_') && (f.endsWith('_right.png') || f.endsWith('_left.png'))
      );
      if (faceIdx !== -1 && wallIdx !== -1) {
        expect(faceIdx).toBeLessThan(wallIdx);
        verifiedPairs++;
      }
    }
    expect(verifiedPairs).toBeGreaterThan(0);
  });
});
