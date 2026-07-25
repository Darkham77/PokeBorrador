import { describe, it, expect } from 'vitest';
import { calculateCatchRatePure } from '../../../src/logic/battle/battleCatchMath.ts';

describe('Audit Reproduction Test - Showdown Parity Bugs', () => {
  it('reproduces statusBonus missing in catch rate formula', () => {
    const pNormal = { hp: 10, maxHp: 100, status: '' };
    const pSleep = { hp: 10, maxHp: 100, status: 'slp' };

    const resNormal = calculateCatchRatePure(pNormal as any, 'poke-ball');
    const resSleep = calculateCatchRatePure(pSleep as any, 'poke-ball');

    // Comprueba que actualmente son IDÉNTICOS porque se ignora el status en el cálculo
    expect(resSleep.caught).toBe(resNormal.caught);
    // Debe fallar al exigir que el status afecte la tasa de captura
    expect((resSleep as any).statusMultiplierApplied).toBe(true);
  });
});
