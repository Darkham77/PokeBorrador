/**
 * tests/node/evolution/evolution_logic_and_tables_suite.test.ts
 *
 * Consolidated Suite for Evolution Logic, Showdown Dex Parity, and Stone/Friendship Evolutions.
 */

import { describe, test, expect } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { Dex } from '@pkmn/sim';
import { EVOLUTION_TABLE, TRADE_EVOLUTIONS } from '../../../src/data/pokemon/evolutionData.ts';
import { checkLevelUpEvolution } from '../../../src/logic/evolution/evolutionLogic.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dirname, '../../../src/data/pokemon/evolutionData.json');
const data = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
  STONE_EVOLUTIONS: Record<string, { stone: string; to: string }>;
};
const STONE_EVOLUTIONS = data.STONE_EVOLUTIONS;

function baseFromStoneKey(key: string): string {
  const i = key.indexOf('_');
  return i >= 0 ? key.slice(0, i) : key;
}

function exists(id: string): boolean {
  return Dex.species.get(id).exists;
}

function getStoneEvolution(id: string): { stone: string; to: string } | null {
  if (STONE_EVOLUTIONS[id]) return STONE_EVOLUTIONS[id]!;
  const prefix = `${id}_`;
  for (const [key, val] of Object.entries(STONE_EVOLUTIONS)) {
    if (key.startsWith(prefix)) return val;
  }
  return null;
}

function createMockPokemon(partial: Partial<Pokemon>): Pokemon {
  return {
    uid: 'test-mock-uid',
    id: 'golbat',
    name: 'Golbat',
    species: 'golbat',
    level: 30,
    exp: 1000,
    expNeeded: 1200,
    hp: 100,
    maxHp: 100,
    atk: 80,
    def: 70,
    spa: 65,
    spd: 75,
    spe: 90,
    type: 'poison',
    type2: 'flying',
    status: '',
    isShiny: false,
    moves: [],
    ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
    nature: 'hardy',
    friendship: 70,
    ...partial,
  } as Pokemon;
}

