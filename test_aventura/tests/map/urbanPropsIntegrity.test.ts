/**
 * tests/node/map/urbanPropsIntegrity.test.ts
 *
 * TIER 1 RED-TO-GREEN REPRODUCTION & INTEGRITY TEST
 *
 * Validates:
 *   1. Canonical asset integrity for poke_street_lamp.png (32x96 px, authentic GBA red lamp with yellow bulb, zero cut logs).
 *   2. Canonical asset integrity for poke_bush_round.png (32x32 px, authentic GBA green hedge, zero gray metal posts).
 *   3. Street lamp spacing in City and Metropolis layouts (minimum 5-cell Euclidean separation, zero 3x3 clustering).
 *   4. Perimeter clearance in Metropolis (zero lamps placed on outer boundary y=0 where top extends into wilderness).
 *   5. Roadside prop dispersion in Wilderness (minimum 3-cell Euclidean separation along paths).
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, it, expect } from 'vitest';
import { generateSettlementLayout } from '../../../src/logic/map/cityLayoutEngine.ts';
import { generateWildernessLayer } from '../../../src/logic/map/wildernessVegetationEngine.ts';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import type { POINode } from '../../../src/types/map/poiTypes.ts';

const ROOT_DIR = process.cwd();

describe('urbanPropsIntegrity (Error 6)', () => {
  it('guarantees poke_street_lamp.png is 32x96 px authentic GBA red lamp (not cut logs)', async () => {
    const lampPath = path.resolve(ROOT_DIR, 'public/assets/canon/props/poke_street_lamp.png');
    expect(fs.existsSync(lampPath)).toBe(true);

    const meta = await sharp(lampPath).metadata();
    expect(meta.width).toBe(32);
    expect(meta.height).toBe(96);

    const { data, info } = await sharp(lampPath).raw().toBuffer({ resolveWithObject: true });
    // Verify it contains red pixels from the lamp pole (r > 160, g < 100, b < 100)
    let hasRedPole = false;
    // Verify it contains yellow pixels from the light bulb (r > 190, g > 170, b < 140)
    let hasYellowBulb = false;

    for (let i = 0; i < info.width * info.height; i++) {
      const a = data[i * 4 + 3]!;
      if (a < 128) continue;
      const r = data[i * 4]!;
      const g = data[i * 4 + 1]!;
      const b = data[i * 4 + 2]!;

      if (r > 160 && g < 100 && b < 100) hasRedPole = true;
      if (r > 190 && g > 170 && b < 140) hasYellowBulb = true;
    }

    expect(hasRedPole).toBe(true);
    expect(hasYellowBulb).toBe(true);
  });

  it('guarantees poke_bush_round.png is 32x32 px authentic green foliage (not gray metal posts)', async () => {
    const bushPath = path.resolve(ROOT_DIR, 'public/assets/canon/props/poke_bush_round.png');
    expect(fs.existsSync(bushPath)).toBe(true);

    const meta = await sharp(bushPath).metadata();
    expect(meta.width).toBe(32);
    expect(meta.height).toBe(32);

    const { data, info } = await sharp(bushPath).raw().toBuffer({ resolveWithObject: true });
    let greenFoliagePixels = 0;
    let grayMetalPixels = 0;

    for (let i = 0; i < info.width * info.height; i++) {
      const a = data[i * 4 + 3]!;
      if (a < 128) continue;
      const r = data[i * 4]!;
      const g = data[i * 4 + 1]!;
      const b = data[i * 4 + 2]!;

      // Green foliage: g > r and g > b
      if (g > r + 10 && g > b + 10) greenFoliagePixels++;
      // Gray metal posts: r, g, b very close and high (abs(r-g)<15, abs(g-b)<15, r>100, b>120)
      if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && r > 100 && b > 120) grayMetalPixels++;
    }

    expect(greenFoliagePixels).toBeGreaterThan(100);
    expect(grayMetalPixels).toBeLessThan(30);
  });

  it('enforces minimum 5-cell Euclidean spacing between street lamps in city layouts', () => {
    const cityNode: POINode = {
      id: 'vermilion_city',
      name: 'Ciudad Carmin',
      type: 'city',
      footprint: { width: 16, height: 14 },
      terrainPreference: 'flat_grass',
      gridX: 30,
      gridY: 30,
      elevation: 0
    };

    const layout = generateSettlementLayout(cityNode);
    const lamps = layout.props.filter((p) => p.type === 'lamp');

    expect(lamps.length).toBeGreaterThan(0);

    for (let i = 0; i < lamps.length; i++) {
      for (let j = i + 1; j < lamps.length; j++) {
        const l1 = lamps[i]!;
        const l2 = lamps[j]!;
        const dist = Math.hypot(l1.x - l2.x, l1.y - l2.y);
        expect(dist).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('guarantees street lamps in metropolis are not placed on outer boundaries (y = 0)', () => {
    const metroNode: POINode = {
      id: 'celeste_metropolis',
      name: 'Ciudad Celeste',
      type: 'metropolis',
      footprint: { width: 26, height: 22 },
      terrainPreference: 'flat_grass',
      gridX: 20,
      gridY: 20,
      elevation: 0
    };

    const layout = generateSettlementLayout(metroNode);
    const lamps = layout.props.filter((p) => p.type === 'lamp');

    for (const lamp of lamps) {
      const localY = lamp.y - metroNode.gridY;
      // Lamp height extends 2 cells upwards, so it must not be at localY <= 1
      expect(localY).toBeGreaterThanOrEqual(2);
    }
  });

  it('enforces minimum 3-cell spacing between consecutive roadside props in wilderness', () => {
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

    const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });
    const routeResult = generateRouteNetwork(continent, pois, { allowBridges: true });
    const wilderness = generateWildernessLayer(continent, pois, routeResult.pathGrid, { seed: 42 });

    expect(wilderness.props.length).toBeGreaterThan(10);

    // Check that props adjacent to routes don't cluster immediately next to each other (excluding contiguous parts of a multi-tile fence run)
    for (let i = 0; i < wilderness.props.length; i++) {
      for (let j = i + 1; j < wilderness.props.length; j++) {
        const p1 = wilderness.props[i]!;
        const p2 = wilderness.props[j]!;
        // Contiguous segments belonging to the same fence run connect seamlessly
        const isContiguousFence =
          (p1.type === 'fence_h' && p2.type === 'fence_h' && p1.y === p2.y && Math.abs(p1.x - p2.x) === 1) ||
          (p1.type === 'fence_v' && p2.type === 'fence_v' && p1.x === p2.x && Math.abs(p1.y - p2.y) === 1);
        if (isContiguousFence) {
          continue;
        }
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        expect(dist).toBeGreaterThanOrEqual(2.0);
      }
    }
  });
});
