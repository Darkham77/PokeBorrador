/**
 * tests/node/battle/showdown_agent_disabled_moves.test.ts
 *
 * Reproduces issue where ShowdownBattleAgent/BattleAgent selects a disabled move (or move with 0 PP)
 * when validMoves is empty, causing certified fuzzer history streams to contain invalid choices.
 *
 * This test MUST FAIL before the fix in showdownBattleAgent.ts and PASS after it.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { BattleAgent } from '../../../scripts/e2e/fuzzer/core/fuzzer_agent.ts';
import type { ChoiceRequest } from '../../../src/logic/battle/helpers/requestHelper.ts';

describe('ShowdownBattleAgent — Disabled Moves Safety', () => {
  it('does not select a disabled move or move with 0 PP when all moves are disabled', () => {
    const agent = new BattleAgent('p1');

    // Request where all moves are disabled (e.g. 0 PP or Taunt/Disable)
    const requestWithDisabledMoves: ChoiceRequest = {
      active: [
        {
          moves: [
            { id: 'softboiled', move: 'Soft-Boiled', disabled: true, pp: 0, maxpp: 8 },
            { id: 'recover', move: 'Recover', disabled: true, pp: 0, maxpp: 10 }
          ]
        }
      ],
      side: {
        id: 'p1',
        pokemon: [
          {
            ident: 'p1: Blissey',
            details: 'Blissey, F',
            condition: '714/714',
            active: true
          }
        ]
      }
    };

    const choice = agent.decide(requestWithDisabledMoves);

    // It MUST NOT return 'move 1' or 'move 2' because those moves are disabled!
    assert.notStrictEqual(
      choice,
      'move 1',
      'BattleAgent must not select move 1 when it is disabled (0 PP)'
    );
    assert.notStrictEqual(
      choice,
      'move 2',
      'BattleAgent must not select move 2 when it is disabled (0 PP)'
    );
  });
});
