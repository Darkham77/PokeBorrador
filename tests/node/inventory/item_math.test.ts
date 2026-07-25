/**
 * tests/node/item_math.test.ts
 *
 * VITEST (vite-node) — node environment
 *
 * Tests pure item effect math from src/logic/items/itemMath.ts.
 * All data is passed inline — zero mocks, zero Pinia, zero Vue.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import {
  canHeal,
  canClearStatus,
  healHpPure,
  revivePure,
  clearStatusPure,
  curaTotalPure,
  restorePPPure,
  calcTotalPower,
  calcRocketSellPrice,
} from '../../../src/logic/items/itemMath.ts';

import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMon(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    uid: 'test', id: 'pikachu', name: 'Pikachu', level: 25,
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

// ── canHeal ───────────────────────────────────────────────────────────────────

describe('canHeal', () => {
  it('returns true when HP is below max', () => {
    assert.ok(canHeal(makeMon({ hp: 30, maxHp: 60 })));
  });

  it('returns false when HP is full', () => {
    assert.ok(!canHeal(makeMon({ hp: 60, maxHp: 60 })));
  });

  it('returns false when HP is 0 (fainted)', () => {
    assert.ok(!canHeal(makeMon({ hp: 0, maxHp: 60 })));
  });
});

// ── canClearStatus ────────────────────────────────────────────────────────────

describe('canClearStatus', () => {
  it('returns true for matching status', () => {
    assert.ok(canClearStatus(makeMon({ status: 'psn' }), 'psn'));
  });

  it('returns false for non-matching status', () => {
    assert.ok(!canClearStatus(makeMon({ status: 'brn' }), 'psn'));
  });

  it('returns false when no status', () => {
    assert.ok(!canClearStatus(makeMon({ status: '' }), 'psn'));
  });

  it('returns true for "any" when any status is present', () => {
    assert.ok(canClearStatus(makeMon({ status: 'par' }), 'any'));
  });

  it('returns false when fainted (hp=0)', () => {
    assert.ok(!canClearStatus(makeMon({ hp: 0, status: 'psn' }), 'psn'));
  });
});

// ── healHpPure ────────────────────────────────────────────────────────────────

describe('healHpPure', () => {
  it('heals partial HP correctly', () => {
    const result = healHpPure(makeMon({ hp: 30, maxHp: 60 }), 20);
    assert.ok(result.success);
    assert.strictEqual(result.newHp, 50);
    assert.ok(result.message.includes('20'));
  });

  it('caps at maxHp', () => {
    const result = healHpPure(makeMon({ hp: 55, maxHp: 60 }), 20);
    assert.strictEqual(result.newHp, 60);
  });

  it('fails when HP is full', () => {
    const result = healHpPure(makeMon({ hp: 60, maxHp: 60 }), 20);
    assert.ok(!result.success);
    assert.strictEqual(result.newHp, 60);
  });

  it('fails when fainted', () => {
    const result = healHpPure(makeMon({ hp: 0, maxHp: 60 }), 20);
    assert.ok(!result.success);
    assert.strictEqual(result.newHp, 0);
  });

  it('does NOT mutate the original pokemon', () => {
    const p = makeMon({ hp: 30, maxHp: 60 });
    healHpPure(p, 20);
    assert.strictEqual(p.hp, 30); // unchanged
  });
});

// ── revivePure ────────────────────────────────────────────────────────────────

describe('revivePure', () => {
  it('revives a fainted pokemon with specified HP', () => {
    const result = revivePure(makeMon({ hp: 0 }), 30);
    assert.ok(result.success);
    assert.strictEqual(result.newHp, 30);
  });

  it('fails if pokemon is not fainted', () => {
    const result = revivePure(makeMon({ hp: 10 }), 30);
    assert.ok(!result.success);
  });
});

// ── clearStatusPure ───────────────────────────────────────────────────────────

describe('clearStatusPure', () => {
  it('clears matching poison status', () => {
    const r = clearStatusPure('poison', 30, 'poison');
    assert.ok(r.success);
    assert.ok(r.message.includes('poison'));
  });

  it('fails for mismatched status', () => {
    assert.ok(!clearStatusPure('burn', 30, 'poison').success);
  });

  it('fails when no status', () => {
    assert.ok(!clearStatusPure(null, 30, 'poison').success);
  });

  it('fails when fainted', () => {
    assert.ok(!clearStatusPure('psn', 0, 'psn').success);
  });

  it('"any" target clears any status', () => {
    assert.ok(clearStatusPure('brn', 30, 'any').success);
    assert.ok(clearStatusPure('frz', 30, 'any').success);
  });
});

// ── curaTotalPure ─────────────────────────────────────────────────────────────

describe('curaTotalPure', () => {
  it('heals a damaged pokemon to full', () => {
    const r = curaTotalPure(makeMon({ hp: 30, maxHp: 60, status: '' }));
    assert.ok(r.success);
    assert.strictEqual(r.newHp, 60);
  });

  it('heals a poisoned pokemon', () => {
    const r = curaTotalPure(makeMon({ hp: 30, maxHp: 60, status: 'psn' }));
    assert.ok(r.success);
  });

  it('fails when already at full HP and no status', () => {
    assert.ok(!curaTotalPure(makeMon({ hp: 60, maxHp: 60, status: '' })).success);
  });

  it('fails when fainted', () => {
    assert.ok(!curaTotalPure(makeMon({ hp: 0, maxHp: 60 })).success);
  });
});

// ── restorePPPure ─────────────────────────────────────────────────────────────

describe('restorePPPure', () => {
  it('restores PP for depleted moves', () => {
    const moves = [{ name: 'Placaje', pp: 5, maxPP: 35 }];
    const r = restorePPPure(moves, 10);
    assert.ok(r.success);
    assert.strictEqual(r.changes[0]!.restored, 10);
  });

  it('caps at maxPP', () => {
    const moves = [{ name: 'Placaje', pp: 30, maxPP: 35 }];
    const r = restorePPPure(moves, 20);
    assert.strictEqual(r.changes[0]!.restored, 5);
  });

  it('fails when all moves are full', () => {
    const moves = [{ name: 'Placaje', pp: 35, maxPP: 35 }];
    assert.ok(!restorePPPure(moves, 10).success);
  });

  it('skips null moves', () => {
    const moves = [null, { name: 'Placaje', pp: 5, maxPP: 35 }];
    const r = restorePPPure(moves, 10);
    assert.ok(r.success);
    assert.strictEqual(r.changes.length, 1);
  });
});

// ── calcTotalPower ────────────────────────────────────────────────────────────

describe('calcTotalPower', () => {
  it('pikachu with perfect IVs = BST(320) + IVs(186) = 506', () => {
    const base = { hp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 };
    const ivs  = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    assert.strictEqual(calcTotalPower(base, ivs), 506);
  });

  it('bulbasaur with zero IVs = BST(318) + IVs(0) = 318', () => {
    const base = { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 };
    const ivs  = { hp: 0,  atk: 0,  def: 0,  spa: 0,  spd: 0,  spe: 0  };
    assert.strictEqual(calcTotalPower(base, ivs), 318);
  });
});

// ── calcRocketSellPrice ───────────────────────────────────────────────────────

describe('calcRocketSellPrice', () => {
  it('level 50, perfect IVs returns expected price', () => {
    const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    // (50*50 + (186/186)*500) * 0.8 = (2500+500)*0.8 = 2400
    assert.strictEqual(calcRocketSellPrice(50, ivs), 2400);
  });

  it('level 1, zero IVs returns minimum price', () => {
    const ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    // (1*50 + 0) * 0.8 = 40
    assert.strictEqual(calcRocketSellPrice(1, ivs), 40);
  });
});
