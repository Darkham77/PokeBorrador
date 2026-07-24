/**
 * tests/node/battle/showdownBridgeV4Fixes.test.ts
 *
 * Unit tests for Round 4 Showdown audit fixes:
 * - ShowdownBattleRunner supports 4 seats dynamically (p1–p4)
 */
import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { ShowdownBattleRunner } from '../../../src/logic/battle/helpers/showdownBattleRunner.ts';

describe('Showdown Audit v4 Fixes Unit Tests', () => {
  it('supports 4 seats dynamically in ShowdownBattleRunner', () => {
    const runner = new ShowdownBattleRunner(['move 1'], ['move 2']);
    runner.setSeatChoices('p3', ['move 3']);
    runner.setSeatChoices('p4', ['move 4']);

    const reqActive = { active: [{ moves: [{ id: 'tackle' }] }] };

    assert.equal(runner.resolveAndConsumeNextChoice('p1', reqActive), 'move 1');
    assert.equal(runner.resolveAndConsumeNextChoice('p2', reqActive), 'move 2');
    assert.equal(runner.resolveAndConsumeNextChoice('p3', reqActive), 'move 3');
    assert.equal(runner.resolveAndConsumeNextChoice('p4', reqActive), 'move 4');
  });
});
