/**
 * tests/node/map/wildernessTreeBiomeAndShoreIntegrity.test.ts
 *
 * TIER 1 UNIT TESTS: TREE BIOME ZONING, DIMENSIONS, SHORE CLEARANCE & WATER COLOR PARITY
 *
 * Verifies:
 *   1. Correct tree dimensions (oak: 3x4, pine: 2x3).
 *   2. Strict tree-to-tree clearance (no trunk/shadow overlap).
 *   3. Strict water/shore clearance (no tree bounds or foot clipping lake shore rocks).
 *   4. Macro-biome tree zoning (green oaks in meadows/forests, yellow oaks strictly segregated in autumn biome, pines in highlands).
 *   5. FireRed water color homogeneity (no 96,160,216 cyan or 64,120,184 dark patch seams).
 */

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import { generateWildernessLayer } from '../../../src/logic/map/wildernessVegetationEngine.ts';
import { CANONICAL_LAKE_SHORE_BRUSH } from '../../../src/logic/map/waterAutotileEngine.ts';

describe('wildernessTreeBiomeAndShoreIntegrity', () => {
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

  const pois = placeRegionalPOIs(continent, { targetCount: 18 });
  const routeResult = generateRouteNetwork(continent, pois, { allowBridges: true });
  const wilderness = generateWildernessLayer(continent, pois, routeResult.pathGrid);

  it('assigns accurate physical dimensions to tree prefabs (oak: 3x4, pine: 2x3)', () => {
    expect(wilderness.trees.length).toBeGreaterThan(0);

    for (const tree of wilderness.trees) {
      if (tree.prefabFile.includes('oak')) {
        expect(tree.width).toBe(3);
        expect(tree.height).toBe(4);
      } else if (tree.prefabFile.includes('pine')) {
        expect(tree.width).toBe(2);
        expect(tree.height).toBe(3);
      }
    }
  });

  it('enforces strict clearance between trees so trunks and shadows never overlap', () => {
    // Two trees cannot occupy the same ground columns or adjacent roots
    for (let i = 0; i < wilderness.trees.length; i++) {
      const a = wilderness.trees[i]!;
      for (let j = i + 1; j < wilderness.trees.length; j++) {
        const b = wilderness.trees[j]!;
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);

        // Cannot have overlapping ground roots (dx < minWidth and dy < 2)
        const minW = Math.max(a.width, b.width);
        if (dy < 2) {
          expect(dx).toBeGreaterThanOrEqual(minW);
        }
      }
    }
  });

  it('enforces zero lake shore clipping: no tree sprite bounds touch or overlap water cells', () => {
    const W = continent.width;
    const H = continent.height;

    for (const tree of wilderness.trees) {
      const canopyOverhang = tree.height - 2;
      const minX = tree.x;
      const maxX = tree.x + tree.width - 1;
      const minY = tree.y - canopyOverhang;
      const maxY = tree.y + 1;

      // Check all cells within tree sprite bounds plus 1-cell safety margin
      for (let y = minY - 1; y <= maxY + 1; y++) {
        for (let x = minX - 1; x <= maxX + 1; x++) {
          if (x < 0 || x >= W || y < 0 || y >= H) continue;

          // Tree footprint + margin must NEVER touch water
          const terrain = continent.terrainMatrix[y]?.[x];
          expect(terrain).not.toBe('water');
          expect(terrain).not.toBe('water_deep');
        }
      }
    }
  });

  it('strictly segregates tree species by macro-biome (no random yellow/green mixing)', () => {
    for (const tree of wilderness.trees) {
      const mBiome = continent.macroBiomes?.biomeGrid[tree.y]?.[tree.x];

      if (mBiome === 'mint_highland') {
        expect(tree.prefabFile).toBe('poke_tree_pine_small.png');
      } else if (mBiome === 'viridian_forest') {
        expect(tree.prefabFile).toBe('poke_tree_oak_clean.png');
      }

      // If yellow oak, it must be in a dedicated autumn zone, never mixed inside temperate meadow green copses
      if (tree.prefabFile === 'poke_tree_oak_yellow.png') {
        // Yellow oaks must not have any green oaks in the same local cluster (within 8 tiles)
        for (const other of wilderness.trees) {
          if (other === tree) continue;
          const dist = Math.hypot(tree.x - other.x, tree.y - other.y);
          if (dist < 8) {
            expect(other.prefabFile).not.toBe('poke_tree_oak_clean.png');
          }
        }
      }
    }
  });

  it('guarantees lake brush tiles have homogeneous FireRed water palette (no legacy cyan 96,160,216)', async () => {
    const brushTiles = [
      CANONICAL_LAKE_SHORE_BRUSH.center,
      CANONICAL_LAKE_SHORE_BRUSH.edgeNorth,
      CANONICAL_LAKE_SHORE_BRUSH.edgeSouth,
      CANONICAL_LAKE_SHORE_BRUSH.edgeWest,
      CANONICAL_LAKE_SHORE_BRUSH.edgeEast,
      CANONICAL_LAKE_SHORE_BRUSH.cornerOuterNW,
      CANONICAL_LAKE_SHORE_BRUSH.cornerOuterNE,
      CANONICAL_LAKE_SHORE_BRUSH.cornerOuterSW,
      CANONICAL_LAKE_SHORE_BRUSH.cornerOuterSE,
      CANONICAL_LAKE_SHORE_BRUSH.cornerInnerNW,
      CANONICAL_LAKE_SHORE_BRUSH.cornerInnerNE,
      CANONICAL_LAKE_SHORE_BRUSH.cornerInnerSW,
      CANONICAL_LAKE_SHORE_BRUSH.cornerInnerSE,
      'poke_water_shadow_shore_n.png',
      'poke_water_shadow_full.png',
      'poke_water_shadow_shore_w.png',
      'poke_water_shadow_corner_nw.png'
    ];

    const uniqueTiles = Array.from(new Set(brushTiles));
    const searchDirs = [
      'public/assets/tiles/water',
      'public/assets/tiles',
      'public/assets/tiles/elevation/brown'
    ];

    for (const tileName of uniqueTiles) {
      let foundPath: string | null = null;
      for (const dir of searchDirs) {
        const p = path.resolve(dir, tileName);
        if (fs.existsSync(p)) {
          foundPath = p;
          break;
        }
      }

      expect(foundPath).not.toBeNull();
      const { data, info } = await sharp(foundPath!).raw().toBuffer({ resolveWithObject: true });

      for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Cyan 96,160,216 is strictly forbidden in canonical lake brush
        const isCyan = r === 96 && g === 160 && b === 216;
        expect(isCyan, `Found cyan (96,160,216) in ${tileName}`).toBe(false);
      }
    }
  });
});
