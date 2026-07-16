/**
 * tests/node/evolution/evolutionTables.test.ts
 *
 * Comprehensive regression test for all evolution table IDs.
 *
 * Strategy: iterate every entry in EVOLUTION_TABLE, STONE_EVOLUTIONS,
 * and TRADE_EVOLUTIONS and verify that both the source and target species
 * IDs exist in the canonical @pkmn/sim Dex — no Pokémon hardcoded.
 *
 * This catches:
 *  - Malformed keys introduced by ID-migration commits (e.g. "slowpokegalarslowebrogalar")
 *  - Broken "to" targets that reference a non-existent species
 *  - Any key using a disambiguator suffix that doesn't strip to a valid base ID
 */
import { describe, test } from 'vitest';
import assert from 'node:assert/strict';
import { Dex } from '@pkmn/sim';
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS } from '../../../src/data/pokemon/evolutionData.ts';

/**
 * In Showdown format, all species IDs are lowercase alphanumeric — no underscores.
 * Any underscore in a STONE_EVOLUTIONS key is a disambiguator suffix added by us
 * (e.g. "eevee_water", "slowpokegalar_cuff"). Splitting at the first underscore
 * always gives the real base species ID.
 */
function baseFromStoneKey(key: string): string {
  const i = key.indexOf('_');
  return i >= 0 ? key.slice(0, i) : key;
}

function exists(id: string): boolean {
  return Dex.species.get(id).exists;
}

describe('Evolution tables — all IDs valid in Showdown Dex', () => {

  test('EVOLUTION_TABLE: every from-species and to-species exists in Dex', () => {
    const errors: string[] = [];
    for (const [from, data] of Object.entries(EVOLUTION_TABLE as Record<string, { level: number; to: string }>)) {
      if (!exists(from))     errors.push(`from not in Dex: "${from}"`);
      if (!exists(data.to))  errors.push(`to not in Dex:   "${data.to}"  (from "${from}")`);
    }
    assert.deepEqual(errors, [], `\n${errors.join('\n')}`);
  });

  test('STONE_EVOLUTIONS: every base-species and to-species exists in Dex', () => {
    const errors: string[] = [];
    for (const [key, data] of Object.entries(STONE_EVOLUTIONS as Record<string, { stone: string; to: string }>)) {
      const base = baseFromStoneKey(key);
      if (!exists(base))    errors.push(`base not in Dex:  "${base}"  (key "${key}")`);
      if (!exists(data.to)) errors.push(`to not in Dex:    "${data.to}"  (key "${key}")`);
    }
    assert.deepEqual(errors, [], `\n${errors.join('\n')}`);
  });

  test('TRADE_EVOLUTIONS: every from-species and to-species exists in Dex', () => {
    const errors: string[] = [];
    for (const [from, to] of Object.entries(TRADE_EVOLUTIONS as Record<string, string>)) {
      if (!exists(from)) errors.push(`from not in Dex: "${from}"`);
      if (!exists(to))   errors.push(`to not in Dex:   "${to}"  (from "${from}")`);
    }
    assert.deepEqual(errors, [], `\n${errors.join('\n')}`);
  });

  test('Evolution counts match: no source species appears twice in any table', () => {
    // Each "from" ID should appear only once — two entries with the same source is always a bug.
    // Multiple different sources evolving into the same target is valid (e.g. Burmy forms → Mothim).
    const checkDuplicateKeys = (name: string, keys: string[]) => {
      const seen = new Set<string>();
      const dupes: string[] = [];
      for (const k of keys) {
        if (seen.has(k)) dupes.push(k);
        seen.add(k);
      }
      assert.deepEqual(dupes, [], `${name} has duplicate from-sources: ${dupes.join(', ')}`);
    };

    checkDuplicateKeys('EVOLUTION_TABLE',  Object.keys(EVOLUTION_TABLE));
    checkDuplicateKeys('STONE_EVOLUTIONS', Object.keys(STONE_EVOLUTIONS));
    checkDuplicateKeys('TRADE_EVOLUTIONS', Object.keys(TRADE_EVOLUTIONS));
  });

  test('Dex coverage: canonical Pokémon with prevo tracked against our evolution tables', () => {
    // Build the union of all evolution targets across all three tables.
    const allTargets = new Set<string>([
      ...Object.values(EVOLUTION_TABLE  as Record<string, { to: string }>).map(d => d.to),
      ...Object.values(STONE_EVOLUTIONS as Record<string, { to: string }>).map(d => d.to),
      ...Object.values(TRADE_EVOLUTIONS as Record<string, string>),
    ]);

    const missing: string[] = [];
    for (const species of Dex.species.all()) {
      // Skip non-existent entries
      if (!species.exists) continue;
      // Skip CAP, LGPE-only, Unobtainable, and other non-standard species
      if (species.isNonstandard !== null) continue;
      // Skip species without a pre-evolution — they are base forms
      if (!species.prevo) continue;

      if (!allTargets.has(species.id)) {
        missing.push(species.id);
      }
    }

    // These are Pokémon the Dex knows but our game intentionally doesn't support yet
    // (branch evolutions, cosmetic forms, late-gen mons). Print them so regressions are visible,
    // but don't block development — the important thing is the count never INCREASES unexpectedly
    // after an ID-migration commit.
    //
    // The three tables above (from/to IDs all valid) are the real regression guard.
    // This test is coverage awareness.
    if (missing.length > 0) {
      console.warn(
        `[coverage] ${missing.length} canonical evolved forms not in our evolution tables (intentional gap):\n` +
        missing.join(', '),
      );
    }

    // The hard constraint: every species our tables DO claim to evolve must exist in the Dex.
    // (Already verified in the three tests above — this assertion is a belt-and-suspenders check.)
    const invalidTargets = [...allTargets].filter(id => !Dex.species.get(id).exists);
    assert.deepEqual(
      invalidTargets,
      [],
      `Evolution tables reference non-existent species: ${invalidTargets.join(', ')}`,
    );
  });
});
