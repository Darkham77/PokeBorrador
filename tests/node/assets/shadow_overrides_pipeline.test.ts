/**
 * tests/node/assets/shadow_overrides_pipeline.test.ts
 *
 * Integration test for the shadow overrides persistence, fallback, and static database regeneration pipeline.
 */

import { describe, it, expect } from 'vitest';
import { packFeetCoordinates, type PackedFeetData } from '../../../scripts/assets/helpers/catalogGenerators.ts';
import type { SpriteShadowOverride } from '../../../src/types/pokemon/spriteShadows.ts';

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
