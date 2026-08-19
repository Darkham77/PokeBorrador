/**
 * tests/node/pokemon_stats.test.ts
 *
 * VITEST (vite-node) — node environment
 *
 * Tests pure math from src/logic/pokemon/statsMath.ts.
 * Zero mocks required. All base stats and IVs are passed inline.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import {
  calcStatsPure,
  getExpNeededPure,
  type NatureData,
} from '../../../src/logic/pokemon/statsMath.ts';

describe('getExpNeededPure', () => {
  it('returns correctly scaled exp for level 1: (1+1)^3 - 1^3 = 8 - 1 = 7', () => {
    assert.strictEqual(getExpNeededPure(1), 7);
  });

  it('returns correctly scaled exp for level 5: 6^3 - 5^3 = 216 - 125 = 91', () => {
    assert.strictEqual(getExpNeededPure(5), 91);
  });

  it('returns 0 for level 100 or above to ensure valid JSON serialization', () => {
    assert.strictEqual(getExpNeededPure(100), 0);
    assert.strictEqual(getExpNeededPure(150), 0);
  });
});

describe('calcStatsPure', () => {
  // Base stats of Charmander
  const charmanderBase = { hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65 };
  
  // Base stats of Ditto
  const dittoBase = { hp: 48, atk: 48, def: 48, spa: 48, spd: 48, spe: 48 };

  it('calculates correct stats for a Level 5 Charmander with 0 IVs and neutral nature', () => {
    const ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    const nature = { up: null, down: null };
    
    const stats = calcStatsPure(5, ivs, charmanderBase, nature);
    
    // Formula HP: floor((39 * 2 + 0) * 5 / 100 + 5 + 10) = floor(3.9 + 15) = 18
    assert.strictEqual(stats.maxHp, 18);
    // Formula Atk: floor((52 * 2 + 0) * 5 / 100 + 5) = floor(5.2 + 5) = 10
    assert.strictEqual(stats.atk, 10);
    assert.strictEqual(stats.def, 9);
    assert.strictEqual(stats.spa, 11);
    assert.strictEqual(stats.spd, 10);
    assert.strictEqual(stats.spe, 11);
  });

  it('calculates correct stats for a Level 100 Charmander with perfect 31 IVs and neutral nature', () => {
    const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    const nature = { up: null, down: null };
    
    const stats = calcStatsPure(100, ivs, charmanderBase, nature);
    
    // Formula HP: floor((39 * 2 + 31) * 100 / 100 + 100 + 10) = 109 + 110 = 219
    assert.strictEqual(stats.maxHp, 219);
    // Formula Atk: floor((52 * 2 + 31) * 100 / 100 + 5) = 135 + 5 = 140
    assert.strictEqual(stats.atk, 140);
  });

  it('applies nature multipliers correctly (Firme/Adamant: +Atk, -Spa)', () => {
    const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    const nature: NatureData = { up: 'atk', down: 'spa' };
    
    const stats = calcStatsPure(100, ivs, charmanderBase, nature);
    
    // Neutral Atk at 100 with 31 IVs = 140. With nature: floor(140 * 1.1) = 154
    assert.strictEqual(stats.atk, 154);
    
    // Neutral Spa at 100 with 31 IVs = floor((60 * 2 + 31) * 100 / 100 + 5) = 156
    // With nature: floor(156 * 0.9) = 140
    assert.strictEqual(stats.spa, 140);
  });

  it('applies Metal Powder bonus to Ditto (1.5x Defense)', () => {
    const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    const nature = { up: null, down: null };
    
    // Without Metal Powder
    const statsNormal = calcStatsPure(50, ivs, dittoBase, nature, false);
    // Formula Def: floor((48 * 2 + 31) * 50 / 100 + 5) = floor(127 * 0.5 + 5) = floor(63.5 + 5) = 68
    assert.strictEqual(statsNormal.def, 68);
    
    // With Metal Powder
    const statsMetal = calcStatsPure(50, ivs, dittoBase, nature, true);
    // 68 * 1.5 = 102
    assert.strictEqual(statsMetal.def, 102);
  });
  
  it('falls back to atk/def for spa/spd if base does not have them', () => {
    const gen1Base = { hp: 45, atk: 49, def: 49 }; // Bulbasaur Gen 1 style missing spa/spd/spe
    const ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    const nature = { up: null, down: null };
    
    const stats = calcStatsPure(50, ivs, gen1Base, nature, false);
    
    assert.strictEqual(stats.spa, stats.atk); // falls back to atk
    assert.strictEqual(stats.spd, stats.def); // falls back to def
    // spe falls back to 45 by default
    assert.strictEqual(stats.spe, Math.floor((45 * 2 + 0) * 50 / 100 + 5)); 
  });
});
