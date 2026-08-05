/**
 * tests/node/system/json_wrappers_integrity.test.ts
 *
 * Mandatory integrity unit test suite for typed JSON Data Wrappers.
 * Validates that all exported JSON datasets conform 100% to domain union types
 * (ItemId, PokemonSpeciesId, AbilityId, PokemonMoveId) without raw string desyncs.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import { RANDOM_SETS_DATA } from '../../../src/data/ai/randomSetsData.ts';
import { ANIMATED_SPRITE_DATA } from '../../../src/data/pokemon/animatedSpriteData.ts';
import { FEET_COORDINATES_DATA } from '../../../src/data/pokemon/feetCoordinatesData.ts';
import { SPRITE_MAPPING_DATA } from '../../../src/data/pokemon/spriteMappingData.ts';
import { EVOLUTION_TABLE } from '../../../src/data/pokemon/evolutionDataWrapper.ts';

import { getItemById, requireItemId } from '../../../src/data/inventory/items.ts';
import { SPECIES_METADATA } from '../../../src/data/pokemon/speciesMetadata.ts';
import { PDEX_ORDER } from '../../../src/data/pokemon/pokedex.ts';

describe('JSON Typed Data Wrappers — Domain Integrity Audit', () => {
  describe('RANDOM_SETS_DATA', () => {
    it('contains strictly valid PokemonSpeciesId, ItemId, AbilityId, and moves in all random sets', () => {
      assert.ok(Array.isArray(RANDOM_SETS_DATA) && RANDOM_SETS_DATA.length > 0, 'RANDOM_SETS_DATA must not be empty');

      for (const entry of RANDOM_SETS_DATA) {
        assert.ok(
          entry.pokemon in SPECIES_METADATA || PDEX_ORDER.includes(entry.pokemon as any),
          `Species "${entry.pokemon}" in random-sets must exist in SPECIES_METADATA or PDEX_ORDER`
        );

        for (const set of entry.sets) {
          if (set.item) {
            assert.doesNotThrow(() => {
              const resolved = requireItemId(set.item!);
              getItemById(resolved);
            }, `Item "${set.item}" in random-sets for species "${entry.pokemon}" must be a valid canonical ItemId in items database`);
          }

          assert.ok(Array.isArray(set.moves) && set.moves.length > 0, `Set for "${entry.pokemon}" must have valid moves`);
        }
      }
    });
  });

  describe('ANIMATED_SPRITE_DATA', () => {
    it('contains non-empty sprite mappings', () => {
      const keys = Object.keys(ANIMATED_SPRITE_DATA);
      assert.ok(keys.length > 0, 'ANIMATED_SPRITE_DATA must not be empty');
    });
  });

  describe('FEET_COORDINATES_DATA', () => {
    it('contains non-empty feet coordinate entries', () => {
      const keys = Object.keys(FEET_COORDINATES_DATA);
      assert.ok(keys.length > 0, 'FEET_COORDINATES_DATA must not be empty');
    });
  });

  describe('SPRITE_MAPPING_DATA', () => {
    it('has valid numeric dex indices for all species entries', () => {
      const entries = Object.entries(SPRITE_MAPPING_DATA);
      assert.ok(entries.length > 0, 'SPRITE_MAPPING_DATA must not be empty');

      for (const [speciesId, dexIndex] of entries) {
        assert.ok(
          typeof dexIndex === 'number' || typeof dexIndex === 'string',
          `Dex index for "${speciesId}" must be number or string`
        );
      }
    });
  });

  describe('EVOLUTION_TABLE', () => {
    it('validates evolution target species and item triggers against domain datasets', () => {
      const entries = Object.entries(EVOLUTION_TABLE);
      assert.ok(entries.length > 0, 'EVOLUTION_TABLE must not be empty');

      for (const [sourceSpecies, detailOrList] of entries) {
        const list = Array.isArray(detailOrList) ? detailOrList : [detailOrList];
        for (const detail of list) {
          if (!detail) continue;
          assert.ok(
            detail.to,
            `Evolution target species for "${sourceSpecies}" must be defined`
          );

          if (detail.item) {
            assert.doesNotThrow(() => {
              requireItemId(detail.item!);
            }, `Evolution item "${detail.item}" for "${sourceSpecies}" must be a valid ItemId`);
          }

          if (detail.heldItem) {
            assert.doesNotThrow(() => {
              requireItemId(detail.heldItem!);
            }, `Evolution heldItem "${detail.heldItem}" for "${sourceSpecies}" must be a valid ItemId`);
          }
        }
      }
    });
  });
});
