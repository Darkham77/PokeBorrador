/**
 * test_aventura/tests/map/maritimeBarrierIntegrity.test.ts
 *
 * TIER 1 RED-TO-GREEN TEST: FIRERED MARITIME ROCK ASSETS & COASTAL HERMETIC SEALING
 *
 * Verifies:
 * 1. Maritime rock sprites (`poke_water_rocks_calm.png`, `poke_water_rock_foam.png`) are clean 32x32 transparent sprites (not cropped corners with opaque water/white backgrounds).
 * 2. Yellow oak tree (`poke_tree_oak_yellow.png`) has transparent bottom corners (no baked rectangular dirt carpet).
 * 3. Wood vertical fence asset referenced by gate barriers exists on disk and resolves via resolveAssetWebPath.
 * 4. Across seeds [42, 100, 2305, 777, 999] and map sizes [128, 256, 400], maritime rocks hermetically seal the navigable coastal sea from map borders and never spawn inside inland freshwater lakes.
 */

import fs from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';
import { describe, it, expect } from 'vitest';

import { resolveAssetWebPath } from '../../logic/map/assetWebPathResolver.ts';
import { executeRegionalGenerationJob } from '../../logic/map/continentGenerator.worker.ts';
import { floodFillGrid, type GridPoint } from '../../logic/utils/gridBfsUtils.ts';

const ROOT_DIR = process.cwd();
const EXPECTED_TILE_PX = 32;
const EXPECTED_OAK_WIDTH_PX = 96;
const EXPECTED_OAK_HEIGHT_PX = 128;
const ALPHA_CHANNEL_OFFSET = 3;
const RGBA_STRIDE = 4;
const OPAQUE_ALPHA_THRESHOLD = 200;

const TEST_SEEDS = [42, 100, 2305, 777, 999] as const;
const TEST_DIMENSIONS = [128, 256, 400] as const;
const MULTI_SEED_TEST_TIMEOUT_MS = 240_000 as const;

const MARITIME_ROCK_FILES = [
  'test_aventura/assets/prefabs/water/poke_water_rocks_calm.png',
  'test_aventura/assets/tiles/poke_water_rocks_calm.png',
  'test_aventura/assets/tiles/elevation/brown/poke_water_rock_foam.png',
  'test_aventura/assets/tiles/elevation/gray/poke_water_rock_foam.png',
  'test_aventura/assets/tiles/elevation/rock_tier/poke_water_rock_foam.png'
] as const;

const YELLOW_OAK_FILES = [
  'test_aventura/assets/essentials/prefabs/vegetation/poke_tree_oak_yellow.png',
  'test_aventura/assets/prefabs/poke_tree_oak_yellow.png',
  'test_aventura/assets/prefabs/vegetation/poke_tree_oak_yellow.png'
] as const;

function computeOceanMask(
  terrainMatrix: readonly (readonly string[])[],
  width: number,
  height: number
): boolean[][] {
  const ocean: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
  const queue: GridPoint[] = [];
  const isWater = (x: number, y: number): boolean => {
    const t = terrainMatrix[y]?.[x];
    return t === 'water' || t === 'water_deep';
  };

  for (let x = 0; x < width; x++) {
    if (isWater(x, 0) && !ocean[0]![x]) {
      ocean[0]![x] = true;
      queue.push({ x, y: 0 });
    }
    if (isWater(x, height - 1) && !ocean[height - 1]![x]) {
      ocean[height - 1]![x] = true;
      queue.push({ x, y: height - 1 });
    }
  }
  for (let y = 0; y < height; y++) {
    if (isWater(0, y) && !ocean[y]![0]) {
      ocean[y]![0] = true;
      queue.push({ x: 0, y });
    }
    if (isWater(width - 1, y) && !ocean[y]![width - 1]) {
      ocean[y]![width - 1] = true;
      queue.push({ x: width - 1, y });
    }
  }

  floodFillGrid(queue, ocean, width, height, isWater);
  return ocean;
}

