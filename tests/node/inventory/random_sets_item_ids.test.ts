/**
 * tests/node/inventory/random_sets_item_ids.test.ts
 *
 * Regression test for unnormalized Item IDs in src/data/ai/random-sets.json
 * such as 'Air Balloon' which cause getItemById() to throw in the Vue UI layer.
 *
 * This test MUST FAIL before normalizing random-sets.json and PASS after it.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import randomSets from '../../../src/data/ai/random-sets.json';
import { getItemById, requireItemId } from '../../../src/data/inventory/items.ts';

import type { ItemId } from '../../../src/data/inventory/items.ts';
import type { PokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';

interface RandomSetItem {
  moves: string[];
  ability: string;
  item?: ItemId;
  role: string;
}

interface RandomSetEntry {
  pokemon: PokemonSpeciesId;
  sets: RandomSetItem[];
}

describe('Random Sets — Canonical ItemId Integrity', () => {
  it('all items in random-sets.json are valid canonical ItemIds readable by getItemById', () => {
    const setsArray = randomSets as unknown as RandomSetEntry[];
    
    for (const entry of setsArray) {
      for (const set of entry.sets) {
        if (set.item) {
          assert.doesNotThrow(() => {
            // Must be a valid domain ItemId matching SHOP_ITEMS exactly
            const resolved: ItemId = requireItemId(set.item!);
            getItemById(resolved);
          }, `Item "${set.item}" in random-sets.json for species "${entry.pokemon}" must be a valid canonical ItemId`);

          // Ensure it is already in canonical ID format (e.g. 'airballoon') without requiring runtime transformation
          assert.strictEqual(
            set.item,
            requireItemId(set.item),
            `Item "${set.item}" in random-sets.json for species "${entry.pokemon}" must be stored as a canonical ItemId`
          );
        }
      }
    }
  });
});
