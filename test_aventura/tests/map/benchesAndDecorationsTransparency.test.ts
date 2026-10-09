import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';

describe('Benches & Decoration Assets Transparency (Phase 3)', () => {
  it('guarantees poke_flowers_red.png has 100% alpha transparency (no baked-in green background)', async () => {
    const assetPath = path.resolve(process.cwd(), 'public/assets/canon/props/poke_flowers_red.png');
    const { data, info } = await sharp(assetPath).raw().toBuffer({ resolveWithObject: true });
    expect(info.channels).toBe(4);
    expect(data[3]).toBe(0);

    let transparentCount = 0;
    let solidGrassBackgroundCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) transparentCount++;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;
      // FireRed grass background #70c8a0 (r: 112, g: 200, b: 160)
      if (a === 255 && r > 100 && r < 125 && g > 190 && g < 210 && b > 150 && b < 170) {
        solidGrassBackgroundCount++;
      }
    }
    expect(solidGrassBackgroundCount).toBe(0);
    expect(transparentCount).toBeGreaterThan(100);
  });

  it('guarantees poke_fence_wood_h.png and poke_bush_round.png have alpha transparency', async () => {
    const fencePath = path.resolve(process.cwd(), 'public/assets/canon/props/poke_fence_wood_h.png');
    const { data: fenceData } = await sharp(fencePath).raw().toBuffer({ resolveWithObject: true });
    let fenceTransparent = 0;
    for (let i = 3; i < fenceData.length; i += 4) {
      if (fenceData[i] === 0) fenceTransparent++;
    }
    expect(fenceTransparent).toBeGreaterThan(100);

    const bushPath = path.resolve(process.cwd(), 'public/assets/canon/props/poke_bush_round.png');
    const { data: bushData } = await sharp(bushPath).raw().toBuffer({ resolveWithObject: true });
    let bushTransparent = 0;
    for (let i = 3; i < bushData.length; i += 4) {
      if (bushData[i] === 0) bushTransparent++;
    }
    expect(bushTransparent).toBeGreaterThan(50);
  });

  it('guarantees vertical benches (poke_bench_v_left and poke_bench_v_right) exist, are 32x64px, and transparent', async () => {
    const leftPath = path.resolve(process.cwd(), 'public/assets/canon/props/poke_bench_v_left.png');
    const rightPath = path.resolve(process.cwd(), 'public/assets/canon/props/poke_bench_v_right.png');
    expect(fs.existsSync(leftPath)).toBe(true);
    expect(fs.existsSync(rightPath)).toBe(true);

    const metaLeft = await sharp(leftPath).metadata();
    expect(metaLeft.width).toBe(32);
    expect(metaLeft.height).toBe(64);
    expect(metaLeft.channels).toBe(4);

    const metaRight = await sharp(rightPath).metadata();
    expect(metaRight.width).toBe(32);
    expect(metaRight.height).toBe(64);
    expect(metaRight.channels).toBe(4);
  });

  it('places vertical benches on vertical N-S sidewalks without invading vehicular avenue cells', () => {
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
    const carmin = pois.find((p) => p.name.includes('Carmin'));
    expect(carmin).toBeDefined();
    expect(carmin?.urbanLayout).toBeDefined();

    const benches = (carmin?.urbanLayout?.props || []).filter((pr) => pr.type === 'bench');
    expect(benches.length).toBeGreaterThan(0);

    // Bench on West sidewalk (bx + 6) must be poke_bench_v_left
    const westBench = benches.find((b) => b.x === carmin!.gridX + 6);
    expect(westBench).toBeDefined();
    expect(westBench?.prefabFile).toBe('poke_bench_v_left.png');

    // Bench on East sidewalk (bx + 9) must be poke_bench_v_right
    const eastBench = benches.find((b) => b.x === carmin!.gridX + 9);
    expect(eastBench).toBeDefined();
    expect(eastBench?.prefabFile).toBe('poke_bench_v_right.png');

    // Neither bench should occupy avenue cells (bx + 7 or bx + 8)
    const avenueOccupied = benches.some(
      (b) => b.x === carmin!.gridX + 7 || b.x === carmin!.gridX + 8
    );
    expect(avenueOccupied).toBe(false);
  });
});
