/**
 * tests/node/npc_sprite_router.test.ts
 *
 * NATIVE NODE.JS TEST (Node.js 26+)
 *
 * Tests the classification and routing rules in src/logic/utils/npcSpriteRouter.ts.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyNpcArchetype,
  getSpritesForArchetype,
  resolveNpcSprite,
  type NpcArchetype
} from '../../src/logic/utils/npcSpriteRouter.ts';

describe('NPC Sprite Router Classification', () => {
  it('correctly classifies Bugcatcher as caza_bichos', () => {
    assert.strictEqual(classifyNpcArchetype('bugcatcher-gen3'), 'caza_bichos');
  });

  it('correctly classifies Birdkeeper as ornitologo', () => {
    assert.strictEqual(classifyNpcArchetype('birdkeeper-gen4dp'), 'ornitologo');
  });

  it('correctly classifies avery as default (ensures no "ave" false positive)', () => {
    assert.strictEqual(classifyNpcArchetype('avery'), 'default');
  });

  it('correctly classifies beauty as artista (ensures "bea" exclusion)', () => {
    assert.strictEqual(classifyNpcArchetype('beauty-gen4dp'), 'artista');
  });

  it('correctly classifies bea as luchador (ensures "bea" is still luchador)', () => {
    assert.strictEqual(classifyNpcArchetype('bea'), 'luchador');
  });

  it('correctly classifies master-level sprites as trainers', () => {
    assert.strictEqual(classifyNpcArchetype('red-masters'), 'trainers');
  });
});

describe('NPC Sprite Catalog and Fallback Errors', () => {
  it('throws an error when querying a non-existent or empty archetype', () => {
    assert.throws(() => {
      // Cast invalid key to trigger potential missing logic
      getSpritesForArchetype('non_existent' as unknown as NpcArchetype);
    }, /No sprites found in catalog for archetype/);
  });

  it('resolves a valid sprite directly', () => {
    // 'beauty-gen4dp' is a valid sprite for 'artista' archetype
    assert.strictEqual(resolveNpcSprite('beauty-gen4dp'), 'beauty-gen4dp');
  });

  it('resolves a default fallback when matching archetype but invalid sprite name', () => {
    // 'unknown_beauty' is not in the catalog, resolves to first 'artista' sprite (e.g. 'artist')
    const resolved = resolveNpcSprite('unknown_beauty');
    assert.ok(resolved);
    assert.notStrictEqual(resolved, 'unknown_beauty');
  });
});
