/**
 * tests/node/map/buildingPrefabsIntegrity.test.ts
 *
 * TIER 1 UNIT TESTS FOR CANONICAL GBA BUILDING PREFABS & CHROMA INTEGRITY
 *
 * Validates:
 *   1. Canonical building metadata conformity in canonicalAssetsRegistry.
 *   2. Physical asset existence on disk.
 *   3. Strict pixel dimensions matching pixelDimensions (width x height).
 *   4. Zero (0) unkeyed background chroma artifacts (#9933cc purple / #ff00ff magenta).
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  CANONICAL_BUILDINGS
} from '../../../src/logic/map/canonicalAssetsRegistry.ts';

const ROOT_DIR = process.cwd();

describe('buildingPrefabsIntegrity', () => {
  it('registers gym_gold with correct GBA dimensions in CANONICAL_BUILDINGS', () => {
    const gymGold = CANONICAL_BUILDINGS['gym_gold'];
    expect(gymGold).toBeDefined();
    expect(gymGold?.tileDimensions).toEqual({ w: 6, h: 5 });
    expect(gymGold?.pixelDimensions).toEqual({ w: 192, h: 160 });
  });

  it('guarantees zero unkeyed chroma (#9933cc or #ff00ff) in gym_gold building asset', async () => {
    const gymGold = CANONICAL_BUILDINGS['gym_gold'];
    expect(gymGold).toBeDefined();

    const assetPath = path.resolve(ROOT_DIR, 'public/assets', gymGold!.runtimePath);
    expect(fs.existsSync(assetPath), `Asset path must exist: ${assetPath}`).toBe(true);

    const { data, info } = await sharp(assetPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    expect(info.width).toBe(192);
    expect(info.height).toBe(160);

    let unkeyedPurple = 0;
    let unkeyedMagenta = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;

      // Visible opaque or semi-opaque pixels
      if (a > 50) {
        // Purple chroma #9933cc (153, 51, 204)
        if (Math.abs(r - 153) <= 10 && Math.abs(g - 51) <= 10 && Math.abs(b - 204) <= 10) {
          unkeyedPurple++;
        }
        // Magenta chroma #ff00ff (255, 0, 255)
        if (r >= 235 && g <= 25 && b >= 235) {
          unkeyedMagenta++;
        }
      }
    }

    expect(unkeyedPurple, `Found ${unkeyedPurple} unkeyed purple (#9933cc) pixels in ${gymGold!.runtimePath}`).toBe(0);
    expect(unkeyedMagenta, `Found ${unkeyedMagenta} unkeyed magenta (#ff00ff) pixels in ${gymGold!.runtimePath}`).toBe(0);
  });

  it('guarantees all registered canonical buildings have valid dimensions and zero unkeyed chroma', async () => {
    const buildings = Object.values(CANONICAL_BUILDINGS);
    expect(buildings.length).toBeGreaterThan(0);

    for (const b of buildings) {
      const assetPath = path.resolve(ROOT_DIR, 'public/assets', b.runtimePath);
      expect(fs.existsSync(assetPath), `Building file must exist: ${b.runtimePath}`).toBe(true);

      const { data, info } = await sharp(assetPath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      expect(info.width, `Width mismatch for ${b.id}`).toBe(b.pixelDimensions.w);
      expect(info.height, `Height mismatch for ${b.id}`).toBe(b.pixelDimensions.h);

      let unkeyedChroma = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        const a = data[i + 3]!;

        if (a > 50) {
          if (
            (Math.abs(r - 153) <= 10 && Math.abs(g - 51) <= 10 && Math.abs(b - 204) <= 10) ||
            (r >= 235 && g <= 25 && b >= 235)
          ) {
            unkeyedChroma++;
          }
        }
      }

      expect(unkeyedChroma, `Building ${b.id} (${b.runtimePath}) has ${unkeyedChroma} unkeyed chroma pixels`).toBe(0);
    }
  });

  it('guarantees freestanding canonical buildings have intact sloping roofs with zero horizontal decapitation', async () => {
    const slopingRoofBuildings = ['gym_gold', 'poke_condo_block', 'pokecenter', 'pokemart', 'lab_oak'];
    for (const id of slopingRoofBuildings) {
      const b = CANONICAL_BUILDINGS[id];
      expect(b, `Building ${id} must exist in CANONICAL_BUILDINGS`).toBeDefined();

      const assetPath = path.resolve(ROOT_DIR, 'public/assets', b!.runtimePath);
      const { data, info } = await sharp(assetPath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      let row0Opaque = 0;
      for (let x = 0; x < info.width; x++) {
        if (data[x * 4 + 3]! > 50) row0Opaque++;
      }

      // Sloping roofs must have transparent margins on row 0, never a flat cut meat-cleaver line
      expect(
        row0Opaque,
        `Building ${id} (${b!.runtimePath}) is decapitated! Row 0 is 100% solid (${row0Opaque}/${info.width})`
      ).toBeLessThan(info.width);
    }
  });

  it('guarantees poke_statue is permanently eradicated and canonical replacements are valid', async () => {
    const statuePath = path.resolve(ROOT_DIR, 'public/assets/canon/props/poke_statue.png');
    expect(fs.existsSync(statuePath), `Statue must be eradicated from ${statuePath}`).toBe(false);

    // Verify left-facing street lamp has pristine alpha transparency
    const lampLeftPath = path.resolve(ROOT_DIR, 'public/assets/canon/props/poke_street_lamp_left.png');
    expect(fs.existsSync(lampLeftPath), `Lamp left must exist at ${lampLeftPath}`).toBe(true);

    const { data: lampData, info: lampInfo } = await sharp(lampLeftPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    expect(lampInfo.width).toBe(32);
    expect(lampInfo.height).toBe(96);

    let transparentPixels = 0;
    for (let i = 3; i < lampData.length; i += 4) {
      if (lampData[i]! < 50) transparentPixels++;
    }
    expect(transparentPixels).toBeGreaterThan(1500);

    // Verify canonical wooden dock pier prefab exists and has exact 48x64 px (3x4 tiles)
    const dockPierPath = path.resolve(
      ROOT_DIR,
      'public/assets/canon/infrastructure/poke_dock_wood_pier_canonical.png'
    );
    expect(fs.existsSync(dockPierPath), `Canonical dock pier must exist at ${dockPierPath}`).toBe(true);
    const dockMeta = await sharp(dockPierPath).metadata();
    expect(dockMeta.width).toBe(96);
    expect(dockMeta.height).toBe(128);
  });
});

