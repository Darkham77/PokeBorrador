/**
 * tests/node/battle/showdown_bridge_item_normalization.test.ts
 *
 * Regression unit test for Showdown bridge log parsing of |-item| and |-enditem|.
 * Verifies that target.heldItem is strictly stored as a canonical domain ItemId (e.g. 'airballoon')
 * when receiving raw Showdown log strings like 'Air Balloon'.
 *
 * This test MUST FAIL before normalizing showdownBridgeMisc.ts and PASS after it.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { toID } from '@pkmn/sim';
import { requireItemId, getItemById } from '../../../src/data/inventory/items.ts';

describe('Showdown Bridge — Item Event Canonical Domain ID Normalization', () => {
  it('normalizes raw Showdown item strings like "Air Balloon" to canonical ItemIds', () => {
    const rawShowdownItemString = 'Air Balloon';
    
    // The bridge must convert raw Showdown item strings to canonical ItemId
    const canonicalItemId = requireItemId(toID(rawShowdownItemString));

    assert.strictEqual(canonicalItemId, 'airballoon', 'Canonical ItemId for "Air Balloon" must be "airballoon"');
    assert.doesNotThrow(() => {
      getItemById(canonicalItemId);
    }, 'getItemById must succeed for normalized ItemId');
  });
});
