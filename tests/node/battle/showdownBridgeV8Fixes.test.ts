/**
 * tests/node/battle/showdownBridgeV8Fixes.test.ts
 *
 * Unit tests for Round 8 Showdown audit fixes:
 * - BattleAgent decideSingleSlot accepts targetLocation
 * - BattleAgent decideForcedSwitch handles reviving flag
 */
import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { BattleAgent } from '../../../scripts/e2e/fuzzer/core/fuzzer_agent.ts';
import type { ActiveSlotRequest } from '../../../src/logic/battle/helpers/showdownBattleAgent.ts';
import type { ChoiceRequest } from '../../../src/logic/battle/helpers/requestHelper.ts';

describe('Showdown Audit v8 Fixes Unit Tests', () => {
  it('accepts targetLocation in BattleAgent decideSingleSlot without errors', () => {
    const agent = new BattleAgent('p1');
    const mockSlotReq: ActiveSlotRequest = {
      moves: [{ id: 'tackle', disabled: false, pp: 35 }]
    };
    const mockFullReq: ChoiceRequest = {
      side: {
        pokemon: [{ ident: 'p1a: mon', details: 'mon', active: true, condition: '100/100', moves: ['tackle'], stats: { hp: 100 }, ability: 'blaze' }]
      }
    };
    // Accessing protected method via cast
    const choice = (agent as unknown as { decideSingleSlot: (s: ActiveSlotRequest, i: number, r: ChoiceRequest, t?: number) => string })
      .decideSingleSlot(mockSlotReq, 0, mockFullReq, 1);

    assert.ok(choice.includes('move 1 1'), `Expected choice to contain targetLocation "move 1 1", got "${choice}"`);
  });

  it('handles reviving flag in decideForcedSwitch', () => {
    const agent = new BattleAgent('p1');
    const mockFullReq: ChoiceRequest = {
      forceSwitch: [{ reviving: true } as unknown as boolean],
      side: {
        pokemon: [
          { ident: 'p1a: mon1', details: 'mon1', active: true, condition: '100/100', moves: ['tackle'], stats: { hp: 100 }, ability: 'blaze' },
          { ident: 'p1a: mon2', details: 'mon2', active: false, condition: '0 fnt', moves: ['tackle'], stats: { hp: 0 }, ability: 'blaze' }
        ]
      }
    };
    const choice = (agent as unknown as { decideForcedSwitch: (r: ChoiceRequest) => string })
      .decideForcedSwitch(mockFullReq);

    assert.equal(choice, 'switch 2', `Expected switch to fainted slot 2 when reviving: true, got "${choice}"`);
  });
});
