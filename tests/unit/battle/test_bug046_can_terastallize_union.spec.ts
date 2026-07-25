import { describe, it, expect } from 'vitest';
import type { ShowdownRequestPokemon } from '@/logic/battle/helpers/showdownTeamMapper';

describe('Audit Parity - BUG-046: canTerastallize union type', () => {
  it('should allow boolean false for canTerastallize in request pokemon type', () => {
    const poke: ShowdownRequestPokemon = {
      ident: 'p1: Ogerpon',
      details: 'Ogerpon, L100',
      condition: '100/100',
      active: true,
      stats: { atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
      moves: ['ivycudgel'],
      baseAbility: 'defiant',
      item: 'wellspringmask',
      pokeball: 'pokeball',
      canTerastallize: false
    };
    expect(poke.canTerastallize).toBe(false);
  });
});
