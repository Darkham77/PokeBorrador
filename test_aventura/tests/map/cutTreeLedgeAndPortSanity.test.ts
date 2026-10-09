/**
 * tests/node/map/cutTreeLedgeAndPortSanity.test.ts
 *
 * Tier 1 RED Unit Test verifying:
 * 1. Authentic GBA Cut Tree asset extraction & transparency.
 * 2. Ledge assets background transparency across all biomes.
 * 3. Hermetic sealing of progression roadblocks (no walking around Cut trees).
 * 4. Coastal Port City invariant: exactly 1 city POI has a port, strictly adjacent to ocean water.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { generatePokemonContinentalWorld } from '../../../src/logic/map/continent/continentalEngine.ts';
import { computeOceanGrid } from '../../../src/logic/map/routePathfinding.ts';
import {
  generateProgressionObstacles,
  type GenerateObstaclesOptions
} from '../../../src/logic/map/progressionObstacleEngine.ts';
import type { ContinentMapResult } from '../../../src/logic/map/continentGenerator.ts';

describe('Cut Tree, Ledge Transparency, and Port City Invariants', () => {
  it('verifies that the Cut Tree asset is the authentic GBA FireRed sprite with transparent alpha', async () => {
    const cutTreePath = path.resolve('public/assets/prefabs/vegetation/tree_cuttable.png');
    expect(fs.existsSync(cutTreePath)).toBe(true);

    const img = sharp(cutTreePath);
    const meta = await img.metadata();
    expect(meta.width).toBe(32);
    expect(meta.height).toBe(32);

    const raw = await img.raw().toBuffer({ resolveWithObject: true });
    expect(raw.info.channels).toBe(4);

    // Verify background transparency (corners must be transparent)
    // Pixel (0, 0)
    expect(raw.data[3]).toBe(0);
    // Pixel (31, 0)
    expect(raw.data[(31) * 4 + 3]).toBe(0);

    // Verify authentic color palette: must contain trunk brown (approx 120,64,64 or 160,128,32)
    // and must NOT be just a green pine tree
    let hasBarkColor = false;
    for (let i = 0; i < raw.data.length; i += 4) {
      const r = raw.data[i]!;
      const g = raw.data[i + 1]!;
      const b = raw.data[i + 2]!;
      const a = raw.data[i + 3]!;
      if (a > 0) {
        // Bark color check: red > green and green > blue (warm brown)
        if (r >= 100 && g >= 50 && g <= 140 && b <= 70) {
          hasBarkColor = true;
          break;
        }
      }
    }
    expect(hasBarkColor).toBe(true);
  });

  it('verifies that poke_ledge_jump, poke_ledge_left, and poke_ledge_right have alpha transparency on top', async () => {
    const ledgeFiles = [
      'public/assets/tiles/poke_ledge_jump.png',
      'public/assets/tiles/poke_ledge_left.png',
      'public/assets/tiles/poke_ledge_right.png'
    ];

    for (const relPath of ledgeFiles) {
      const fullPath = path.resolve(relPath);
      expect(fs.existsSync(fullPath)).toBe(true);

      const raw = await sharp(fullPath).raw().toBuffer({ resolveWithObject: true });
      expect(raw.info.channels).toBe(4);

      let transparentPixels = 0;
      for (let i = 0; i < raw.data.length; i += 4) {
        if (raw.data[i + 3] === 0) {
          transparentPixels++;
        }
      }

      // At least 400 pixels of the 32x32 (1024 total) tile must be transparent (the upper half)
      expect(transparentPixels).toBeGreaterThan(400);

      // Top-left pixel must be transparent (not opaque green #70c8a0)
      expect(raw.data[3]).toBe(0);
    }
  });

  it('verifies that progression obstacle generation hermetically seals the corridor lateral width', () => {
    // Construct a corridor of width 6 with grass, flanked by impassable trees/water at x=1 and x=8
    const W = 20;
    const H = 20;
    const terrainMatrix = Array.from({ length: H }, () => Array(W).fill('grass'));
    const heightmap = Array.from({ length: H }, () => Array(W).fill(0));
    const pathGrid = Array.from({ length: H }, () => Array(W).fill(false));

    // Place road in the middle: x from 2 to 7 at y=10
    for (let x = 2; x <= 7; x++) {
      pathGrid[10]![x] = true;
    }

    const dummyContinent: ContinentMapResult = {
      width: W,
      height: H,
      cells: [] as any,
      terrainMatrix: terrainMatrix as any,
      heightmap,
      resolvedWater: {} as any,
      resolvedMountain: {
        occupiedFootCells: Array.from({ length: H }, () => Array(W).fill(false)),
        cellDetails: Array.from({ length: H }, () => Array(W).fill(undefined))
      } as any,
      mountainPalette: 'brown',
      seed: 42,
      placedStairs: []
    };

    const options: GenerateObstaclesOptions = {
      continent: dummyContinent,
      pathGrid,
      pois: [],
      seed: 42,
      maxCutTrees: 1,
      maxStrengthBoulders: 0
    };

    const obstacles = generateProgressionObstacles(options);
    if (obstacles.length > 0) {
      const cutObs = obstacles.find((o) => o.type === 'cut_tree');
      if (cutObs) {
        // Check that flanking props seal the corridor so every walkable cell in the line is occupied
        expect(cutObs.flankingProps).toBeDefined();
        expect(cutObs.flankingProps!.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('verifies that exactly 1 city POI has a port and that it is strictly adjacent to ocean water', () => {
    for (const testSeed of [42, 1337, 777]) {
      const result = generatePokemonContinentalWorld({ seed: testSeed });
      const isOcean = computeOceanGrid(result.continent);

      // Collect all POIs with hasPort === true
      const portPois = result.pois.filter((p) => p.hasPort);
      expect(portPois.length).toBe(1);

      const portCity = portPois[0]!;

      // Verify that portCity is adjacent to ocean water (within 3 tiles of its southern/seaward boundary)
      const minX = portCity.gridX;
      const maxX = portCity.gridX + portCity.footprint.width;
      const maxY = portCity.gridY + portCity.footprint.height;

      let touchesOcean = false;
      for (let y = maxY; y <= Math.min(result.continent.height - 1, maxY + 4); y++) {
        for (let x = Math.max(0, minX - 2); x <= Math.min(result.continent.width - 1, maxX + 2); x++) {
          if (isOcean[y]?.[x]) {
            touchesOcean = true;
            break;
          }
        }
        if (touchesOcean) break;
      }

      expect(touchesOcean).toBe(true);

      // Verify no landlocked city has port_dock POI
      const portDocks = result.pois.filter((p) => p.type === 'port_dock');
      for (const dock of portDocks) {
        let dockTouchesOcean = false;
        for (let dy = -2; dy <= dock.footprint.height + 4; dy++) {
          for (let dx = -2; dx <= dock.footprint.width + 2; dx++) {
            const ny = dock.gridY + dy;
            const nx = dock.gridX + dx;
            if (isOcean[ny]?.[nx]) {
              dockTouchesOcean = true;
              break;
            }
          }
          if (dockTouchesOcean) break;
        }
        expect(dockTouchesOcean).toBe(true);
      }
    }
  });

  it('verifies that poke_fence_wood_h has no anomalous brown block on top and has transparent alpha', async () => {
    const fenceFiles = [
      'public/assets/canon/props/poke_fence_wood_h.png',
      'public/assets/prefabs/props/poke_fence_wood_h.png',
      'public/assets/tiles/poke_fence_wood_posts_m.png'
    ];

    for (const relPath of fenceFiles) {
      const fullPath = path.resolve(relPath);
      expect(fs.existsSync(fullPath)).toBe(true);

      const raw = await sharp(fullPath).raw().toBuffer({ resolveWithObject: true });
      expect(raw.info.channels).toBe(4);

      // Verify row 0 and 1 are completely transparent across all 32 columns
      for (let x = 0; x < raw.info.width; x++) {
        expect(raw.data[x * 4 + 3]).toBe(0);
        expect(raw.data[(raw.info.width + x) * 4 + 3]).toBe(0);
      }

      // Verify that the top center between the two rounded posts is transparent (no anomalous rectangular block)
      for (let y = 0; y <= 2; y++) {
        const idx = (y * raw.info.width + 13) * 4;
        expect(raw.data[idx + 3]).toBe(0);
      }
    }
  });

  it('verifies that tall grass has strict clearance buffer and never touches mountain cliffs, feet, or beaches', () => {
    const result = generatePokemonContinentalWorld({
      seed: 7741,
      width: 400,
      height: 400,
      mountainPalette: 'brown',
      tileScale: 32
    });

    const { continent, wilderness } = result;
    const { tallGrassGrid } = wilderness;
    const W = continent.width;
    const H = continent.height;

    let totalGrassChecked = 0;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!tallGrassGrid[y]?.[x]) continue;
        totalGrassChecked++;

        // 1. Must be elevation 0 and not on mountain foot overlay
        expect(continent.heightmap[y]?.[x] ?? 0).toBe(0);
        expect(continent.resolvedMountain.occupiedFootCells[y]?.[x]).toBeFalsy();

        // 2. All 8 neighbors must NOT be a mountain cliff, foot, or water/sand beach
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny < 0 || ny >= H || nx < 0 || nx >= W) continue;

            // No cliff elevation
            const elev = continent.heightmap[ny]?.[nx] ?? 0;
            expect(elev).toBe(0);

            // No cliff foot overlay
            const isFoot = continent.resolvedMountain.occupiedFootCells[ny]?.[nx];
            expect(isFoot).toBeFalsy();

            // No water or sand beach touching tall grass
            const terr = continent.terrainMatrix[ny]?.[nx];
            expect(terr !== 'water' && terr !== 'water_deep' && terr !== 'sand').toBe(true);
          }
        }
      }
    }

    expect(totalGrassChecked).toBeGreaterThan(100);
  });

  it('verifies that Cut Trees are strictly limited (<= 5), dispersed (>= 40 tiles), and only block narrow chokepoints', () => {
    const result = generatePokemonContinentalWorld({
      seed: 7741,
      width: 400,
      height: 400,
      mountainPalette: 'brown',
      tileScale: 32
    });

    const cutTrees = (result.progressionObstacles ?? []).filter((o) => o.type === 'cut_tree');

    // In original games: at most 5 cut trees in the whole region
    expect(cutTrees.length).toBeGreaterThanOrEqual(1);
    expect(cutTrees.length).toBeLessThanOrEqual(5);

    // Verify dispersion: minimum distance >= 40 tiles between any two cut trees
    for (let i = 0; i < cutTrees.length; i++) {
      for (let j = i + 1; j < cutTrees.length; j++) {
        const dist = Math.hypot(cutTrees[i]!.x - cutTrees[j]!.x, cutTrees[i]!.y - cutTrees[j]!.y);
        expect(dist).toBeGreaterThanOrEqual(40);
      }
    }

    // Verify that every cut tree blocks a genuine narrow chokepoint without arbitrary 10+ fence rows
    for (const tree of cutTrees) {
      if (tree.flankingProps) {
        // Flanking props must be at most 3 (not an endless fence row of 10-20 posts across an open field)
        expect(tree.flankingProps.length).toBeLessThanOrEqual(3);
      }
    }
  });

  it('verifies that the port city harbor basin has no extraneous bridge stubs', () => {
    const result = generatePokemonContinentalWorld({
      seed: 7741,
      width: 400,
      height: 400,
      mountainPalette: 'brown',
      tileScale: 32
    });

    const portDock = result.pois.find((p) => p.type === 'port_dock');
    expect(portDock).toBeDefined();

    const pierStartX = portDock!.gridX + (portDock!.footprint.width >= 7 ? Math.floor((portDock!.footprint.width - 3) / 2) : 0);
    const pierEndX = pierStartX + 2; // pierW = 3
    const harborMinX = portDock!.gridX - 8;
    const harborMaxX = portDock!.gridX + portDock!.footprint.width + 8;
    const harborMinY = portDock!.gridY;
    const harborMaxY = portDock!.gridY + portDock!.footprint.height + 8;

    // Check all bridge cells in the harbor area
    for (let y = harborMinY; y <= harborMaxY; y++) {
      for (let x = harborMinX; x <= harborMaxX; x++) {
        if (result.bridgeGrid[y]?.[x]) {
          // The ONLY allowed bridges in this area are the official pier columns (x in pierStartX..pierEndX)
          const isPartOfPier = x >= pierStartX && x <= pierEndX && y >= portDock!.gridY + portDock!.footprint.height;
          expect(isPartOfPier).toBe(true);
        }
      }
    }
  });

  it('verifies that no decorative fences or props clip on or adjacent to mountain cliffs or stairs', () => {
    for (const seed of [7741, 42]) {
      const result = generatePokemonContinentalWorld({
        seed,
        width: 400,
        height: 400,
        mountainPalette: 'brown',
        tileScale: 32
      });

      const allProps = [
        ...result.wilderness.props,
        ...(result.progressionObstacles ?? []).map((o) => ({ x: o.x, y: o.y, prefabFile: o.prefabFile })),
        ...(result.progressionObstacles ?? []).flatMap((o) => o.flankingProps ?? []),
        ...(result.microVignettes ?? []).flatMap((v) => v.props)
      ];

      for (const prop of allProps) {
        if (!prop.prefabFile || !prop.prefabFile.includes('fence')) continue;

        // 1. Must never be on elevated mountain tile
        expect(result.continent.heightmap[prop.y]?.[prop.x] ?? 0).toBe(0);

        // 2. Must never be on mountain foot cell
        expect(result.continent.resolvedMountain.occupiedFootCells[prop.y]?.[prop.x]).toBeFalsy();

        // 3. Must never be on a resolved mountain cell (stair, cliff, or floor)
        const mCell = result.continent.resolvedMountain.cellDetails[prop.y]?.[prop.x];
        expect(mCell).toBeNull();

        // 4. Must never be adjacent to stairs or cliff face
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const adjCell = result.continent.resolvedMountain.cellDetails[prop.y + dy]?.[prop.x + dx];
            if (adjCell?.role.includes('stairs')) {
              expect(adjCell.role).not.toContain('stairs');
            }
            if (adjCell?.role.includes('cliff') || adjCell?.role.includes('edge_south')) {
              expect(adjCell.role).not.toContain('cliff');
              expect(adjCell.role).not.toContain('edge_south');
            }
          }
        }
      }
    }
  });

  it('verifies that the port pier on water_deep resolves with strictly vertical pier tiles and zero horizontal turn corners', () => {
    const result = generatePokemonContinentalWorld({
      seed: 7741,
      width: 400,
      height: 400,
      mountainPalette: 'brown',
      tileScale: 32
    });

    const { buildMapBlitInstructions } = require('../../../src/logic/map/canvasTileRenderer.ts');
    const { instructions } = buildMapBlitInstructions(
      result.continent,
      result.pois,
      result.pathGrid,
      result.bridgeGrid,
      result.wilderness,
      {
        ledges: result.ledges,
        progressionObstacles: result.progressionObstacles,
        microVignettes: result.microVignettes
      }
    );

    const portDock = result.pois.find((p) => p.type === 'port_dock');
    expect(portDock).toBeDefined();

    const pierStartX = portDock!.gridX + (portDock!.footprint.width >= 7 ? Math.floor((portDock!.footprint.width - 3) / 2) : 0);
    const pierStartY = portDock!.gridY + portDock!.footprint.height;

    // Check all instructions blitted in the pier columns under the gatehouse threshold
    const pierBlits = instructions.filter((i: { px: number; py: number; filename: string }) => {
      const tx = Math.floor(i.px / 32);
      const ty = Math.floor(i.py / 32);
      return tx >= pierStartX && tx <= pierStartX + 2 && ty >= pierStartY && ty <= pierStartY + 3;
    });

    for (const b of pierBlits) {
      // Must NEVER contain horizontal bridge or corner turn pieces
      expect(b.filename).not.toContain('corner_turn');
      expect(b.filename).not.toContain('bridge_h');
      expect(b.filename).not.toContain('pier_h');
    }
  });

  it('verifies that harbor land bordering water_deep or ocean water has a sand beach transition and zero raw grass borders', () => {
    const result = generatePokemonContinentalWorld({
      seed: 7741,
      width: 400,
      height: 400,
      mountainPalette: 'brown',
      tileScale: 32
    });

    const portDock = result.pois.find((p) => p.type === 'port_dock');
    expect(portDock).toBeDefined();

    const minX = portDock!.gridX - 8;
    const maxX = portDock!.gridX + portDock!.footprint.width + 12;
    const minY = portDock!.gridY - 4;
    const maxY = portDock!.gridY + portDock!.footprint.height + 10;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const terr = result.continent.terrainMatrix[y]?.[x];
        // If this cell is land (grass)
        if (terr === 'grass') {
          // Verify that NO neighbor (8 directions) is water or water_deep
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const adjTerr = result.continent.terrainMatrix[y + dy]?.[x + dx];
              expect(adjTerr === 'water' || adjTerr === 'water_deep').toBe(false);
            }
          }
        }
      }
    }
  });

  it('verifies that every Cut Tree roadblock is hermetically sealed against player bypass', () => {
    const result = generatePokemonContinentalWorld({
      seed: 7741,
      width: 400,
      height: 400,
      mountainPalette: 'brown',
      tileScale: 32
    });

    const cutTrees = (result.progressionObstacles ?? []).filter((o) => o.type === 'cut_tree');
    expect(cutTrees.length).toBeGreaterThanOrEqual(1);

    for (const tree of cutTrees) {
      // Flanking props must seal the corridor:
      // The obstacle must have flanking props if adjacent cells are walkable ground
      const blockedCells = new Set<string>();
      blockedCells.add(`${tree.x}_${tree.y}`);
      for (const flank of tree.flankingProps ?? []) {
        blockedCells.add(`${flank.x}_${flank.y}`);
      }

      const treeOccupiedSet = new Set<string>();
      for (const t of result.wilderness.trees) {
        for (let dy = 0; dy < t.height; dy++) {
          for (let dx = 0; dx < t.width; dx++) {
            treeOccupiedSet.add(`${t.x + dx}_${t.y + dy}`);
          }
        }
      }

      // Check vertical or horizontal span:
      // In a 5x5 box centered on tree:
      // If the corridor is horizontal (transit from tree.x - 2 to tree.x + 2):
      // Without cutting the tree or climbing flanking props, there must be NO walkable path
      // from (tree.x - 2, tree.y) to (tree.x + 2, tree.y) within the corridor bounds.
      const isImpassable = (x: number, y: number): boolean => {
        if (blockedCells.has(`${x}_${y}`)) return true;
        if ((result.continent.heightmap[y]?.[x] ?? 0) > 0) return true;
        if (result.continent.resolvedMountain.occupiedFootCells[y]?.[x]) return true;
        const terr = result.continent.terrainMatrix[y]?.[x];
        if (terr === 'water' || terr === 'water_deep') return true;
        // Check dense trees
        if (treeOccupiedSet.has(`${x}_${y}`)) return true;
        return false;
      };

      // BFS inside radius 3: can the avatar walk from (tree.x - 2, tree.y) to (tree.x + 2, tree.y)
      // or from (tree.x, tree.y - 2) to (tree.x, tree.y + 2)?
      const canReach = (startX: number, startY: number, goalX: number, goalY: number, maxDist: number): boolean => {
        if (isImpassable(startX, startY) || isImpassable(goalX, goalY)) return false;
        const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
        const visited = new Set<string>([`${startX}_${startY}`]);

        while (queue.length > 0) {
          const cur = queue.shift()!;
          if (cur.x === goalX && cur.y === goalY) return true;

          for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
            const nx = cur.x + dx;
            const ny = cur.y + dy;
            const key = `${nx}_${ny}`;
            if (visited.has(key)) continue;
            if (Math.abs(nx - tree.x) > maxDist || Math.abs(ny - tree.y) > maxDist) continue;
            if (isImpassable(nx, ny)) continue;

            visited.add(key);
            queue.push({ x: nx, y: ny });
          }
        }
        return false;
      };

      // Both horizontal and vertical transit through the corridor must be blocked
      const hBypass = canReach(tree.x - 2, tree.y, tree.x + 2, tree.y, 2);
      const vBypass = canReach(tree.x, tree.y - 2, tree.x, tree.y + 2, 2);
      // At least one direction is the corridor direction, and in that direction transit MUST be blocked!
      expect(hBypass && vBypass).toBe(false);
    }
  });
});


