import { describe, it, expect } from 'vitest'
import { calculateDamageForTooltip } from '@/logic/battle/smogonAdapter'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

describe('Smogon Adapter custom stats injection', () => {
  it('should use custom stats and not default species stats', () => {
    // Level 6 Charmander with custom stats: Atk = 10, Def = 7, HP = 13
    const attacker = {
      id: 'charmander',
      uid: 'att_1',
      level: 6,
      atk: 10,
      def: 7,
      spa: 10,
      spd: 7,
      spe: 10,
      maxHp: 13,
      hp: 13,
      type: 'fire',
      ability: 'blaze'
    } as unknown as Pokemon;

    const defender = {
      id: 'charmander',
      uid: 'def_1',
      level: 6,
      atk: 10,
      def: 7,
      spa: 10,
      spd: 7,
      spe: 10,
      maxHp: 13,
      hp: 13,
      type: 'fire',
      ability: 'blaze'
    } as unknown as Pokemon;

    const move = {
      id: 'scratch',
      name: 'Scratch',
      power: 40,
      type: 'normal',
      cat: 'physical'
    } as unknown as Move;

    const result = calculateDamageForTooltip(attacker, defender, move, {}, {}, {});
    expect(result).not.toBeNull();
    // Scratch with 10 Atk and 7 Def at Level 6 should deal 5-6 damage
    expect(result!.minDmg).toBe(5);
    expect(result!.maxDmg).toBe(6);
  });
});
