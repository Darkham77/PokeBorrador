/**
 * tests/node/battle/showdown_bridge_require_item.test.ts
 *
 * Regression test verifying that requireItemId is correctly imported in showdownBridgeMisc.ts
 * and does not throw "ReferenceError: requireItemId is not defined".
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { handleMiscEvents } from '../../../src/logic/battle/showdownBridgeMisc.ts';
import type { SBCtx } from '../../../src/logic/battle/showdownBridgeCtx.ts';

describe('Showdown Bridge Misc — requireItemId import integrity', () => {
  it('does not throw ReferenceError when processing -item or -enditem logs', () => {
    const fakePoke = { name: 'Mew', heldItem: 'sitrusberry', item: 'sitrusberry', lastItem: '' };
    const mockCtx: SBCtx = {
      store: { addLog: () => {} },
      type: '-enditem',
      parts: ['-enditem', '', 'p1a: Mew', 'Sitrus Berry', '[eat]'],
      line: '|-enditem|p1a: Mew|Sitrus Berry|[eat]',
      p: () => null,
      getPoke: () => fakePoke as any,
      getSide: () => null,
    } as any;

    assert.doesNotThrow(() => {
      handleMiscEvents(mockCtx);
    }, 'handleMiscEvents must not throw ReferenceError for requireItemId');

    assert.strictEqual(fakePoke.lastItem, 'sitrusberry');
  });
});
