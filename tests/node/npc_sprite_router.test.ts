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
import { getRandomQuoteForTrainer } from '../../src/data/trainerPhrases.ts';

describe('NPC Sprite Router Classification', () => {
  it('correctly classifies Bugcatcher as caza_bichos', () => {
    assert.strictEqual(classifyNpcArchetype('bugcatcher-gen3'), 'caza_bichos');
  });

  it('correctly classifies Birdkeeper as ornitologo', () => {
    assert.strictEqual(classifyNpcArchetype('birdkeeper-gen4dp'), 'ornitologo');
  });

  it('correctly classifies avery as medium', () => {
    assert.strictEqual(classifyNpcArchetype('avery'), 'medium');
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

import { ARCHETYPE_SPRITES } from '../../src/data/npcSpriteCatalog.ts';
import { TRAINER_TYPES } from '../../src/data/trainerTypes.ts';

describe('NPC Sprite Catalog Coverage & Encounter Group Parity', () => {
  it('ensures every sprite in the catalog is correctly classified to its parent archetype', () => {
    for (const [archetype, sprites] of Object.entries(ARCHETYPE_SPRITES)) {
      for (const sprite of sprites) {
        const classified = classifyNpcArchetype(sprite);
        assert.strictEqual(
          classified,
          archetype,
          `Sprite "${sprite}" from catalog under "${archetype}" classified as "${classified}" instead.`
        );
      }
    }
  });

  it('ensures every catalog archetype is registered in encounter trainer types', () => {
    const trainerKeys = Object.keys(TRAINER_TYPES);
    for (const archetype of Object.keys(ARCHETYPE_SPRITES)) {
      assert.ok(
        trainerKeys.includes(archetype),
        `Archetype "${archetype}" exists in sprite catalog but not in TRAINER_TYPES`
      );
    }
  });

  it('ensures all trainer types have non-empty pools and precomputed phrases/personality', () => {
    for (const [key, t] of Object.entries(TRAINER_TYPES)) {
      // 1. Verify pool
      assert.ok(
        t.pool && t.pool.length > 0,
        `Trainer type "${key}" has an empty or missing Pokémon pool`
      );
      
      // 2. Verify phrases/personality
      const quote = getRandomQuoteForTrainer(key);
      assert.ok(
        quote && typeof quote === 'string' && quote.length > 0,
        `Trainer type "${key}" is missing custom phrases or personalities in trainerPhrases.ts`
      );
    }
  });
});

describe('NPC Sprite Catalog and Fallback Errors', () => {
  it('throws an error when querying a non-existent or empty archetype', () => {
    assert.throws(() => {
      // Cast invalid key to trigger potential missing logic
      getSpritesForArchetype('non_existent' as unknown as NpcArchetype);
    }, /No sprites found in catalog for archetype/);
  });

  it('throws an error when querying quotes for a non-existent trainer type', () => {
    assert.throws(() => {
      getRandomQuoteForTrainer('non_existent');
    }, /Missing custom phrases or personality for trainer type/);
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

