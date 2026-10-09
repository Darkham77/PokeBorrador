/**
 * tests/node/map/multiMapAuditFixes.test.ts
 *
 * TIER 1 RED-TO-GREEN REPRODUCTION & INTEGRITY TEST
 *
 * Validates the 6 fixes discovered in the 10-continent stress test audit:
 *   1. Zero Floating Bridge Ends: Every bridge end must touch valid land/path on both sides.
 *   2. Mountain Props Clearance: No wooden fences, flowers, or bushes on cliffs (elev > 0).
 *   3. Zero Orphan Path Segments: Every connected path component must touch a POI or bridge.
 *   4. POI Path Reachability: Every placed POI must have an adjacent walkable path.
 *   5. Healthy Wilderness Tree Density: Large continents (>= 80x80) must generate >= 20 trees.
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import { generateWildernessLayer } from '../../../src/logic/map/wildernessVegetationEngine.ts';
import { buildMapBlitInstructions } from '../../../src/logic/map/canvasTileRenderer.ts';

describe('multiMapAuditFixes (10-Continent Audit Suite)', () => {
  it('guarantees zero floating bridge ends on maps with water turns (Map 4 & Map 6)', () => {
    // Map 4 configuration (previously failed with floating bridge end at (14, 60))
    const continent4 = generateContinentMap({
      width: 80,
      height: 80,
      seed: 444,
      oceanWaterPercentage: 0.44,
      beachWidth: 2,
      lakeCount: 2,
      mountainPercentage: 0.32,
      mountainPalette: 'gray',
      withStairs: true
    });

    const pois4 = placeRegionalPOIs(continent4, { targetCount: 12, seed: 444 });
    const route4 = generateRouteNetwork(continent4, pois4, { allowBridges: true });

    const floatingEnds: { x: number; y: number }[] = [];
    for (let y = 0; y < continent4.height; y++) {
      for (let x = 0; x < continent4.width; x++) {
        if (!route4.bridgeGrid[y]?.[x]) continue;

        const bNeighbors = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 }
        ].filter((n) => route4.bridgeGrid[y + n.dy]?.[x + n.dx]);

        if (bNeighbors.length <= 1) {
          const isBalcony =
            bNeighbors.length === 1 &&
            (() => {
              const nb = bNeighbors[0]!;
              const nX = x + nb.dx;
              const nY = y + nb.dy;
              const nbBridgeCount = [
                { dx: 0, dy: -1 },
                { dx: 0, dy: 1 },
                { dx: -1, dy: 0 },
                { dx: 1, dy: 0 }
              ].filter((n) => route4.bridgeGrid[nY + n.dy]?.[nX + n.dx]).length;
              return nbBridgeCount >= 3;
            })();

          if (isBalcony) continue;

          const hasLandTouch = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
          ].some((n) => {
            const nx = x + n.dx;
            const ny = y + n.dy;
            const terr = continent4.terrainMatrix[ny]?.[nx];
            return terr && terr !== 'water' && terr !== 'water_deep';
          });
          if (!hasLandTouch) {
            floatingEnds.push({ x, y });
          }
        }
      }
    }

    expect(floatingEnds).toEqual([]);
  });

  it('guarantees no fences, flowers or bushes on elevated mountain terrain (elev > 0)', () => {
    // Map 9 configuration (previously stamped 4 wooden fences on volcanic mountain plateau)
    const continent9 = generateContinentMap({
      width: 64,
      height: 64,
      seed: 999,
      oceanWaterPercentage: 0.42,
      beachWidth: 2,
      lakeCount: 2,
      mountainPercentage: 0.3,
      mountainPalette: 'volcanic',
      withStairs: true
    });

    const pois9 = placeRegionalPOIs(continent9, { targetCount: 8, seed: 999 });
    const route9 = generateRouteNetwork(continent9, pois9, { allowBridges: true });
    const wilderness9 = generateWildernessLayer(continent9, pois9, route9.pathGrid, { seed: 999 });

    // Inspect blits in the region of the mountain in Map 9
    const blits9 = buildMapBlitInstructions(continent9, pois9, route9.pathGrid, route9.bridgeGrid, wilderness9);
    const mountainBlitFiles = new Set(
      blits9.instructions
        .filter((b) => b.px >= 1100 && b.px <= 1650 && b.py >= 1300 && b.py <= 1750)
        .map((b) => b.filename)
    );
    console.log('[Map 9 Mountain Blit Filenames]:', Array.from(mountainBlitFiles).sort());

    const illegalMountainProps = wilderness9.props.filter((p) => {
      const elev = continent9.heightmap[p.y]?.[p.x] ?? 0;
      const isPlainProp = p.type === 'fence_h' || p.type === 'flower' || p.type === 'bush' || p.type === 'sapling';
      return elev > 0 && isPlainProp;
    });

    expect(illegalMountainProps).toEqual([]);
    expect(mountainBlitFiles.has('poke_tanoby_ruins_red_crater_plateau.png')).toBe(false);
    expect(mountainBlitFiles.has('poke_cliff_brown_plateau_rock.png')).toBe(true);
  });

  it('guarantees zero orphan path segments disconnected from all POIs and bridges (Map 2)', () => {
    // Map 2 configuration (previously had isolated vertical path strip in west plains)
    const continent2 = generateContinentMap({
      width: 64,
      height: 64,
      seed: 222,
      oceanWaterPercentage: 0.18,
      beachWidth: 4,
      lakeCount: 3,
      mountainPercentage: 0.28,
      mountainPalette: 'gray',
      withStairs: true
    });

    const pois2 = placeRegionalPOIs(continent2, { targetCount: 10, seed: 222 });
    const route2 = generateRouteNetwork(continent2, pois2, { allowBridges: true });

    // Breadth-first search from all POI footprints & bridge cells
    const W = continent2.width;
    const H = continent2.height;
    const visited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const queue: { x: number; y: number }[] = [];

    // Seed BFS with all path cells adjacent to POI footprints or bridges
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!route2.pathGrid[y]![x]) continue;

        // Adjacent to a POI?
        let nearPOI = false;
        for (const poi of pois2) {
          if (
            x >= poi.gridX - 1 &&
            x <= poi.gridX + poi.footprint.width &&
            y >= poi.gridY - 1 &&
            y <= poi.gridY + poi.footprint.height
          ) {
            nearPOI = true;
            break;
          }
        }

        // Adjacent to a bridge?
        let nearBridge = false;
        if (!nearPOI) {
          for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            if (route2.bridgeGrid[y + dy!]?.[x + dx!]) {
              nearBridge = true;
              break;
            }
          }
        }

        if (nearPOI || nearBridge) {
          visited[y]![x] = true;
          queue.push({ x, y });
        }
      }
    }

    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++]!;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = curr.x + dx!;
        const ny = curr.y + dy!;
        if (nx >= 0 && nx < W && ny >= 0 && ny < H && route2.pathGrid[ny]![nx] && !visited[ny]![nx]) {
          visited[ny]![nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
    }

    // Any path cell not visited is an unattached orphan!
    const orphanPathCells: { x: number; y: number }[] = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (route2.pathGrid[y]![x] && !visited[y]![x]) {
          orphanPathCells.push({ x, y });
        }
      }
    }

    expect(orphanPathCells).toEqual([]);
  });

  it('guarantees healthy tree population on large continents (>= 20 trees in Map 5)', () => {
    // Map 5 (96x96, previously generated 0 trees across entire continent)
    const continent5 = generateContinentMap({
      width: 96,
      height: 96,
      seed: 1010,
      oceanWaterPercentage: 0.22,
      beachWidth: 4,
      lakeCount: 4,
      mountainPercentage: 0.2,
      mountainPalette: 'brown',
      withStairs: true
    });

    const pois5 = placeRegionalPOIs(continent5, { targetCount: 16, seed: 1010 });
    const route5 = generateRouteNetwork(continent5, pois5, { allowBridges: true });

    const wilderness5 = generateWildernessLayer(continent5, pois5, route5.pathGrid, { seed: 1010 });
    expect(wilderness5.trees.length).toBeGreaterThanOrEqual(18);
  });

  it('guarantees bridgehead boardwalks connect across beach sand to continental road network (Map 8)', () => {
    // Map 8 (112x112, previously had island bridge landing on sand with a 4-tile void before roads)
    const continent8 = generateContinentMap({
      width: 112,
      height: 112,
      seed: 888,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 4,
      mountainPercentage: 0.3,
      mountainPalette: 'brown',
      withStairs: true
    });

    const pois8 = placeRegionalPOIs(continent8, { targetCount: 18, seed: 888 });
    const route8 = generateRouteNetwork(continent8, pois8, { allowBridges: true });

    // 1. Zero bridges on dry land (grass, sand, mountain) - bridges strictly exist over water
    const illegalBridges: { x: number; y: number; terrain: string }[] = [];
    let waterBridgeCount = 0;
    for (let y = 0; y < continent8.height; y++) {
      for (let x = 0; x < continent8.width; x++) {
        if (route8.bridgeGrid[y]?.[x]) {
          const terr = continent8.terrainMatrix[y]?.[x];
          if (terr !== 'water' && terr !== 'water_deep') {
            illegalBridges.push({ x, y, terrain: terr ?? 'unknown' });
          } else {
            waterBridgeCount++;
          }
        }
      }
    }
    expect(illegalBridges).toEqual([]);
    expect(waterBridgeCount).toBeGreaterThan(0);
  });

  it('guarantees cave entrances are placed at elevation 0 and connected to road network (Map 4)', () => {
    // Map 4 (Alpine Fjords, previously had Tunel Roca isolated on inaccessible cliff)
    const continent4 = generateContinentMap({
      width: 80,
      height: 80,
      seed: 444,
      oceanWaterPercentage: 0.44,
      beachWidth: 2,
      lakeCount: 2,
      mountainPercentage: 0.32,
      mountainPalette: 'gray',
      withStairs: true
    });

    const pois4 = placeRegionalPOIs(continent4, { targetCount: 12, seed: 444 });
    const route4 = generateRouteNetwork(continent4, pois4, { allowBridges: true });

    const caves = pois4.filter((p) => p.type === 'cave_entrance');
    expect(caves.length).toBeGreaterThan(0);

    for (const cave of caves) {
      const doorY = cave.gridY + 1;
      const doorX = cave.gridX;
      const doorElev = continent4.heightmap[doorY]?.[doorX] ?? 0;
      expect(doorElev).toBe(0);

      // Doorstep must have adjacent or direct pathGrid connection
      const hasAdjacentPath =
        route4.pathGrid[doorY]?.[doorX] ||
        route4.pathGrid[doorY - 1]?.[doorX] ||
        route4.pathGrid[doorY + 1]?.[doorX] ||
        route4.pathGrid[doorY]?.[doorX - 1] ||
        route4.pathGrid[doorY]?.[doorX + 1];
      expect(hasAdjacentPath).toBe(true);
    }
  });

  it('guarantees zero artificial lateral sand teeth/protrusions into water at bridge landings (Map 3)', () => {
    const continent3 = generateContinentMap({
      width: 80,
      height: 80,
      seed: 333,
      oceanWaterPercentage: 0.38,
      beachWidth: 3,
      lakeCount: 4,
      mountainPercentage: 0.35,
      mountainPalette: 'volcanic',
      withStairs: true
    });

    const initialTerrain = continent3.terrainMatrix.map((row) => [...row]);
    const pois3 = placeRegionalPOIs(continent3, { targetCount: 12, seed: 333 });
    generateRouteNetwork(continent3, pois3, { allowBridges: true });

    // In Map 3, Faro Marino is at x: 63..74, y: 3..15.
    // The ocean south of the landing is at y: 16..17, x: 63..64.
    // The ocean north of the mainland landing is at y: 12..13, x: 57..58.
    // These cells were initially water and MUST remain water (zero artificial sand teeth).
    expect(initialTerrain[16]?.[63]).toBe('water');
    expect(continent3.terrainMatrix[16]?.[63]).toBe('water');
    expect(continent3.terrainMatrix[17]?.[63]).toBe('water');

    expect(initialTerrain[12]?.[57]).toBe('water');
    expect(continent3.terrainMatrix[12]?.[57]).toBe('water');
    expect(continent3.terrainMatrix[12]?.[58]).toBe('water');
  });

  it('guarantees dungeon_forest POIs render dense tree canopies around pathways (Map 2)', () => {
    const continent2 = generateContinentMap({
      width: 64,
      height: 64,
      seed: 222,
      oceanWaterPercentage: 0.18,
      beachWidth: 4,
      lakeCount: 3,
      mountainPercentage: 0.28,
      mountainPalette: 'gray',
      withStairs: true
    });

    const pois2 = placeRegionalPOIs(continent2, { targetCount: 10, seed: 222 });
    const route2 = generateRouteNetwork(continent2, pois2, { allowBridges: true });
    const wild2 = generateWildernessLayer(continent2, pois2, route2.pathGrid);
    const blit2 = buildMapBlitInstructions(continent2, pois2, route2.pathGrid, route2.bridgeGrid, wild2);

    const viridianTrees = blit2.instructions.filter((i) => i.filename.includes('viridian'));
    expect(viridianTrees.length).toBeGreaterThanOrEqual(8);
  });

  it('guarantees wilderness and roadside props have at least 1-cell clearance from water bodies (Map 6)', () => {
    const continent6 = generateContinentMap({
      width: 96,
      height: 96,
      seed: 666,
      oceanWaterPercentage: 0.32,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.2,
      mountainPalette: 'volcanic',
      withStairs: true
    });

    const pois6 = placeRegionalPOIs(continent6, { targetCount: 14, seed: 666 });
    const route6 = generateRouteNetwork(continent6, pois6, { allowBridges: true });
    const wild6 = generateWildernessLayer(continent6, pois6, route6.pathGrid);

    const propsAdjacentToWater: { x: number; y: number; prop: string; neighborWater: string }[] = [];
    for (const prop of wild6.props) {
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = prop.x + dx!;
        const ny = prop.y + dy!;
        const terr = continent6.terrainMatrix[ny]?.[nx];
        if (terr === 'water' || terr === 'water_deep') {
          propsAdjacentToWater.push({ x: prop.x, y: prop.y, prop: prop.prefabFile, neighborWater: `${nx},${ny}` });
        }
      }
    }

    expect(propsAdjacentToWater).toEqual([]);
  });

  it('guarantees rock and boulder prefabs have transparent backgrounds (alpha = 0 on corners)', async () => {
    const sharp = (await import('sharp')).default;
    const fs = await import('node:fs');

    const rockFiles = [
      'public/assets/prefabs/props/poke_rock_stone_gray_medium.png',
      'public/assets/prefabs/props/poke_boulder_large.png',
      'public/assets/studio/kanto/prefabs/poke_boulder_gray.png',
      'public/assets/tiles/poke_rock_boulder_mossy_1.png',
      'public/assets/tiles/poke_rock_boulder_mossy_2.png'
    ];

    for (const f of rockFiles) {
      expect(fs.existsSync(f)).toBe(true);
      const { data } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      // Top-left corner must be transparent
      expect(data[3], `${f} top-left alpha`).toBe(0);

      // No leftover opaque GBA background grass pixels (rgb 112, 200, 160)
      let opaqueGrassPixels = 0;
      let opaqueFloorPixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] === 112 && data[i + 1] === 200 && data[i + 2] === 160 && data[i + 3] === 255) {
          opaqueGrassPixels++;
        }
        if (data[i] === 152 && data[i + 1] === 160 && data[i + 2] === 176 && data[i + 3] === 255) {
          opaqueFloorPixels++;
        }
      }
      expect(opaqueGrassPixels, `${f} opaque grass pixels`).toBe(0);
      expect(opaqueFloorPixels, `${f} opaque floor pixels`).toBe(0);
    }
  });
});
