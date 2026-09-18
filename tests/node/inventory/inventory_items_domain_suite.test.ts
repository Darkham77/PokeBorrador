/**
 * tests/node/inventory/inventory_items_domain_suite.test.ts
 *
 * Consolidated Domain Suite for Inventory & Item Domain Logic:
 * - Antidote and toxic status recovery rules.
 * - Reactive Vue Proxy safety in isValidTarget (regression for structuredClone).
 * - Random sets canonical ItemId and requireItemId integrity.
 * - Tool probability budget redistribution math (Fishing Rods, Archaeology Pickaxes & Brushes).
 * - Item translations and localization integrity (SHOP_ITEMS Spanish names & descriptions, 0 English leak patterns).
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { reactive } from 'vue';
import { useItemOnPokemon } from '../../../src/logic/providers/itemProvider.ts';
import { isValidTarget } from '../../../src/logic/items/itemEffects.ts';
import randomSets from '../../../src/data/ai/random-sets.json';
import { getItemById, requireItemId, SHOP_ITEMS, type ItemId } from '../../../src/data/inventory/items.ts';
import { calculateArchaeologyWeights } from '../../../src/logic/utils/archaeologyHelpers.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';
import type { PokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';

function createToxicPokemon(): Pokemon {
  return {
    uid: 'antidote-toxic-test', id: 'bulbasaur', name: 'Bulbasaur', level: 20,
    exp: 0, expNeeded: 100, hp: 30, maxHp: 50, atk: 20, def: 20, spa: 20, spd: 20, spe: 20,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, nature: 'serious', type: 'grass',
    ability: 'overgrow', status: 'tox', isShiny: false, volatileCounters: {}, moves: [],
  };
}

function makeMon(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    uid: 'test-uid', id: 'pikachu', name: 'Pikachu', level: 25,
    hp: 30, maxHp: 60, status: null,
    moves: [{ name: 'Placaje', pp: 10, maxPP: 35 }],
    atk: 55, def: 40, spa: 50, spd: 50, spe: 90,
    type: 'electric', nature: 'Fuerte', ability: 'Estática',
    ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
    exp: 0, expNeeded: 1000, friendship: 70, vigor: 5, isShiny: false,
    gender: 'M', nickname: null, heldItem: null,
    obtainedAt: 0, sleepTurns: 0,
    ...overrides,
  } as unknown as Pokemon;
}

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

function redistributeFishingBudget(rates: number[], budget: number): number[] {
  const result = [...rates];
  const indexedPool = rates
    .map((rate, index) => ({ rate, index }))
    .sort((a, b) => a.rate - b.rate);

  let remaining = budget;
  for (let i = 0; i < indexedPool.length; i++) {
    const item = indexedPool[i]!;
    if (i === indexedPool.length - 1) {
      result[item.index] = (result[item.index] || 10) + remaining;
      remaining = 0;
    } else {
      const portion = Math.round(remaining / 2);
      result[item.index] = (result[item.index] || 10) + portion;
      remaining -= portion;
    }
  }
  return result;
}

function distributeArchaeologyBudget(
  pickaxeType: 'standard' | 'good' | 'super' | null,
  brushType: 'standard' | 'good' | 'super' | null
) {
  return calculateArchaeologyWeights(pickaxeType, brushType);
}

describe('Inventory Items Domain Suite', () => {
  describe('Antidote status rules', () => {
    it('cures toxic poison as well as ordinary poison', () => {
      const pokemon = createToxicPokemon();

      const result = useItemOnPokemon('antidote', pokemon);

      assert.ok(result, 'Antidote must be consumable against toxic poison.');
      assert.equal(pokemon.status, '');
    });
  });

  describe('isValidTarget — reactive proxy safety', () => {
    it('does not crash when pokemon is a Vue reactive Proxy (regression for structuredClone crash)', () => {
      const reactiveMon = reactive(makeMon({ hp: 30, maxHp: 60, status: undefined }));

      assert.doesNotThrow(() => {
        isValidTarget('potion', reactiveMon as unknown as Pokemon);
      }, 'isValidTarget must not throw when receiving a Vue reactive Proxy');
    });

    it('returns true for potion on a reactive proxy with HP below max', () => {
      const reactiveMon = reactive(makeMon({ hp: 30, maxHp: 60, status: undefined }));
      assert.ok(isValidTarget('potion', reactiveMon as unknown as Pokemon));
    });

    it('returns false for potion on a reactive proxy with full HP', () => {
      const reactiveMon = reactive(makeMon({ hp: 60, maxHp: 60, status: undefined }));
      assert.ok(!isValidTarget('potion', reactiveMon as unknown as Pokemon));
    });

    it('isValidTarget operates declaratively without throwing on reactive proxies', () => {
      const reactiveMon = reactive(makeMon());
      assert.doesNotThrow(() => isValidTarget('potion', reactiveMon as unknown as Pokemon));
    });
  });

  describe('Random Sets — Canonical ItemId Integrity', () => {
    it('all items in random-sets.json are valid canonical ItemIds readable by getItemById', () => {
      const setsArray = randomSets as unknown as RandomSetEntry[];

      for (const entry of setsArray) {
        for (const set of entry.sets) {
          if (set.item) {
            assert.doesNotThrow(() => {
              const resolved: ItemId = requireItemId(set.item!);
              getItemById(resolved);
            }, `Item "${set.item}" in random-sets.json for species "${entry.pokemon}" must be a valid canonical ItemId`);

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

  describe('Tool Probability Budget Redistribution Math', () => {
    describe('Fishing Rod Budget Redistribution', () => {
      it('should correctly redistribute 500 budget (good rod) among three species', () => {
        const baseRates = [10, 20, 30]; // Rare to common
        const finalRates = redistributeFishingBudget(baseRates, 500);
        assert.deepEqual(finalRates, [260, 145, 155]);
      });

      it('should correctly redistribute 1000 budget (super rod) among three species', () => {
        const baseRates = [10, 20, 30];
        const finalRates = redistributeFishingBudget(baseRates, 1000);
        assert.deepEqual(finalRates, [510, 270, 280]);
      });

      it('should handle unsorted input arrays and distribute based on sorted order', () => {
        const unsortedRates = [30, 10, 20];
        const finalRates = redistributeFishingBudget(unsortedRates, 500);
        assert.deepEqual(finalRates, [155, 260, 145]);
      });
    });

    describe('Archaeology Category Budget Redistribution', () => {
      it('should return base weights when no tools are active', () => {
        const weights = distributeArchaeologyBudget(null, null);
        assert.deepEqual(weights, { fossil: 45, stone: 25, common: 20, rare: 10 });
      });

      it('should apply pickaxe budget (+500) only to mineral/stone categories', () => {
        const weights = distributeArchaeologyBudget('good', null);
        assert.deepEqual(weights, { fossil: 45, stone: 150, common: 145, rare: 260 });
      });

      it('should apply pickaxe budget (+1000) only to mineral/stone categories', () => {
        const weights = distributeArchaeologyBudget('super', null);
        assert.deepEqual(weights, { fossil: 45, stone: 275, common: 270, rare: 510 });
      });

      it('should apply brush budget (+500) only to fossil category', () => {
        const weights = distributeArchaeologyBudget(null, 'good');
        assert.deepEqual(weights, { fossil: 545, stone: 25, common: 20, rare: 10 });
      });

      it('should apply brush budget (+1000) only to fossil category', () => {
        const weights = distributeArchaeologyBudget(null, 'super');
        assert.deepEqual(weights, { fossil: 1045, stone: 25, common: 20, rare: 10 });
      });
    });
  });

  describe('Item Translations & Localization Integrity', () => {
    const FORBIDDEN_DESC_PATTERNS = [
      /\bholder('s)?\b/i,
      /\braises?\b/i,
      /\blowers?\b/i,
      /\bboosts?\b/i,
      /\bincreases?\b/i,
      /\bsingle use\b/i,
      /\battacks?\b/i,
      /\bcannot\b/i,
      /\bheals?\b/i,
      /\bprevents?\b/i,
      /\bused for\b/i,
      /\bevolves?\b/i,
      /\bif held by\b/i,
      /\bgains?\b/i,
      /\baccuracy\b/i,
      /\bhalves\b/i,
      /\bphysical attacks?\b/i,
      /\bspecial attacks?\b/i,
      /\bmoves last\b/i,
      /\bjudgment is\b/i,
      /\bwhen held\b/i,
      /\bis (calculated|raised|lowered)\b/i,
      /\bno competitive use\b/i,
      /\bchanges its forme\b/i,
    ];

    const FORBIDDEN_NAME_PATTERNS = [
      /\b(Berry|Sweet|Plate|Orb|Specs|Vest|Herb|Policy|Drive|Memory|Mirror|Feather|Cap|Incense|Belt|Glasses)\b/i
    ];

    it('all items in SHOP_ITEMS have non-empty Spanish name and desc', () => {
      for (const item of SHOP_ITEMS) {
        assert.ok(item.name && item.name.trim().length > 0, `Item ${item.id} must have a non-empty name`);
        assert.ok(item.desc && item.desc.trim().length > 0, `Item ${item.id} must have a non-empty desc`);
      }
    });

    it('no item in SHOP_ITEMS has English leak patterns in its description', () => {
      const leaks: string[] = [];

      for (const item of SHOP_ITEMS) {
        const desc = item.desc || '';
        for (const pattern of FORBIDDEN_DESC_PATTERNS) {
          if (pattern.test(desc)) {
            leaks.push(`[${item.id}] desc "${desc}" matched English pattern ${pattern}`);
          }
        }
      }

      assert.equal(leaks.length, 0, `Detected English leaks in item descriptions:\n${leaks.join('\n')}`);
    });

    it('no item in SHOP_ITEMS has untranslated English suffixes in its name', () => {
      const leaks: string[] = [];

      for (const item of SHOP_ITEMS) {
        const name = item.name || '';
        for (const pattern of FORBIDDEN_NAME_PATTERNS) {
          if (pattern.test(name)) {
            leaks.push(`[${item.id}] name "${name}" matched English token ${pattern}`);
          }
        }
      }

      assert.equal(leaks.length, 0, `Detected English leaks in item names:\n${leaks.join('\n')}`);
    });
  });
});
