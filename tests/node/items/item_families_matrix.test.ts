/**
 * tests/node/items/item_families_matrix.test.ts
 *
 * Parametrized Test Suite for all 11 Item Families in Poké Vicio.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mockLocalStorage } from '../../helpers/debugSetup.ts';
import { ITEM_FAMILIES_MATRIX } from '../../fixtures/items/itemFamiliesMatrix.ts';
import { isValidTarget } from '@/logic/items/helpers/itemTargetValidator.ts';
import { itemEffects } from '@/logic/items/itemEffects.ts';
import { isGlobalItem } from '@/logic/providers/itemProvider.ts';
import type { Pokemon } from '@/types/pokemon/pokemon.ts';

function createTestPokemon(partial?: Partial<Pokemon>): Pokemon {
  return {
    uid: 'matrix-test-mon',
    id: 'pikachu',
    name: 'Pikachu',
    species: 'pikachu',
    level: 30,
    exp: 500,
    expNeeded: 1000,
    hp: 100,
    maxHp: 100,
    atk: 55,
    def: 40,
    spa: 50,
    spd: 50,
    spe: 90,
    type: 'electric',
    status: '',
    sleepTurns: 0,
    isShiny: false,
    moves: [
      { id: 'thundershock', name: 'Impactrueno', pp: 30, maxPP: 30, type: 'electric' },
      { id: 'quickattack', name: 'Ataque Rápido', pp: 30, maxPP: 30, type: 'normal' }
    ],
    ability: 'static',
    vigor: 100,
    maxVigor: 100,
    ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    nature: 'hardy',
    friendship: 70,
    ...partial
  } as Pokemon;
}

describe('Parameterized Item Families Matrix Tests', () => {
  beforeEach(() => {
    mockLocalStorage();
    setActivePinia(createPinia());
  });

  describe.each(ITEM_FAMILIES_MATRIX)('Family: $title ($familyId)', (family) => {
    test.each(family.testCases)(
      'Case: $name ($subCategory) -> behavior & target verification',
      (testCase) => {
        const mon = createTestPokemon();

        if (testCase.requiresTarget) {
          testCase.setupValidTarget(mon);
          const canUseValid = isValidTarget(testCase.itemId, mon);
          expect(canUseValid).toBe(true);

          if (testCase.setupInvalidTarget) {
            const invalidMon = createTestPokemon();
            testCase.setupInvalidTarget(invalidMon);
            const canUseInvalid = isValidTarget(testCase.itemId, invalidMon);
            expect(canUseInvalid).toBe(false);
          }

          const effectFn = itemEffects[testCase.itemId];
          if (effectFn) {
            const res = effectFn(mon);
            expect(res.success).toBe(true);
            if (testCase.isDeferred) {
              expect(res.deferred).toBe(true);
            }
            expect(testCase.verifySuccessEffect(mon, res)).toBe(true);
          }
        } else if (family.familyId === 'global_buff') {
          expect(isGlobalItem(testCase.itemId)).toBe(true);
        } else if (family.familyId === 'pokeball') {
          // Pokeballs are in-battle items
          expect(testCase.itemId.endsWith('ball')).toBe(true);
        } else if (family.familyId === 'fossil_cloning') {
          // Fossils are restricted from direct bag use
          expect(isValidTarget(testCase.itemId, mon)).toBe(false);
        } else if (family.familyId === 'crafting_economy') {
          // Raw materials / components are not usable on Pokémon
          expect(isValidTarget(testCase.itemId, mon)).toBe(false);
        }
      }
    );
  });
});
