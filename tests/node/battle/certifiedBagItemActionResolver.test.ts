import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { requireCertifiedBagItemResponse } from '../../../src/logic/battle/helpers/certifiedBagItemActionResolver.ts';

describe('certified bag-item action resolver', () => {
  it('uses the recorded enemy response only when the visible item and target match the atomic action', () => {
    const debug = {
      history: [{
        p1Choice: '',
        p2Choice: 'move 2',
        p1GameAction: { kind: 'bag-item' as const, itemId: 'antidote' as const, targetSlot: 2 as const },
      }],
      replayHistoryIdx: 0,
      certifiedReplayWorkerEnded: false,
    };

    assert.equal(requireCertifiedBagItemResponse(debug, 'antidote', 2), 'move 2');
    assert.throws(
      () => requireCertifiedBagItemResponse(debug, 'potion', 2),
      /does not match the certified bag action/,
    );
  });
});
