import { describe, it, expect } from 'vitest';
import { calculateEscapeChancePure } from '../../../src/logic/battle/battleCatchMath.ts';
import { STAGE_MULTIPLIERS_STAT, STAGE_MULTIPLIERS_ACC } from '../../../src/logic/battle/battleMath.ts';
import type { PurePokemon } from '../../../src/logic/battle/battleMathTypes.ts';

describe('Audit Candidates 1:1 Showdown Parity Tests', () => {
  it('Suspect 1: battleCatchMath uses regex replacement on IDs', () => {
    const poke: PurePokemon = {
      id: 'pikachu',
      hp: 10,
      maxHp: 10,
      level: 50,
      type: 'electric',
      ability: 'static',
      heldItem: 'smokeball'
    };
    const wild: PurePokemon = {
      id: 'pidgey',
      hp: 10,
      maxHp: 10,
      level: 50,
      type: 'normal',
      ability: 'runaway'
    };
    const result = calculateEscapeChancePure(poke, wild, 1, null);
    expect(result).toBe(true);
  });

  it('Suspect 2: STAGE_MULTIPLIERS_STAT -1 value accuracy', () => {
    // Showdown canonical 2 / (2 + 1) = 2/3 = 0.6666666666666666
    const expected = 2 / 3;
    const actual = STAGE_MULTIPLIERS_STAT['-1'];
    expect(actual).toBeCloseTo(expected, 4);
  });

  it('Suspect 3: STAGE_MULTIPLIERS_ACC negative stage accuracy', () => {
    // Showdown canonical accuracy for -1 stage is 3 / (3 + 1) = 3/4 = 0.75
    // -2 stage is 3 / (3 + 2) = 3/5 = 0.60
    expect(STAGE_MULTIPLIERS_ACC['-1']).toBe(0.75);
    expect(STAGE_MULTIPLIERS_ACC['-2']).toBe(0.60);
  });

  it('Suspect 21: STAGE_MULTIPLIERS_STAT -5 value accuracy', () => {
    // Showdown canonical 2 / (2 + 5) = 2/7 ≈ 0.2857142857142857
    // In src/logic/battle/battleMath.ts, '-5' is listed as 0.28 instead of 2/7 (0.2857)
    const expected = 2 / 7;
    const actual = STAGE_MULTIPLIERS_STAT['-5'];
    expect(actual).toBeCloseTo(expected, 4);
  });
});
