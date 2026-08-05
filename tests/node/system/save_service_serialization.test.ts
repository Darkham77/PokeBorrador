/**
 * tests/node/system/save_service_serialization.test.ts
 *
 * Test verifying that saveService serializes active battle state without throwing
 * ReferenceError for requireAbilityId.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { serializeState } from '../../../src/logic/auth/saveService.ts';

describe('saveService serialization integrity', () => {
  it('serializes active battle without ReferenceError for requireAbilityId', () => {
    const mockState: any = {
      trainer: { name: 'Ash', level: 1 },
      team: [{ uid: '1', id: 'pikachu', name: 'Pikachu', hp: 100, maxHp: 100, ability: 'static' }],
      box: [],
      starterChosen: true,
      activeBattle: {
        isTrainer: true,
        over: false,
        enemyTeam: [{ uid: '2', id: 'mew', name: 'Mew', hp: 100, maxHp: 100, ability: 'synchronize', moves: [] }],
      },
    };

    assert.doesNotThrow(() => {
      serializeState(mockState);
    });
  });
});