describe('FireRed Maritime Rock Assets & Coastal Hermetic Sealing', () => {
  it('ensures maritime rock sprites are clean 32x32 assets with transparent outer corners and centered rock pixels', async () => {
    for (const relPath of MARITIME_ROCK_FILES) {
      const fullPath = path.resolve(ROOT_DIR, relPath);
      expect(fs.existsSync(fullPath), `Missing maritime rock asset: ${relPath}`).toBe(true);

      const { data, info } = await sharp(fullPath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      expect(info.width, `${relPath} width must be 32px`).toBe(EXPECTED_TILE_PX);
      expect(info.height, `${relPath} height must be 32px`).toBe(EXPECTED_TILE_PX);

      const corners = [
        0,
        (info.width - 1) * RGBA_STRIDE,
        (info.height - 1) * info.width * RGBA_STRIDE,
        ((info.height - 1) * info.width + (info.width - 1)) * RGBA_STRIDE
      ] as const;

      for (const offset of corners) {
        expect(
          data[offset + ALPHA_CHANNEL_OFFSET],
          `${relPath} outer corner must be transparent`
        ).toBe(0);
      }

      let centerOpaquePixels = 0;
      for (let y = 8; y < 24; y++) {
        for (let x = 8; x < 24; x++) {
          const alpha = data[(y * info.width + x) * RGBA_STRIDE + ALPHA_CHANNEL_OFFSET] ?? 0;
          if (alpha >= OPAQUE_ALPHA_THRESHOLD) centerOpaquePixels++;
        }
      }
      expect(
        centerOpaquePixels,
        `${relPath} must have centered opaque rock pixels`
      ).toBeGreaterThan(20);
    }
  });

  it('ensures yellow oak sprites have transparent bottom outer corners (no baked rectangular dirt carpet)', async () => {
    for (const relPath of YELLOW_OAK_FILES) {
      const fullPath = path.resolve(ROOT_DIR, relPath);
      expect(fs.existsSync(fullPath), `Missing yellow oak asset: ${relPath}`).toBe(true);

      const { data, info } = await sharp(fullPath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      expect(info.width, `${relPath} width`).toBe(EXPECTED_OAK_WIDTH_PX);
      expect(info.height, `${relPath} height`).toBe(EXPECTED_OAK_HEIGHT_PX);

      const bottomLeftAlpha =
        data[(info.height - 1) * info.width * RGBA_STRIDE + ALPHA_CHANNEL_OFFSET] ?? 255;
      const bottomRightAlpha =
        data[
          ((info.height - 1) * info.width + (info.width - 1)) * RGBA_STRIDE + ALPHA_CHANNEL_OFFSET
        ] ?? 255;

      expect(bottomLeftAlpha, `${relPath} bottom-left corner must be transparent`).toBe(0);
      expect(bottomRightAlpha, `${relPath} bottom-right corner must be transparent`).toBe(0);
    }
  });

  it('resolves poke_fence_wood_v.png and distinct shallow/deep water tiles + transition overlays cleanly', () => {
    const resolved = resolveAssetWebPath('poke_fence_wood_v.png');
    expect(resolved, 'poke_fence_wood_v.png must resolve in assetFilesIndex').toBeDefined();
    const relFromRoot = resolved!.replace(/^\/+/, '');
    const diskPath = path.resolve(ROOT_DIR, relFromRoot);
    expect(fs.existsSync(diskPath), `Resolved asset missing on disk: ${diskPath}`).toBe(true);

    const shallowBuf = fs.readFileSync(
      path.resolve(ROOT_DIR, 'test_aventura/assets/tiles/water/poke_water_ocean_center.png')
    );
    const deepBuf = fs.readFileSync(
      path.resolve(ROOT_DIR, 'test_aventura/assets/tiles/water/poke_water_deep.png')
    );
    expect(
      shallowBuf.equals(deepBuf),
      'Shallow navigable ocean tile must remain visually distinct from dark water_deep tile'
    ).toBe(false);

    const deepOverlays = [
      'poke_water_deep_edge_n.png',
      'poke_water_deep_edge_s.png',
      'poke_water_deep_edge_w.png',
      'poke_water_deep_edge_e.png',
      'poke_water_deep_corner_tl.png',
      'poke_water_deep_corner_tr.png',
      'poke_water_deep_corner_bl.png',
      'poke_water_deep_corner_br.png',
      'poke_water_deep_inner_tl.png',
      'poke_water_deep_inner_tr.png',
      'poke_water_deep_inner_bl.png',
      'poke_water_deep_inner_br.png'
    ];
    for (const overlayName of deepOverlays) {
      const overlayUrl = resolveAssetWebPath(overlayName);
      expect(overlayUrl, `${overlayName} must resolve in assetFilesIndex`).toBeDefined();
      const overlayDisk = path.resolve(ROOT_DIR, overlayUrl!.replace(/^\/+/, ''));
      expect(fs.existsSync(overlayDisk), `${overlayName} missing on disk`).toBe(true);
    }
  });

  it(
    'hermetically seals coastal surfable water from map borders and places zero sea rocks in inland lakes across 128/256/400',
    () => {
      for (const dim of TEST_DIMENSIONS) {
        for (const seed of TEST_SEEDS) {
          const result = executeRegionalGenerationJob({ width: dim, height: dim, seed });
          const W = result.continent.width;
          const H = result.continent.height;
          const rocks = result.routeNetwork.maritimeRockObstacles ?? [];
          expect(
            rocks.length,
            `dim=${dim} seed=${seed} should generate maritime rocks`
          ).toBeGreaterThan(0);

          const oceanMask = computeOceanMask(result.continent.terrainMatrix, W, H);
          const rockSet = new Set<string>();
          let deepOceanCount = 0;
          let deepTransitionOverlayCount = 0;
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              if (oceanMask[y]?.[x] && result.continent.terrainMatrix[y]?.[x] === 'water_deep') {
                deepOceanCount++;
                const stack = result.continent.cells[y]?.[x]?.layerStack ?? [];
                if (stack.some((tile) => tile.startsWith('poke_water_deep_'))) {
                  deepTransitionOverlayCount++;
                }
              }
            }
          }
          expect(
            deepOceanCount,
            `dim=${dim} seed=${seed} must include natural non-navigable water_deep ocean limits`
          ).toBeGreaterThan(0);
          expect(
            deepTransitionOverlayCount,
            `dim=${dim} seed=${seed} must apply FireRed rounded transition overlays along water_deep borders`
          ).toBeGreaterThan(0);

          for (const r of rocks) {
            expect(
              oceanMask[r.y]?.[r.x],
              `dim=${dim} seed=${seed} sea rock at (${r.x},${r.y}) must be in ocean, not inland lake`
            ).toBe(true);
            rockSet.add(`${r.x}_${r.y}`);
          }

          // BFS from every shallow coastal water cell adjacent to playable shore through Surfable shallow `'water'`
          // Blocked by non-navigable `'water_deep'`, maritime rocks, bridges, and land. Must NEVER reach map border.
          const visited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
          const queue: GridPoint[] = [];

          for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
              if (
                !oceanMask[y]![x] ||
                result.continent.terrainMatrix[y]?.[x] !== 'water' ||
                rockSet.has(`${x}_${y}`)
              ) {
                continue;
              }
              const touchesShore =
                !oceanMask[y - 1]![x] ||
                !oceanMask[y + 1]![x] ||
                !oceanMask[y]![x - 1] ||
                !oceanMask[y]![x + 1];
              if (touchesShore) {
                visited[y]![x] = true;
                queue.push({ x, y });
              }
            }
          }

          expect(
            queue.length,
            `dim=${dim} seed=${seed} must have coastal water cells`
          ).toBeGreaterThan(0);

          floodFillGrid(queue, visited, W, H, (nx, ny) => {
            if (!oceanMask[ny]?.[nx]) return false;
            if (result.continent.terrainMatrix[ny]?.[nx] !== 'water') return false;
            if (rockSet.has(`${nx}_${ny}`)) return false;
            if (result.routeNetwork.bridgeGrid[ny]?.[nx]) return false;
            return true;
          });

          let escapedToBorder = false;
          for (let x = 0; x < W; x++) {
            if (visited[0]![x] || visited[H - 1]![x]) escapedToBorder = true;
          }
          for (let y = 0; y < H; y++) {
            if (visited[y]![0] || visited[y]![W - 1]) escapedToBorder = true;
          }

          expect(
            escapedToBorder,
            `dim=${dim} seed=${seed} coastal surf water escaped to map border without sea rock sealing`
          ).toBe(false);
        }
      }
    },
    MULTI_SEED_TEST_TIMEOUT_MS
  );
});
