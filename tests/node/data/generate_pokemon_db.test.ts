// test-fragmentation-ok: Isolated single-purpose regression test for Pokemon DB generator
import { describe, it, expect } from 'vitest';
import { generatePokemonDatabase } from '../../../scripts/data/generate_pokemon_db.ts';


describe('generatePokemonDatabase', () => {
  it('generates the pokemon database without ReferenceErrors', async () => {
    await expect(generatePokemonDatabase()).resolves.toBeUndefined();
  });
});
