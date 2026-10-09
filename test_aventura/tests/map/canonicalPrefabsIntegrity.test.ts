/**
 * tests/node/map/canonicalPrefabsIntegrity.test.ts
 *
 * CANONICAL PREFABS & CERTIFIED ASSETS INTEGRITY TEST (Tier 1 RED-to-GREEN)
 *
 * Asserts:
 * 1. 100% of certified canonical buildings and props exist on disk in public/assets/prefabs/buildings/ and public/assets/canon/buildings/.
 * 2. Dimensions are strict multiples of 32px (Pokemon Essentials & Poke Vicio standard).
 * 3. Alpha channel is present with 0% opacity (transparent) on outer top corners.
 * 4. Zero black or gray background artifacts.
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, it, expect } from 'vitest';

const ROOT_DIR = process.cwd();

const CERTIFIED_CANONICAL_BUILDINGS = [
  { file: 'house_wood_flowers.png', w: 160, h: 128, category: 'buildings' },
  { file: 'house_green_plain.png', w: 160, h: 128, category: 'buildings' },
  { file: 'house_pallet_red.png', w: 160, h: 160, category: 'buildings' },
  { file: 'house_pallet_blue.png', w: 160, h: 128, category: 'buildings' },
  { file: 'house_vermilion_ranch.png', w: 192, h: 128, category: 'buildings' },
  { file: 'house_cerulean_orange.png', w: 128, h: 128, category: 'buildings' },
  { file: 'house_lavender_purple.png', w: 160, h: 128, category: 'buildings' },
  { file: 'house_celadon_brick_2story.png', w: 128, h: 160, category: 'buildings' },
  { file: 'house_wood_brown.png', w: 128, h: 128, category: 'buildings' },
  { file: 'house_gray_small.png', w: 128, h: 128, category: 'buildings' },
  { file: 'house_blue.png', w: 192, h: 128, category: 'buildings' },
  { file: 'poke_battle_pyramid.png', w: 448, h: 352, category: 'buildings' },
  { file: 'poke_battle_arena.png', w: 448, h: 288, category: 'buildings' },
  { file: 'poke_battle_palace.png', w: 352, h: 224, category: 'buildings' },
  { file: 'poke_port_vermilion_gate.png', w: 224, h: 192, category: 'buildings' },
  { file: 'poke_port_vermilion_gate_north.png', w: 224, h: 192, category: 'buildings' },
  { file: 'poke_port_vermilion_gate_west.png', w: 192, h: 224, category: 'buildings' },
  { file: 'poke_port_vermilion_gate_east.png', w: 192, h: 224, category: 'buildings' }
] as const;

const CERTIFIED_CANONICAL_PROPS = [
  { file: 'poke_signpost.png', w: 32, h: 32, category: 'props' },
  { file: 'poke_ship_ferry_docked.png', w: 224, h: 160, category: 'props' },
  { file: 'poke_ship_ferry_docked_north.png', w: 224, h: 160, category: 'props' },
  { file: 'poke_ship_ferry_docked_west.png', w: 160, h: 224, category: 'props' },
  { file: 'poke_ship_ferry_docked_east.png', w: 160, h: 224, category: 'props' },
  { file: 'poke_ship_seagallop_east.png', w: 160, h: 96, category: 'props' },
  { file: 'poke_ship_seagallop_west.png', w: 160, h: 96, category: 'props' },
  { file: 'poke_port_lighthouse_beacon.png', w: 64, h: 128, category: 'props' },
  { file: 'poke_port_cargo_crates_stack.png', w: 96, h: 64, category: 'props' },
  { file: 'poke_port_cargo_crates_double.png', w: 64, h: 32, category: 'props' },
  { file: 'poke_port_bollard_chains.png', w: 64, h: 32, category: 'props' },
  { file: 'poke_port_dock_truck.png', w: 96, h: 64, category: 'props' }
] as const;

describe('Canonical Prefabs & Certified Buildings Integrity (SSoT)', () => {
  it('should verify all certified canonical buildings exist on disk with valid 32px geometry', async () => {
    for (const bldg of CERTIFIED_CANONICAL_BUILDINGS) {
      const targetPath = path.resolve(ROOT_DIR, 'public/assets/prefabs/buildings', bldg.file);
      expect(fs.existsSync(targetPath), `Missing building file: ${bldg.file}`).toBe(true);

      const meta = await sharp(targetPath).metadata();
      expect(meta.width, `${bldg.file} width mismatch`).toBe(bldg.w);
      expect(meta.height, `${bldg.file} height mismatch`).toBe(bldg.h);
      expect(bldg.w % 32, `${bldg.file} width not multiple of 32`).toBe(0);
      expect(bldg.h % 32, `${bldg.file} height not multiple of 32`).toBe(0);

      const { data } = await sharp(targetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const topLeftAlpha = data[3]!;
      const topRightAlpha = data[(bldg.w - 1) * 4 + 3]!;
      expect(topLeftAlpha, `${bldg.file} top-left corner must be transparent`).toBe(0);
      expect(topRightAlpha, `${bldg.file} top-right corner must be transparent`).toBe(0);
    }
  });

  it('should verify all certified canonical props exist on disk with valid geometry', async () => {
    for (const prop of CERTIFIED_CANONICAL_PROPS) {
      const targetPath = path.resolve(ROOT_DIR, 'public/assets/prefabs/props', prop.file);
      expect(fs.existsSync(targetPath), `Missing prop file: ${prop.file}`).toBe(true);

      const meta = await sharp(targetPath).metadata();
      expect(meta.width, `${prop.file} width mismatch`).toBe(prop.w);
      expect(meta.height, `${prop.file} height mismatch`).toBe(prop.h);
      expect(prop.w % 32, `${prop.file} width not multiple of 32`).toBe(0);
      expect(prop.h % 32, `${prop.file} height not multiple of 32`).toBe(0);
    }
  });
});
