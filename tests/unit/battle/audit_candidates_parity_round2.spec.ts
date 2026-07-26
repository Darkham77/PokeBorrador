import { describe, it, expect } from 'vitest';
import { calculateCatchRatePure } from '../../../src/logic/battle/battleCatchMath.ts';
import { STAGE_MULTIPLIERS_STAT, STAGE_MULTIPLIERS_ACC } from '../../../src/logic/battle/battleMath.ts';

describe('Audit Round 2 Candidates Parity Tests', () => {
  it('Suspect 1: STAGE_MULTIPLIERS_ACC accuracy stage -6 and +6 bounds', () => {
    expect(STAGE_MULTIPLIERS_ACC['-6']).toBe(0.33);
    expect(STAGE_MULTIPLIERS_ACC['6']).toBe(3.0);
  });

  it('Suspect 2: STAGE_MULTIPLIERS_STAT positive and negative symmetry', () => {
    expect(STAGE_MULTIPLIERS_STAT['0']).toBe(1.0);
    expect(STAGE_MULTIPLIERS_STAT['1']).toBe(1.5);
    expect(STAGE_MULTIPLIERS_STAT['-1']).toBe(2 / 3);
  });

  it('Suspect 13: Catch rate status multiplier for Sleep/Freeze vs Poison/Burn', () => {
    const slpMon = { id: 'pikachu', hp: 10, maxHp: 10, catchRate: 45, status: 'slp' as const };
    const psnMon = { id: 'pikachu', hp: 10, maxHp: 10, catchRate: 45, status: 'psn' as const };
    
    const slpRes = calculateCatchRatePure(slpMon, 'poke-ball', 1, {});
    const psnRes = calculateCatchRatePure(psnMon, 'poke-ball', 1, {});
    
    expect(slpRes.statusMultiplierApplied).toBe(true);
    expect(psnRes.statusMultiplierApplied).toBe(true);
  });
});
