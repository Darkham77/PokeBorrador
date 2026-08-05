/**
 * tests/node/admin/use_debug_pokemon_creator.test.ts
 *
 * Unit test for useDebugPokemonCreator ensuring requireAbilityId is defined
 * when selecting a species.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { useDebugPokemonCreator } from '../../../src/components/admin/debug/useDebugPokemonCreator.ts';

describe('useDebugPokemonCreator integrity', () => {
  it('selects species without throwing ReferenceError for requireAbilityId', () => {
    const creator = useDebugPokemonCreator();
    assert.doesNotThrow(() => {
      creator.selectSpecies({ id: 'charmander', name: 'Charmander' });
    });
    assert.strictEqual(creator.config.value.id, 'charmander');
    assert.ok(creator.config.value.ability.length > 0);
  });
});
