import { describe, it, expect } from 'vitest';
import {
  calculateMovePower,
  calculateMoveAccuracy,
  calculateCritChance
} from '@/logic/battle/moveTooltipMath';
import { parseStatusEffectInfo } from '@/logic/battle/tooltip/moveTooltipConditions';
import type { Move } from '@/types/pokemon/pokemon';
import type { PurePokemon } from '@/logic/battle/battleMath';

describe('moveTooltipMath & moveTooltipConditions - O(1) Lookups & Modifiers', () => {
  const dummyAttacker: PurePokemon = {
    id: 'charizard',
    name: 'Charizard',
    level: 50,
    type: 'fire',
    type2: 'flying',
    hp: 100,
    maxHp: 100,
    atk: 84,
    def: 78,
    spa: 109,
    spd: 85,
    spe: 100,
    ability: 'blaze',
    heldItem: 'charcoal'
  };

  const dummyDefender: PurePokemon = {
    id: 'venusaur',
    name: 'Venusaur',
    level: 50,
    type: 'grass',
    type2: 'poison',
    hp: 100,
    maxHp: 100,
    atk: 82,
    def: 83,
    spa: 100,
    spd: 100,
    spe: 80,
    ability: 'overgrow',
    heldItem: undefined
  };

  it('should calculate base power with STAB and held item charcoal in O(1)', () => {
    const move: Move = {
      id: 'flamethrower',
      name: 'Lanzallamas',
      type: 'fire',
      cat: 'special',
      power: 90,
      acc: 100,
      pp: 15,
      maxPP: 15
    };

    const res = calculateMovePower(
      move,
      dummyAttacker,
      dummyDefender,
      null,
      'clear',
      undefined,
      90
    );

    // 90 * 1.5 (STAB) = 135 * 1.2 (charcoal) = 162
    expect(res.final).toBe(162);
    expect(res.list.some(l => l.label.includes('STAB'))).toBe(true);
    expect(res.list.some(l => l.label.includes('charcoal'))).toBe(true);
  });

  it('should calculate move accuracy with weather modifications in O(1)', () => {
    const move: Move = {
      id: 'thunder',
      name: 'Trueno',
      type: 'electric',
      cat: 'special',
      power: 110,
      acc: 70,
      pp: 10,
      maxPP: 10
    };

    const rainAcc = calculateMoveAccuracy(
      move,
      { type: 'rain', turns: 5 },
      'rain',
      undefined,
      70,
      0,
      0
    );
    expect(rainAcc.final).toBe(100);
  });

  it('should calculate crit chance accurately', () => {
    const crit = calculateCritChance(dummyAttacker, dummyDefender);
    expect(crit.value).toBeDefined();
    expect(crit.class).toBe('neutral');
  });

  it('should parse secondary status effects from moveTooltipConditions', () => {
    const moveWithStatus: Move = {
      id: 'toxic',
      name: 'Tóxico',
      type: 'poison',
      cat: 'status',
      power: 0,
      acc: 90,
      pp: 10,
      maxPP: 10,
      status: 'tox'
    };

    const effectInfo = parseStatusEffectInfo(
      moveWithStatus,
      dummyAttacker,
      dummyDefender,
      null,
      null
    );

    expect(effectInfo).not.toBeNull();
    expect(effectInfo?.isCondition).toBe(true);
    expect(effectInfo?.label).toBe('Envenenamiento Grave');
  });
});
