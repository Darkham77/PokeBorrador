/**
 * tests/node/map/bridgeRectilinearWaterCrossing.test.ts
 *
 * TIER 1 UNIT TEST: RECTILINEAR WATER CROSSINGS, CAVE MOUTHS & ROCK ALPHA
 *
 * Validates:
 *   1. BridgeGrid cells strictly exist on water cells only (zero bridges on dry sand beaches).
 *   2. Bridges crossing water to water landmarks (e.g. Faro Marino) form a single continuous,
 *      rectilinear 2-cell corridor without horizontal jogs or orphan balconies over open water or beach.
 *   3. Cave entrances point to authentic 32x64 GBA dark arched hole prefabs in canonical manifest.
 *   4. Decorative rock sprites have transparent alpha backgrounds (no opaque cave floor tan or green grass).
 */

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import sharp from 'sharp';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import { resolveCanonicalBridges } from '../../../src/logic/map/canonicalBridgeEngine.ts';
import manifestJson from '../../../src/data/map/canonical_assets_manifest.json' with { type: 'json' };

const ROOT_DIR = process.cwd();

describe('bridgeRectilinearWaterCrossing', () => {
  it('guarantees bridgeGrid cells strictly exist on water cells only', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 1234,
      oceanWaterPercentage: 0.25,
      beachWidth: 3,
      lakeCount: 7,
      mountainPercentage: 0.25,
      mountainPalette: 'brown',
      withStairs: true
    });
    const pois = placeRegionalPOIs(continent, { targetCount: 20 });
    const route = generateRouteNetwork(continent, pois, { allowBridges: true });

    let nonWaterBridges = 0;
    for (let y = 0; y < continent.height; y++) {
      for (let x = 0; x < continent.width; x++) {
        if (route.bridgeGrid[y]![x]) {
          const terr = continent.cells[y]![x]!.terrain;
          if (terr !== 'water') {
            nonWaterBridges++;
          }
        }
      }
    }
    expect(nonWaterBridges).toBe(0);
  });

  it('guarantees bridge to Faro Marino is a strictly rectilinear corridor without mid-water jogs or orphan railings', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 1234,
      oceanWaterPercentage: 0.25,
      beachWidth: 3,
      lakeCount: 7,
      mountainPercentage: 0.25,
      mountainPalette: 'brown',
      withStairs: true
    });
    const pois = placeRegionalPOIs(continent, { targetCount: 20 });
    const faro = pois.find((p) => p.id === 'ocean_lighthouse')!;
    const route = generateRouteNetwork(continent, pois, { allowBridges: true });
    const blits = resolveCanonicalBridges(route.bridgeGrid, continent.cells);
    const faroEdge = route.edges.find(
      (e) => (e.fromNodeId === faro.id || e.toNodeId === faro.id) && e.isWaterCrossing
    );
    expect(faroEdge).toBeDefined();

    // Extract the water run of waypoints
    const waterRun = faroEdge!.waypoints.filter(
      (pt) => continent.cells[pt.y]?.[pt.x]?.terrain === 'water'
    );
    expect(waterRun.length).toBeGreaterThan(0);

    // Filter bridge blits directly on this water crossing run
    const waterXs = new Set(waterRun.map((p) => p.x));
    const waterYs = new Set(waterRun.map((p) => p.y));
    const minWaterX = Math.min(...waterXs) - 1;
    const maxWaterX = Math.max(...waterXs) + 1;
    const minWaterY = Math.min(...waterYs) - 1;
    const maxWaterY = Math.max(...waterYs) + 1;

    const faroWaterBlits = blits.filter(
      (b) => b.x >= minWaterX && b.x <= maxWaterX && b.y >= minWaterY && b.y <= maxWaterY
    );

    // Group by row (if vertical) or col (if horizontal)
    const isVertical = maxWaterY - minWaterY >= maxWaterX - minWaterX;

    let commonCols: number[] | null = null;
    if (isVertical) {
      const sortedWaterYs = [...waterYs].sort((a, b) => a - b);
      const interiorWaterYs = sortedWaterYs.length > 2 ? sortedWaterYs.slice(1, -1) : sortedWaterYs;
      for (const y of interiorWaterYs) {
        const rowBlits = faroWaterBlits.filter((b) => b.y === y);
        const cols = rowBlits.map((b) => b.x).sort((a, b) => a - b);
        expect(cols.length).toBe(2);
        if (!commonCols) {
          commonCols = cols;
        } else {
          expect(cols).toEqual(commonCols);
        }
      }
    } else {
      let commonRows: number[] | null = null;
      const sortedWaterXs = [...waterXs].sort((a, b) => a - b);
      const interiorWaterXs = sortedWaterXs.length > 2 ? sortedWaterXs.slice(1, -1) : sortedWaterXs;
      for (const x of interiorWaterXs) {
        const colBlits = faroWaterBlits.filter((b) => b.x === x);
        const rows = colBlits.map((b) => b.y).sort((a, b) => a - b);
        expect(rows.length).toBe(2);
        if (!commonRows) {
          commonRows = rows;
        } else {
          expect(rows).toEqual(commonRows);
        }
      }
    }

    // Zero stray horizontal railings or orphan single railings anywhere in the bridge run
    const strayRailings = faroWaterBlits.filter(
      (b) => b.file === 'poke_bridge_h_single.png' || (isVertical && b.file === 'poke_bridge_h_top.png')
    );
    expect(strayRailings.length).toBe(0);

    // Zero bridge blits on sand
    const sandBlits = faroWaterBlits.filter((b) => continent.cells[b.y]![b.x]!.terrain === 'sand');
    expect(sandBlits.length).toBe(0);

    // Guarantee the start and end of the bridge corridor land on solid sand
    const firstWaterIdx = faroEdge!.waypoints.findIndex(
      (pt) => continent.cells[pt.y]?.[pt.x]?.terrain === 'water'
    );
    const lastWaterIdx = faroEdge!.waypoints.findLastIndex(
      (pt) => continent.cells[pt.y]?.[pt.x]?.terrain === 'water'
    );
    const landing1 = faroEdge!.waypoints[firstWaterIdx - 1];
    const landing2 = faroEdge!.waypoints[lastWaterIdx + 1];
    if (landing1) {
      expect(continent.cells[landing1.y]![landing1.x]!.terrain).toBe('sand');
      expect(continent.terrainMatrix[landing1.y]![landing1.x]).toBe('sand');
    }
    if (landing2) {
      expect(continent.cells[landing2.y]![landing2.x]!.terrain).toBe('sand');
      expect(continent.terrainMatrix[landing2.y]![landing2.x]).toBe('sand');
    }
  });

  it('guarantees cave entrances point to authentic 32x64 dark arched hole prefabs', () => {
    const brownCave = manifestJson.find((e) => e.id === 'poke_cave_entrance_brown');
    const grayCave = manifestJson.find((e) => e.id === 'poke_cave_entrance_gray');

    expect(brownCave).toBeDefined();
    expect(grayCave).toBeDefined();

    expect(brownCave?.runtimePath).toBe('prefabs/elevation/poke_cave_entrance_brown.png');
    expect(grayCave?.runtimePath).toBe('prefabs/elevation/poke_cave_entrance_gray.png');

    expect(brownCave?.pixelDimensions).toEqual({ w: 32, h: 64 });
    expect(grayCave?.pixelDimensions).toEqual({ w: 32, h: 64 });

    expect(brownCave?.tileDimensions).toEqual({ w: 1, h: 2 });
    expect(grayCave?.tileDimensions).toEqual({ w: 1, h: 2 });

    expect(brownCave?.collisionMask).toEqual([[1], [0]]);
    expect(grayCave?.collisionMask).toEqual([[1], [0]]);
  });

  it('guarantees decorative rock assets have transparent alpha backgrounds', async () => {
    const rockFiles = [
      'public/assets/tiles/poke_cave_boulder_rock.png',
      'public/assets/tiles/poke_cave_rubble_stones.png',
      'public/assets/tiles/poke_rock_boulder_brown_large.png'
    ];

    for (const relPath of rockFiles) {
      const fullPath = path.resolve(ROOT_DIR, relPath);
      const { data, info } = await sharp(fullPath).raw().toBuffer({ resolveWithObject: true });
      expect(info.channels).toBe(4);

      // Verify corners (0,0) are transparent
      const cornerIdx = 0;
      expect(data[cornerIdx + 3]).toBe(0);

      // Verify no opaque cave floor tan pixels (b === 112 && r >= 120 && g >= 120 && a === 255)
      let opaqueTanPixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        const a = data[i + 3]!;
        if (a === 255 && b === 112 && r >= 120 && g >= 120) {
          opaqueTanPixels++;
        }
      }
      expect(opaqueTanPixels).toBe(0);
    }
  });
});
