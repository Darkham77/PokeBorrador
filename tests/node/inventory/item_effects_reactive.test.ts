/**
 * tests/node/inventory/item_effects_reactive.test.ts
 *
 * Regression: isValidTarget must not crash when receiving a Vue reactive Proxy.
 * Root cause: structuredClone() cannot clone Proxy objects; toRaw() must be
 * applied first, exactly as orchestrator.ts already does.
 *
 * This test MUST FAIL before the fix and PASS after it.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { reactive } from 'vue';
import { isValidTarget } from '../../../src/logic/items/itemEffects.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

function makeMon(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    uid: 'test-uid', id: 'pikachu', name: 'Pikachu', level: 25,
    hp: 30, maxHp: 60, status: null,
    moves: [{ name: 'Placaje', pp: 10, maxPP: 35 }],
    atk: 55, def: 40, spa: 50, spd: 50, spe: 90,
    type: 'electric', nature: 'Fuerte', ability: 'Estática',
    ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
    exp: 0, expNeeded: 1000, friendship: 70, vigor: 5, isShiny: false,
    gender: 'M', nickname: null, heldItem: null,
    obtainedAt: 0, sleepTurns: 0,
    ...overrides,
  } as unknown as Pokemon;
}

describe('isValidTarget — reactive proxy safety', () => {
  it('does not crash when pokemon is a Vue reactive Proxy (regression for structuredClone crash)', () => {
    // Simulate what the battle store passes: a reactive Pinia/Vue proxy
    const reactiveMon = reactive(makeMon({ hp: 30, maxHp: 60, status: undefined }));

    // This MUST NOT throw "structuredClone: #<Object> could not be cloned"
    assert.doesNotThrow(() => {
      isValidTarget('potion', reactiveMon as unknown as Pokemon);
    }, 'isValidTarget must not throw when receiving a Vue reactive Proxy');
  });

  it('returns true for potion on a reactive proxy with HP below max', () => {
    const reactiveMon = reactive(makeMon({ hp: 30, maxHp: 60, status: undefined }));
    assert.ok(isValidTarget('potion', reactiveMon as unknown as Pokemon));
  });

  it('returns false for potion on a reactive proxy with full HP', () => {
    const reactiveMon = reactive(makeMon({ hp: 60, maxHp: 60, status: undefined }));
    assert.ok(!isValidTarget('potion', reactiveMon as unknown as Pokemon));
  });

  it('isValidTarget operates declaratively without throwing on reactive proxies', () => {
    const reactiveMon = reactive(makeMon());
    assert.doesNotThrow(() => isValidTarget('potion', reactiveMon as unknown as Pokemon));
  });
});
