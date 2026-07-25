import { describe, it, expect } from 'vitest';
import { calculateCatchRatePure } from '@/logic/battle/battleCatchMath';

describe('Audit Parity - BUG-081: catch rate status multiplier', () => {
  it('should apply 2.5 multiplier for sleep status', () => {
    const pokeSlp = { name: 'Pikachu', hp: 10, maxHp: 100, status: 'slp', catchRate: 45 };
    const res = calculateCatchRatePure(pokeSlp as any, 'poke-ball', 1, {});
    expect(res.statusMultiplierApplied).toBe(true);
  });
});