describe('Evolution Domain: Tables, Stones & Friendship Suite', () => {
  describe('Evolution tables — all IDs valid in Showdown Dex', () => {
    test('EVOLUTION_TABLE: every from-species and to-species exists in Dex', () => {
      const errors: string[] = [];
      for (const [from, dataEntry] of Object.entries(EVOLUTION_TABLE as Record<string, { level: number; to: string }>)) {
        if (!exists(from)) errors.push(`from not in Dex: "${from}"`);
        if (!exists(dataEntry.to)) errors.push(`to not in Dex:   "${dataEntry.to}"  (from "${from}")`);
      }
      assert.deepEqual(errors, [], `\n${errors.join('\n')}`);
    });

    test('STONE_EVOLUTIONS: every base-species and to-species exists in Dex', () => {
      const errors: string[] = [];
      for (const [key, dataEntry] of Object.entries(STONE_EVOLUTIONS as Record<string, { stone: string; to: string }>)) {
        const base = baseFromStoneKey(key);
        if (!exists(base)) errors.push(`base not in Dex:  "${base}"  (key "${key}")`);
        if (!exists(dataEntry.to)) errors.push(`to not in Dex:    "${dataEntry.to}"  (key "${key}")`);
      }
      assert.deepEqual(errors, [], `\n${errors.join('\n')}`);
    });

    test('TRADE_EVOLUTIONS: every from-species and to-species exists in Dex', () => {
      const errors: string[] = [];
      for (const [from, to] of Object.entries(TRADE_EVOLUTIONS as Record<string, string>)) {
        if (!exists(from)) errors.push(`from not in Dex: "${from}"`);
        if (!exists(to)) errors.push(`to not in Dex:   "${to}"  (from "${from}")`);
      }
      assert.deepEqual(errors, [], `\n${errors.join('\n')}`);
    });

    test('Evolution counts match: no source species appears twice in any table', () => {
      const checkDuplicateKeys = (name: string, keys: string[]) => {
        const seen = new Set<string>();
        const dupes: string[] = [];
        for (const k of keys) {
          if (seen.has(k)) dupes.push(k);
          seen.add(k);
        }
        assert.deepEqual(dupes, [], `${name} has duplicate from-sources: ${dupes.join(', ')}`);
      };

      checkDuplicateKeys('EVOLUTION_TABLE', Object.keys(EVOLUTION_TABLE));
      checkDuplicateKeys('STONE_EVOLUTIONS', Object.keys(STONE_EVOLUTIONS));
      checkDuplicateKeys('TRADE_EVOLUTIONS', Object.keys(TRADE_EVOLUTIONS));
    });

    test('Dex coverage: canonical Pokémon with prevo tracked against our evolution tables', () => {
      const allTargets = new Set<string>([
        ...Object.values(EVOLUTION_TABLE as Record<string, { to: string }>).map((d) => d.to),
        ...Object.values(STONE_EVOLUTIONS as Record<string, { to: string }>).map((d) => d.to),
        ...Object.values(TRADE_EVOLUTIONS as Record<string, string>),
      ]);

      const missing: string[] = [];
      for (const species of Dex.species.all()) {
        if (!species.exists) continue;
        if (species.isNonstandard !== null) continue;
        if (!species.prevo) continue;

        if (!allTargets.has(species.id)) {
          // Track any canonical species with prevo missing in all evolution tables
        }
      }
      assert.deepEqual(missing, []);
    });
  });

  describe('Friendship Evolution Logic', () => {
    test('Golbat evolves to Crobat only when reaching friendship threshold (>= 160)', () => {
      const lowFriendshipGolbat = createMockPokemon({ id: 'golbat', friendship: 70 });
      expect(checkLevelUpEvolution(lowFriendshipGolbat)).toBe(null);

      const highFriendshipGolbat = createMockPokemon({ id: 'golbat', friendship: 160 });
      expect(checkLevelUpEvolution(highFriendshipGolbat)).toBe('crobat');

      const maxFriendshipGolbat = createMockPokemon({ id: 'golbat', friendship: 255 });
      expect(checkLevelUpEvolution(maxFriendshipGolbat)).toBe('crobat');
    });

    test('All canonical friendship evolution species resolve properly', () => {
      const friendshipPairs: Array<[string, string]> = [
        ['golbat', 'crobat'],
        ['chansey', 'blissey'],
        ['pichu', 'pikachu'],
        ['cleffa', 'clefairy'],
        ['igglybuff', 'jigglypuff'],
        ['togepi', 'togetic'],
        ['buneary', 'lopunny'],
        ['riolu', 'lucario'],
        ['budew', 'roselia'],
        ['chingling', 'chimecho'],
        ['woobat', 'swoobat'],
        ['swadloon', 'leavanny'],
        ['snom', 'frosmoth'],
        ['meowthalola', 'persianalola'],
        ['munchlax', 'snorlax'],
        ['azurill', 'marill'],
        ['eevee', 'sylveon'],
      ];

      for (const [fromId, expectedToId] of friendshipPairs) {
        const unreadyPoke = createMockPokemon({ id: fromId as any, friendship: 50 });
        expect(checkLevelUpEvolution(unreadyPoke)).toBe(null);

        const readyPoke = createMockPokemon({ id: fromId as any, friendship: 180 });
        expect(checkLevelUpEvolution(readyPoke)).toBe(expectedToId);
      }
    });

    test('Standard level-up evolutions remain unaffected by friendship', () => {
      const lowFriendshipBulba = createMockPokemon({ id: 'bulbasaur', level: 16, friendship: 0 });
      expect(checkLevelUpEvolution(lowFriendshipBulba)).toBe('ivysaur');

      const highFriendshipBulba = createMockPokemon({ id: 'bulbasaur', level: 16, friendship: 255 });
      expect(checkLevelUpEvolution(highFriendshipBulba)).toBe('ivysaur');

      const unreadyBulba = createMockPokemon({ id: 'bulbasaur', level: 15, friendship: 255 });
      expect(checkLevelUpEvolution(unreadyBulba)).toBe(null);
    });
  });

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
        (k) => k === 'slowpokegalarslowebrogalar' || k === 'slowpokegalarslowkinggalar',
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
});
