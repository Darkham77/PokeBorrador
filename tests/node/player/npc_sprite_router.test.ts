/**
 * tests/node/npc_sprite_router.test.ts
 *
 * VITEST (vite-node) — node environment
 *
 * Tests the classification and routing rules in src/logic/utils/npcSpriteRouter.ts.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import {
  classifyNpcArchetype,
  getSpritesForArchetype,
  resolveNpcSprite,
  type NpcArchetype,
  type NpcSpriteId
} from '../../../src/logic/utils/npcSpriteRouter.ts';
import { getRandomQuoteForTrainer } from '../../../src/data/player/trainerPhrases.ts';

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
    assert.strictEqual(classifyNpcArchetype('red-masters'), 'rival');
  });
});

import { ARCHETYPE_SPRITES } from '../../../src/data/pokemon/npcSpriteCatalog.ts';
import { TRAINER_TYPES } from '../../../src/data/player/trainerTypes.ts';

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
    }, /Missing personality mapping for trainer type/);
  });

  it('resolves a valid sprite directly', () => {
    // 'beauty-gen4dp' is a valid sprite for 'artista' archetype
    assert.strictEqual(resolveNpcSprite('beauty-gen4dp'), 'beauty-gen4dp');
  });

  it('throws an error when resolving an uncataloged sprite name (Zero-Fallback Rule)', () => {
    assert.throws(() => {
      resolveNpcSprite('unknown_beauty' as NpcSpriteId);
    }, /Invalid NPC sprite identifier: 'unknown_beauty'/);
  });
});
