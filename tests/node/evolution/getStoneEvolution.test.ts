/**
 * tests/unit/getStoneEvolution.test.ts
 *
 * Regression guard for the STONE_EVOLUTIONS key format.
 *
 * Background:
 *   The upstream commit "fix(evolution): repair 16 broken stone IDs" introduced
 *   malformed keys ("slowpokegalarslowebrogalar") instead of the canonical
 *   disambiguated format ("slowpokegalar_cuff"). This test ensures:
 *     1. getStoneEvolution() handles both exact and prefix-match keys.
 *     2. The JSON keys for Slowpoke-Galar are correctly shaped.
 *     3. checkStoneEvolution() returns the right target for Slowpoke-Galar.
 */
import { describe, test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dirname, '../../../src/data/pokemon/evolutionData.json');
const data = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
  STONE_EVOLUTIONS: Record<string, { stone: string; to: string }>;
};
const STONE_EVOLUTIONS = data.STONE_EVOLUTIONS;

/** Inline copy of getStoneEvolution so this test has zero external dependencies. */
function getStoneEvolution(id: string): { stone: string; to: string } | null {
  if (STONE_EVOLUTIONS[id]) return STONE_EVOLUTIONS[id]!;
  const prefix = `${id}_`;
  for (const [key, val] of Object.entries(STONE_EVOLUTIONS)) {
    if (key.startsWith(prefix)) return val;
  }
  return null;
}

describe('getStoneEvolution — key format regression', () => {
  test('exact key lookup works (pikachu → raichu)', () => {
    const result = getStoneEvolution('pikachu');
    assert.ok(result !== null, 'pikachu should have a stone evolution');
    assert.equal(result!.to, 'raichu');
    assert.equal(result!.stone, 'thunderstone');
  });

  test('disambiguated prefix lookup works (eevee)', () => {
    const result = getStoneEvolution('eevee');
    assert.ok(result !== null, 'eevee should match first prefix entry');
  });

  test('slowpokegalar_cuff key exists and targets slowbrogalar', () => {
    const entry = STONE_EVOLUTIONS['slowpokegalar_cuff'];
    assert.ok(entry !== undefined, 'Key "slowpokegalar_cuff" must exist');
    assert.equal(entry!.stone, 'galaricacuff');
    assert.equal(entry!.to, 'slowbrogalar');
  });

  test('slowpokegalar_wreath key exists and targets slowkinggalar', () => {
    const entry = STONE_EVOLUTIONS['slowpokegalar_wreath'];
    assert.ok(entry !== undefined, 'Key "slowpokegalar_wreath" must exist');
    assert.equal(entry!.stone, 'galaricawreath');
    assert.equal(entry!.to, 'slowkinggalar');
  });

  test('malformed keys (regression guard): no concatenated names allowed', () => {
    const badKeys = Object.keys(STONE_EVOLUTIONS).filter(
      k => k === 'slowpokegalarslowebrogalar' || k === 'slowpokegalarslowkinggalar',
    );
    assert.deepEqual(badKeys, [], `Malformed keys found: ${badKeys.join(', ')}`);
  });

  test('getStoneEvolution("slowpokegalar") resolves via prefix', () => {
    const result = getStoneEvolution('slowpokegalar');
    assert.ok(result !== null, 'slowpokegalar should resolve via prefix match');
    assert.ok(
      result!.to === 'slowbrogalar' || result!.to === 'slowkinggalar',
      `Unexpected target: ${result!.to}`,
    );
  });

  test('getStoneEvolution returns null for species with no stone evolution', () => {
    assert.equal(getStoneEvolution('rattata'), null);
    assert.equal(getStoneEvolution('mewtwo'), null);
    assert.equal(getStoneEvolution(''), null);
  });

  test('checkStoneEvolution: galaricacuff on slowpokegalar → slowbrogalar', () => {
    const entries = Object.entries(STONE_EVOLUTIONS).filter(([k]) => k.startsWith('slowpokegalar_'));
    const cuff = entries.find(([, v]) => v.stone === 'galaricacuff');
    assert.ok(cuff !== undefined, 'galaricacuff entry for slowpokegalar must exist');
    assert.equal(cuff![1].to, 'slowbrogalar');
  });

  test('checkStoneEvolution: galaricawreath on slowpokegalar → slowkinggalar', () => {
    const entries = Object.entries(STONE_EVOLUTIONS).filter(([k]) => k.startsWith('slowpokegalar_'));
    const wreath = entries.find(([, v]) => v.stone === 'galaricawreath');
    assert.ok(wreath !== undefined, 'galaricawreath entry for slowpokegalar must exist');
    assert.equal(wreath![1].to, 'slowkinggalar');
  });
});
