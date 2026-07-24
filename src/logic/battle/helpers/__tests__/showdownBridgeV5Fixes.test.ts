// src/logic/battle/helpers/__tests__/showdownBridgeV5Fixes.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getEffectiveStatPure } from '../../battleMath.ts';
import { ACTIVE_GENERATION } from '../../../../data/system/constants.ts';

describe('Showdown Audit v5 Fixes Unit Tests', () => {
  it('respects ACTIVE_GENERATION in paralysis speed reduction (NEW-31)', () => {
    const poke = {
      uid: 'test1',
      id: 'pikachu',
      name: 'Pikachu',
      level: 50,
      exp: 0,
      expNeeded: 100,
      hp: 100,
      maxHp: 100,
      atk: 100,
      def: 100,
      spa: 100,
      spd: 100,
      spe: 100,
      type: 'electric',
      status: 'par' as const,
      moves: [],
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      nature: 'hardy'
    };

    const emptyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 };
    const speedVal = getEffectiveStatPure(poke, 'spe', emptyStages, null);
    const expectedMult = ACTIVE_GENERATION <= 6 ? 0.25 : 0.5;
    assert.equal(speedVal, Math.floor(100 * expectedMult));
  });
});
