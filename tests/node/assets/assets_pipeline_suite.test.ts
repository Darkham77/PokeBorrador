/**
 * tests/node/assets/assets_pipeline_suite.test.ts
 *
 * Consolidated Suite for Asset Pipeline & Bound Analysis:
 * 1. Asset Bound Analyzer: Feet points calculation, transparent bounds, body metrics.
 * 2. Shadow Overrides Pipeline: Manual overrides, NPC/Trainer flying, shadow scale packing, feet database regeneration.
 */

import { describe, it, expect } from 'vitest';
import {
  findFeetPointsFromBuffer,
  analyzeImageBufferBounds,
  DEFAULT_FEET_Y,
  DEFAULT_FEET_X,
  DEFAULT_BODY_H,
  DEFAULT_BODY_W
} from '../../../scripts/assets/helpers/assetBoundAnalyzer.ts';
import { packFeetCoordinates, type PackedFeetData } from '../../../scripts/assets/helpers/catalogGenerators.ts';
import type { SpriteShadowOverride } from '../../../src/types/pokemon/spriteShadows.ts';

describe('Assets Pipeline Suite', () => {
  describe('assetBoundAnalyzer', () => {
    it('returns default feet points when buffer has fewer than 4 channels', () => {
      const rawBuffer = Buffer.alloc(100);
      const result = findFeetPointsFromBuffer(rawBuffer, 10, 10, 3);
      expect(result.feetY).toBe(DEFAULT_FEET_Y);
      expect(result.feetX).toBe(DEFAULT_FEET_X);
    });

    it('returns default feet points when image is fully transparent', () => {
      const rawBuffer = Buffer.alloc(16 * 16 * 4, 0);
      const result = findFeetPointsFromBuffer(rawBuffer, 16, 16, 4);
      expect(result.feetY).toBe(DEFAULT_FEET_Y);
      expect(result.feetX).toBe(DEFAULT_FEET_X);
    });

    it('calculates feet points accurately for a centered opaque box', () => {
      const size = 10;
      const buf = Buffer.alloc(size * size * 4, 0);

      // Place an opaque 4x4 box from y=4..7, x=3..6
      for (let y = 4; y <= 7; y++) {
        for (let x = 3; x <= 6; x++) {
          const idx = (y * size + x) * 4;
          buf[idx + 3] = 255; // fully opaque
        }
      }

      const result = findFeetPointsFromBuffer(buf, size, size, 4);
      // lowest opaque y is 7 -> feetY = 7/10 = 0.7
      // minX = 3, maxX = 6 -> center = 4.5 -> feetX = 4.5/10 = 0.45
      expect(result.feetY).toBe(0.7);
      expect(result.feetX).toBe(0.45);
    });

    it('analyzes image bounds and returns body metrics', () => {
      const size = 20;
      const buf = Buffer.alloc(size * size * 4, 0);

      // Place opaque pixels from y=10..19, x=5..14 (h=10, w=10)
      for (let y = 10; y <= 19; y++) {
        for (let x = 5; x <= 14; x++) {
          const idx = (y * size + x) * 4;
          buf[idx + 3] = 255;
        }
      }

      const bounds = analyzeImageBufferBounds(buf, size, 4);
      expect(bounds.feetY).toBe(0.95);
      expect(bounds.feetX).toBe(0.475);
      expect(bounds.bodyH).toBe(0.5); // 10/20
      expect(bounds.bodyW).toBe(0.5); // 10/20
      expect(bounds.bodyRadius).toBe(0.25);
    });

    it('returns default bounds when analyzeImageBufferBounds encounters fully transparent buffer', () => {
      const size = 10;
      const buf = Buffer.alloc(size * size * 4, 0);
      const bounds = analyzeImageBufferBounds(buf, size, 4);
      expect(bounds.feetY).toBe(DEFAULT_FEET_Y);
      expect(bounds.feetX).toBe(DEFAULT_FEET_X);
      expect(bounds.bodyH).toBe(DEFAULT_BODY_H);
      expect(bounds.bodyW).toBe(DEFAULT_BODY_W);
    });
  });

  describe('shadow_overrides_pipeline', () => {
    it('applies manual overrides over automatic calculations during packing', () => {
      const mockDb: Record<string, { feetY: number; feetX: number }> = {
        '/assets/sprites/pokemon/animated/Front/12i.webp': { feetY: 0.92, feetX: 0.51 },
        '/assets/sprites/pokemon/animated/Front/1i.webp': { feetY: 0.88, feetX: 0.50 }
      };

      const mockOverrides: Record<string, SpriteShadowOverride> = {
        '/assets/sprites/pokemon/animated/Front/12i.webp': {
          feetY: 0.70,
          feetX: 0.55,
          isFlying: true
        }
      };

      const packed: PackedFeetData = {
        p: {},
        n: {},
        t: {},
        c: {}
      };

      packFeetCoordinates(mockDb, packed, mockOverrides);

      // 1. Butterfree (12i) should have overridden coordinates AND isFlying: 1 (tuple of 3 elements)
      const butterfreeTuple = packed.p['animated/Front/12i'];
      expect(butterfreeTuple).toBeDefined();
      expect(butterfreeTuple![0]).toBe(0.70);
      expect(butterfreeTuple![1]).toBe(0.55);
      expect(butterfreeTuple![2]).toBe(1);

      // 2. Bulbasaur (1i) had no override -> fallback to automatic precalculated coordinates (tuple of 2 elements)
      const bulbasaurTuple = packed.p['animated/Front/1i'];
      expect(bulbasaurTuple).toBeDefined();
      expect(bulbasaurTuple![0]).toBe(0.88);
      expect(bulbasaurTuple![1]).toBe(0.50);
      expect(bulbasaurTuple![2]).toBeUndefined();
    });

    it('supports NPC and Trainer overrides with isFlying', () => {
      const mockDb: Record<string, { feetY: number; feetX: number }> = {
        '/assets/sprites/npc/ghost_girl.webp': { feetY: 0.90, feetX: 0.50 },
        '/assets/sprites/trainers/rocket.webp': { feetY: 0.95, feetX: 0.50 }
      };

      const mockOverrides: Record<string, SpriteShadowOverride> = {
        '/assets/sprites/npc/ghost_girl.webp': {
          feetY: 0.65,
          feetX: 0.52,
          isFlying: true
        }
      };

      const packed: PackedFeetData = {
        p: {},
        n: {},
        t: {},
        c: {}
      };

      packFeetCoordinates(mockDb, packed, mockOverrides);

      // Ghost girl (NPC) is flying
      expect(packed.n['ghost_girl']).toEqual([0.65, 0.52, 1]);

      // Rocket (Trainer) is ground (fallback)
      expect(packed.t['rocket']).toEqual([0.95, 0.50]);
    });

    it('packs custom shadowScale into the 4th tuple element during serialization', () => {
      const mockDb: Record<string, { feetY: number; feetX: number }> = {
        '/assets/sprites/pokemon/animated/Front/95i.webp': { feetY: 0.95, feetX: 0.50 }
      };

      const mockOverrides: Record<string, SpriteShadowOverride> = {
        '/assets/sprites/pokemon/animated/Front/95i.webp': {
          feetY: 0.95,
          feetX: 0.50,
          isFlying: false,
          shadowScale: 1.80
        }
      };

      const packed: PackedFeetData = {
        p: {},
        n: {},
        t: {},
        c: {}
      };

      packFeetCoordinates(mockDb, packed, mockOverrides);

      // Onix (95i) with custom scale 1.80 should pack 4-tuple [feetY, feetX, 0, 1.8]
      const onixTuple = packed.p['animated/Front/95i'];
      expect(onixTuple).toEqual([0.95, 0.50, 0, 1.80]);
    });

    it('regenerates pokemonFeetDatabase.json and unpacks isFlying correctly via requireFeetPoints', async () => {
      const { regenerateFeetDatabase } = await import('../../../scripts/assets/helpers/catalogGenerators.ts');
      const { requireFeetPoints } = await import('../../../src/data/pokemon/pokemonFeetDatabase.ts');

      await regenerateFeetDatabase();

      // 1. Butterfree (animated front) was populated from POKEMON_AESTHETICS (floating: true)
      const butterfree = requireFeetPoints('/assets/sprites/pokemon/animated/Front/12i.webp');
      expect(butterfree.isFlying).toBe(true);
      expect(butterfree.feetY).toBeGreaterThan(0);
      expect(butterfree.feetX).toBeGreaterThan(0);

      // 2. Bulbasaur (animated front) is ground (not floating)
      const bulbasaur = requireFeetPoints('/assets/sprites/pokemon/animated/Front/1i.webp');
      expect(bulbasaur.isFlying).toBeUndefined();
      expect(bulbasaur.feetY).toBeGreaterThan(0);
      expect(bulbasaur.feetX).toBeGreaterThan(0);
    });

    it('reports progress events from 0% to 100% when onProgress callback is provided', async () => {
      const { regenerateFeetDatabase } = await import('../../../scripts/assets/helpers/catalogGenerators.ts');
      const progressEvents: { progress: number; message: string }[] = [];

      await regenerateFeetDatabase((progress, message) => {
        progressEvents.push({ progress, message });
      });

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]!.progress).toBe(10);
      expect(progressEvents[progressEvents.length - 1]!.progress).toBe(100);
      expect(progressEvents[progressEvents.length - 1]!.message).toContain('éxito');
    });
  });
});
