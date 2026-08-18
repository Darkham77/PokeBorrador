import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  createDefaultEvs,
  calculateTotalEvs,
  applyEvGains,
  applyVitamin,
  applyFeather,
  applyEvBerry,
  applyMochi,
  resetAllEvs,
  canUseVitamin,
  canUseEvBerry,
  MAX_TOTAL_EVS,
  MAX_STAT_EVS,
  MIN_STAT_EVS,
  VITAMIN_EV_GAIN,
  MOCHI_EV_GAIN,
  FEATHER_EV_GAIN,
  BERRY_EV_REDUCTION,
  POWER_ITEM_EV_BONUS,
  MACHO_BRACE_EV_MULTIPLIER,
  POKERUS_EV_MULTIPLIER
} from '@/logic/pokemon/evMath';
import { POKEMON_STAT_KEYS } from '@/types/pokemon/pokemon';

describe('evMath - Pure Effort Value Mathematics & Bounds', () => {
  it('creates default EVs with all stats initialized to 0', () => {
    const evs = createDefaultEvs();
    for (const stat of POKEMON_STAT_KEYS) {
      assert.strictEqual(evs[stat], MIN_STAT_EVS);
    }
    assert.strictEqual(calculateTotalEvs(evs), 0);
  });

  it('calculates total EVs correctly', () => {
    const evs = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 10 };
    assert.strictEqual(calculateTotalEvs(evs), 510);
  });

  it('applies basic EV gains from defeat yield', () => {
    const initial = createDefaultEvs();
    const result = applyEvGains(initial, { spa: 1, spe: 2 });
    assert.strictEqual(result.totalGained, 3);
    assert.strictEqual(result.updatedEvs.spa, 1);
    assert.strictEqual(result.updatedEvs.spe, 2);
    assert.strictEqual(result.reachedMax, false);
  });

  it('respects the single-stat cap of 252 EVs', () => {
    const initial = { ...createDefaultEvs(), atk: 250 };
    const result = applyEvGains(initial, { atk: 3 });
    assert.strictEqual(result.totalGained, 2);
    assert.strictEqual(result.updatedEvs.atk, MAX_STAT_EVS);
  });

  it('respects the overall cap of 510 EVs across all stats', () => {
    const initial = { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 };
    // Current total = 504. Remaining allowed = 6.
    const result = applyEvGains(initial, { spe: 10 });
    assert.strictEqual(result.totalGained, 6);
    assert.strictEqual(result.updatedEvs.spe, 6);
    assert.strictEqual(result.reachedMax, true);
    assert.strictEqual(calculateTotalEvs(result.updatedEvs), MAX_TOTAL_EVS);
  });

  it('doubles EV gains when holding Macho Brace', () => {
    const initial = createDefaultEvs();
    const result = applyEvGains(initial, { atk: 2 }, 'machobrace');
    assert.strictEqual(result.totalGained, 2 * MACHO_BRACE_EV_MULTIPLIER);
    assert.strictEqual(result.updatedEvs.atk, 4);
  });

  it('adds flat +8 bonus to designated stat when holding a Power item', () => {
    const initial = createDefaultEvs();
    const result = applyEvGains(initial, { spe: 1 }, 'powerbracer');
    // powerbracer gives +8 Attack, base yield gives 1 Speed
    assert.strictEqual(result.updatedEvs.spe, 1);
    assert.strictEqual(result.updatedEvs.atk, POWER_ITEM_EV_BONUS);
    assert.strictEqual(result.totalGained, 1 + POWER_ITEM_EV_BONUS);
  });

  it('applies vitamins with +10 EVs and checks usability', () => {
    const initial = createDefaultEvs();
    assert.ok(canUseVitamin(initial, 'hp'));

    const res = applyVitamin(initial, 'hp');
    assert.ok(res.success);
    assert.strictEqual(res.gained, VITAMIN_EV_GAIN);
    assert.strictEqual(res.updatedEvs.hp, 10);

    // Max out stat
    const maxed = { ...initial, hp: 252 };
    assert.strictEqual(canUseVitamin(maxed, 'hp'), false);
    const failRes = applyVitamin(maxed, 'hp');
    assert.strictEqual(failRes.success, false);
    assert.strictEqual(failRes.gained, 0);
  });

  it('applies feathers with +1 EV and clamps properly', () => {
    const initial = createDefaultEvs();
    const res = applyFeather(initial, 'spe');
    assert.ok(res.success);
    assert.strictEqual(res.gained, FEATHER_EV_GAIN);
    assert.strictEqual(res.updatedEvs.spe, 1);
  });

  it('applies EV reducing berries (-10 EVs) down to 0', () => {
    const initial = { ...createDefaultEvs(), atk: 25 };
    assert.ok(canUseEvBerry(initial, 'atk', 100));

    const res = applyEvBerry(initial, 'atk');
    assert.ok(res.success);
    assert.strictEqual(res.reducedAmount, BERRY_EV_REDUCTION);
    assert.strictEqual(res.updatedEvs.atk, 15);

    // Reduce when less than 10
    const small = { ...createDefaultEvs(), atk: 4 };
    const resSmall = applyEvBerry(small, 'atk');
    assert.ok(resSmall.success);
    assert.strictEqual(resSmall.reducedAmount, 4);
    assert.strictEqual(resSmall.updatedEvs.atk, 0);

    // Try reducing when 0
    const zero = { ...createDefaultEvs(), atk: 0 };
    const resZero = applyEvBerry(zero, 'atk');
    assert.strictEqual(resZero.success, false);
    assert.strictEqual(resZero.reducedAmount, 0);
  });

  it('doubles EV gains when infected with Pokérus', () => {
    const initial = createDefaultEvs();
    const result = applyEvGains(initial, { atk: 1, spe: 2 }, null, true);
    assert.strictEqual(result.totalGained, (1 + 2) * POKERUS_EV_MULTIPLIER);
    assert.strictEqual(result.updatedEvs.atk, 2);
    assert.strictEqual(result.updatedEvs.spe, 4);
  });

  it('stacks Pokérus with Macho Brace (x4 multiplier)', () => {
    const initial = createDefaultEvs();
    const result = applyEvGains(initial, { atk: 2 }, 'machobrace', true);
    // 2 * 2 (Macho Brace) * 2 (Pokérus) = 8
    assert.strictEqual(result.totalGained, 2 * MACHO_BRACE_EV_MULTIPLIER * POKERUS_EV_MULTIPLIER);
    assert.strictEqual(result.updatedEvs.atk, 8);
  });

  it('stacks Pokérus with Power items', () => {
    const initial = createDefaultEvs();
    const result = applyEvGains(initial, { spe: 1 }, 'powerbracer', true);
    // powerbracer adds +8 Atk -> (0 + 8) * 2 (Pokérus) = 16 Atk
    // base yield gives 1 Spe -> 1 * 2 (Pokérus) = 2 Spe
    assert.strictEqual(result.updatedEvs.atk, POWER_ITEM_EV_BONUS * POKERUS_EV_MULTIPLIER);
    assert.strictEqual(result.updatedEvs.spe, 1 * POKERUS_EV_MULTIPLIER);
    assert.strictEqual(result.totalGained, (POWER_ITEM_EV_BONUS + 1) * POKERUS_EV_MULTIPLIER);
  });

  it('applies mochis with +10 EVs', () => {
    const initial = createDefaultEvs();
    const res = applyMochi(initial, 'spa');
    assert.ok(res.success);
    assert.strictEqual(res.gained, MOCHI_EV_GAIN);
    assert.strictEqual(res.updatedEvs.spa, 10);
  });

  it('resets all EVs to 0 using resetAllEvs', () => {
    const trained = { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 };
    const res = resetAllEvs(trained);
    assert.ok(res.success);
    assert.strictEqual(res.totalCleared, 508);
    assert.strictEqual(calculateTotalEvs(res.updatedEvs), 0);

    // If already 0, resetAllEvs returns success: false
    const zero = createDefaultEvs();
    const resZero = resetAllEvs(zero);
    assert.strictEqual(resZero.success, false);
    assert.strictEqual(resZero.totalCleared, 0);
  });
});

