/**
 * tests/node/battle/showdownBridgeV5Fixes.test.ts
 *
 * Unit tests for Round 5 Showdown audit fixes:
 * - Paralysis speed reduction uses ACTIVE_GENERATION (not hardcoded)
 */
import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { getEffectiveStatPure } from '../../../src/logic/battle/battleMath.ts';
import { ACTIVE_GENERATION } from '../../../src/data/system/constants.ts';

describe('Showdown Audit v5 Fixes Unit Tests', () => {
  it('respects ACTIVE_GENERATION in paralysis speed reduction', () => {
    const poke = {
      level: 50,
      spe: 100,
      type: 'electric' as const,
      status: 'par' as const,
    };

    // BattleStages uses native Showdown IDs: accuracy, evasion (not acc, eva)
    const emptyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 };
    const speedVal = getEffectiveStatPure(poke, 'spe', emptyStages, null);
    const expectedMult = ACTIVE_GENERATION <= 6 ? 0.25 : 0.5;
    assert.equal(speedVal, Math.floor(100 * expectedMult));
  });
});
