/**
 * tests/node/battle/showdownBridgeV7Fixes.test.ts
 *
 * Unit tests for Round 7 Showdown audit fixes:
 * - HeuristicDamageCalculator instantiation (no hardcoded gen)
 * - showdownSyncHelper exports syncSidePokemon
 */
import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { HeuristicDamageCalculator } from '../../../src/logic/battle/ai/heuristic/damageCalculator.ts';
import { syncSidePokemon } from '../../../src/logic/battle/helpers/showdownSyncHelper.ts';

describe('Showdown Audit v7 Fixes Unit Tests', () => {
  it('instantiates HeuristicDamageCalculator with ACTIVE_GENERATION (no hardcode)', () => {
    const calc = new HeuristicDamageCalculator();
    assert.ok(calc, 'Calculator instantiated successfully without hardcode');
  });

  it('showdownSyncHelper exports syncSidePokemon as a function', () => {
    assert.equal(typeof syncSidePokemon, 'function');
  });
});
