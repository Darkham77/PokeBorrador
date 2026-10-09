/**
 * tests/node/map/macroBiomePathAndMountainCorners.test.ts
 *
 * TIER 1 UNIT TESTS: PATTERN 3 - MACRO BIOME PATH & MOUNTAIN CORNER INTEGRITY
 *
 * Validates:
 *   1. Mountain outer corner tiles (corner_tl, corner_tr) have transparent background without residual grass pixels.
 *   2. Dirt path transition tiles have transparent background instead of opaque green grass.
 *   3. CanvasTileRenderer Step 1 uses ground-level base terrain (grass / macro biome) for mountain outer corners bordering elevation 0.
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
  '112,200,160', // base grass
  '184,224,160', // light grass
  '64,176,136',  // grass blade shadow
  '160,224,192'  // grass blade highlight
];

describe('Pattern 3: Macro Biome Path & Mountain Corner Transparency', () => {
  it('guarantees dirt path transition tiles in public/assets/tiles do not contain opaque grass pixels', async () => {
    const pathTransitionTiles = [
      'poke_path_dirt_edge_n.png',
      'poke_path_dirt_edge_s.png',
      'poke_path_dirt_edge_w.png',
      'poke_path_dirt_edge_e.png',
      'poke_path_dirt_corner_outer_nw.png',
      'poke_path_dirt_corner_outer_ne.png',
      'poke_path_dirt_corner_outer_sw.png',
      'poke_path_dirt_corner_outer_se.png',
      'poke_path_dirt_corner_inner_nw.png',
      'poke_path_dirt_corner_inner_ne.png',
      'poke_path_dirt_corner_inner_sw.png',
      'poke_path_dirt_corner_inner_se.png',
      'poke_path_dirt_dual_edge_h.png',
      'poke_path_dirt_dual_edge_v.png'
    ];

    for (const tileName of pathTransitionTiles) {
      const p = path.resolve(process.cwd(), 'public/assets/tiles', tileName);
      expect(fs.existsSync(p), `Tile file should exist: ${tileName}`).toBe(true);

      const img = await sharp(p).raw().toBuffer({ resolveWithObject: true });
      let grassCount = 0;
      for (let i = 0; i < img.data.length; i += 4) {
        const a = img.data[i + 3]!;
        if (a === 0) continue;
        const k = `${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`;
        if (GRASS_PALETTE_COLORS.includes(k)) {
          grassCount++;
        }
      }
      expect(grassCount, `Tile ${tileName} should not contain opaque grass pixels`).toBe(0);
    }
  });

  it('guarantees mountain outer corner tiles do not contain opaque grass or orphaned blade pixels', async () => {
    const cornerTiles = [
      'poke_cliff_brown_corner_tl.png',
      'poke_cliff_brown_corner_tr.png',
      'poke_cliff_gray_corner_tl.png',
      'poke_cliff_gray_corner_tr.png'
    ];

    for (const tileName of cornerTiles) {
      const p = path.resolve(process.cwd(), 'public/assets/tiles', tileName);
      expect(fs.existsSync(p), `Tile file should exist: ${tileName}`).toBe(true);

      const img = await sharp(p).raw().toBuffer({ resolveWithObject: true });
      let grassCount = 0;
      for (let i = 0; i < img.data.length; i += 4) {
        const a = img.data[i + 3]!;
        if (a === 0) continue;
        const k = `${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`;
        if (GRASS_PALETTE_COLORS.includes(k)) {
          grassCount++;
        }
      }
      expect(grassCount, `Tile ${tileName} should have 0 grass/blade pixels`).toBe(0);
    }
  });

  it('ensures canvasTileRenderer blits ground terrain under mountain outer corners bordering elevation 0', () => {
    const cont = generateContinentMap({
      seed: 42,
      width: 128,
      height: 128,
      oceanWaterPercentage: 0.35,
      mountainPercentage: 0.22,
      lakeCount: 3
    });
    const pois = placeRegionalPOIs(cont, { targetCount: 18, seed: 42 });
    const routes = generateRouteNetwork(cont, pois, { allowBridges: true });
    const { instructions } = buildMapBlitInstructions(cont, pois, routes.pathGrid, routes.bridgeGrid, null);

    // Look for mountain outer corners bordering elevation 0 (e.g. at 33, 49)
    const mCell = cont.resolvedMountain.cellDetails[49]?.[33];
    expect(mCell).toBeDefined();
    expect(mCell?.role).toBe('corner_outer_nw');

    // Filter instructions for (33, 49)
    const cellInsts = instructions.filter(
      (inst) => Math.floor(inst.px / 32) === 33 && Math.floor(inst.py / 32) === 49
    );

    // First instruction (Layer 1 base terrain) should NOT be plateau_rock
    const baseTile = cellInsts[0]?.filename;
    expect(baseTile).toBeDefined();
    expect(baseTile).not.toContain('plateau_rock');
    expect(baseTile).toBe('poke_grass_plain.png');
  });
});
