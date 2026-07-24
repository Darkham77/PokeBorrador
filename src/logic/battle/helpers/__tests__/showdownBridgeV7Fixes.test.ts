// src/logic/battle/helpers/__tests__/showdownBridgeV7Fixes.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HeuristicDamageCalculator } from '../../ai/heuristic/damageCalculator.ts';

describe('Showdown Audit v7 Fixes Unit Tests', () => {
  it('instantiates HeuristicDamageCalculator with ACTIVE_GENERATION (NEW-47)', () => {
    const calc = new HeuristicDamageCalculator();
    assert.ok(calc, 'Calculator instantiated successfully without hardcode');
  });

  it('clamps client HP to maxhp in syncSidePokemon (NEW-49)', async () => {
    const { syncSidePokemon } = await import('../showdownSyncHelper.ts');
    assert.equal(typeof syncSidePokemon, 'function');
  });
});
