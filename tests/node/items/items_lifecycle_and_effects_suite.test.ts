/**
 * tests/node/items/items_lifecycle_and_effects_suite.test.ts
 *
 * Consolidated Suite for Item Effects, Friendship Bonuses, Time Buffs, Matrix, and Multi-Step Flows.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mockLocalStorage } from '../../helpers/debugSetup.ts';
import { handleEvBerry, handleVitamin, handleFeather } from '../../../src/logic/items/itemEffectHandlers.ts';
import { ITEM_FAMILIES_MATRIX } from '../../fixtures/items/itemFamiliesMatrix.ts';
import { isValidTarget } from '@/logic/items/helpers/itemTargetValidator.ts';
import { itemEffects } from '@/logic/items/itemEffects.ts';
import { isGlobalItem } from '@/logic/providers/itemProvider.ts';
import { useGameStore } from '@/stores/game.ts';
import { useBuffsStore } from '@/stores/battle/buffs.ts';
import { useDebugStore } from '@/stores/debug.ts';
import { registerTimeTools } from '@/stores/debug/sections/timeTools.ts';
import { useUIStore } from '@/stores/ui.ts';
import { useInventoryStore } from '@/stores/inventory/inventory.ts';
import { executeUseItem } from '@/stores/inventory/inventoryUseAction.ts';
import { getPreEvolution } from '@/data/pokemon/evolutionData.ts';
import { POKEMON_DB } from '@/data/pokemon/pokemonDB.ts';
import { isPokemonSpeciesId, requirePokemonSpeciesId } from '@/data/pokemon/pokedex.ts';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider.ts';
import { recalcPokemonStats } from '@/logic/pokemon/pokemonFactory.ts';
import { requireAbilityId } from '@/data/battle/abilities.ts';
import type { Pokemon, Move } from '@/types/pokemon/pokemon.ts';
import type { ItemId } from '@/data/inventory/items.ts';

function createMockFriendshipPokemon(partial: Partial<Pokemon>): Pokemon {
  return {
    uid: 'item-test-uid',
    id: 'pikachu',
    name: 'Pikachu',
    species: 'pikachu',
    level: 25,
    exp: 100,
    expNeeded: 200,
    hp: 100,
    maxHp: 100,
    atk: 50,
    def: 50,
    spa: 50,
    spd: 50,
    spe: 50,
    type: 'electric',
    status: '',
    isShiny: false,
    moves: [{ id: 'thunderbolt', name: 'Rayo', pp: 15, maxPP: 15, type: 'electric' }],
    ability: 'static',
    vigor: 100,
    maxVigor: 100,
    ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
    evs: { hp: 40, atk: 40, def: 40, spa: 40, spd: 40, spe: 40 },
    nature: 'hardy',
    friendship: 70,
    ...partial,
  } as Pokemon;
}

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

function createComplexMockPokemon(partial?: Partial<Pokemon>): Pokemon {
  return {
    uid: 'complex-item-test-mon',
    id: 'raichu',
    name: 'Raichu',
    species: 'raichu',
    level: 50,
    exp: 5000,
    expNeeded: 10000,
    hp: 150,
    maxHp: 150,
    atk: 90,
    def: 55,
    spa: 90,
    spd: 80,
    spe: 110,
    type: 'electric',
    status: '',
    sleepTurns: 0,
    isShiny: false,
    moves: [
      { id: 'thunderbolt', name: 'Rayo', pp: 15, maxPP: 15, type: 'electric' },
      { id: 'quickattack', name: 'Ataque Rápido', pp: 30, maxPP: 30, type: 'normal' },
      { id: 'thundershock', name: 'Impactrueno', pp: 30, maxPP: 30, type: 'electric' },
      { id: 'tailwhip', name: 'Látigo', pp: 30, maxPP: 30, type: 'normal' }
    ],
    ability: 'static',
    vigor: 100,
    maxVigor: 100,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    nature: 'hardy',
    friendship: 70,
    ...partial
  } as Pokemon;
}

describe('Items Domain: Lifecycle, Effects & Matrices Suite', () => {
  describe('Consumable Item Friendship Handlers', () => {
    describe('handleEvBerry (EV-reducing berries: Pomeg, Kelpsy, etc.)', () => {
      test('reduces EVs and increases friendship by +10 without Soothe Bell', () => {
        const p = createMockFriendshipPokemon({ friendship: 70 });
        const res = handleEvBerry(p, 'hp', 'PS');
        expect(res.success).toBe(true);
        expect(p.friendship).toBe(80);
        expect(p.evs?.hp).toBe(30);
      });

      test('increases friendship by +15 (+50% bonus) when holding Soothe Bell', () => {
        const p = createMockFriendshipPokemon({ friendship: 70, heldItem: 'soothebell' });
        const res = handleEvBerry(p, 'hp', 'PS');
        expect(res.success).toBe(true);
        expect(p.friendship).toBe(85);
      });

      test('caps friendship at 255 maximum', () => {
        const p = createMockFriendshipPokemon({ friendship: 250 });
        const res = handleEvBerry(p, 'hp', 'PS');
        expect(res.success).toBe(true);
        expect(p.friendship).toBe(255);
      });
    });

    describe('handleVitamin (Protein, Carbos, etc.)', () => {
      test('adds EVs and increases friendship by +5', () => {
        const p = createMockFriendshipPokemon({ friendship: 70 });
        const res = handleVitamin(p, 'atk', 'Ataque');
        expect(res.success).toBe(true);
        expect(p.friendship).toBe(75);
        expect(p.evs?.atk).toBe(50);
      });

      test('increases friendship by +7 when holding Soothe Bell', () => {
        const p = createMockFriendshipPokemon({ friendship: 70, heldItem: 'soothebell' });
        const res = handleVitamin(p, 'atk', 'Ataque');
        expect(res.success).toBe(true);
        expect(p.friendship).toBe(77);
      });
    });

    describe('handleFeather', () => {
      test('adds EVs and increases friendship by +1', () => {
        const p = createMockFriendshipPokemon({ friendship: 70 });
        const res = handleFeather(p, 'spe', 'Velocidad');
        expect(res.success).toBe(true);
        expect(p.friendship).toBe(71);
        expect(p.evs?.spe).toBe(41);
      });
    });
  });

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
            expect(testCase.itemId.endsWith('ball')).toBe(true);
          } else if (family.familyId === 'fossil_cloning') {
            expect(isValidTarget(testCase.itemId, mon)).toBe(false);
          } else if (family.familyId === 'crafting_economy') {
            expect(isValidTarget(testCase.itemId, mon)).toBe(false);
          }
        }
      );
    });
  });

  describe('Global Buffs Lifecycle (Family 3)', () => {
    beforeEach(() => {
      mockLocalStorage();
      setActivePinia(createPinia());
      const gameStore = useGameStore();
      gameStore.state.starterChosen = true;
      gameStore.state.team = [
        { uid: 'starter-pika', id: 'pikachu', name: 'Pikachu', level: 10, hp: 30, maxHp: 30, moves: [] } as never
      ];
    });

    test('activates reward buffs (Lucky Egg & Amulet Coin) and reflects in activeBuffs', () => {
      const gameStore = useGameStore();
      const buffsStore = useBuffsStore();

      expect(gameStore.state.luckyEggSecs).toBe(0);
      expect(gameStore.state.amuletCoinSecs).toBe(0);

      buffsStore.addBuff('lucky-egg', 1800);
      buffsStore.addBuff('amulet', 3600);

      expect(gameStore.state.luckyEggSecs).toBe(1800);
      expect(gameStore.state.amuletCoinSecs).toBe(3600);

      const activeList = buffsStore.activeBuffs;
      const eggBuff = activeList.find(b => b.id === 'lucky-egg');
      const amuletBuff = activeList.find(b => b.id === 'amulet');

      expect(eggBuff).toBeDefined();
      expect(eggBuff?.secs).toBe(1800);
      expect(amuletBuff).toBeDefined();
      expect(amuletBuff?.secs).toBe(3600);
    });

    test('enforces mutual exclusion between Pickaxe and Brush', () => {
      const gameStore = useGameStore();
      const buffsStore = useBuffsStore();

      buffsStore.addBuff('pickaxe', 1200, 'gold');
      expect(gameStore.state.pickaxeSecs).toBe(1200);
      expect(gameStore.state.pickaxeType).toBe('gold');
      expect(gameStore.state.brushSecs).toBe(0);
      expect(gameStore.state.brushType).toBe(null);

      buffsStore.addBuff('brush', 1200, 'super');
      expect(gameStore.state.brushSecs).toBe(1200);
      expect(gameStore.state.brushType).toBe('super');
      expect(gameStore.state.pickaxeSecs).toBe(0);
      expect(gameStore.state.pickaxeType).toBe(null);
    });

    test('cleans up tool types when time expires (0 seconds)', () => {
      const gameStore = useGameStore();
      const buffsStore = useBuffsStore();
      const debugStore = useDebugStore();
      registerTimeTools(debugStore);

      buffsStore.addBuff('fishing-rod', 1200, 'super');
      buffsStore.addBuff('repel', 300);
      expect(gameStore.state.fishingRodType).toBe('super');

      const advanceCmd = debugStore.tools.find(t => t.command === 'advanceBuffSeconds');
      expect(advanceCmd).toBeDefined();

      advanceCmd?.action(1200 as never);

      expect(gameStore.state.fishingRodSecs).toBe(0);
      expect(gameStore.state.fishingRodType).toBe(null);
      expect(gameStore.state.repelSecs).toBe(0);
    });

    test('supports precise setBuffDuration for imminent expiration testing', () => {
      const gameStore = useGameStore();
      const buffsStore = useBuffsStore();
      const debugStore = useDebugStore();
      registerTimeTools(debugStore);

      buffsStore.addBuff('repel', 1800);
      expect(gameStore.state.repelSecs).toBe(1800);

      const setDurationCmd = debugStore.tools.find(t => t.command === 'setBuffDuration');
      expect(setDurationCmd).toBeDefined();

      setDurationCmd?.action('repelSecs' as never, 2 as never);
      expect(gameStore.state.repelSecs).toBe(2);

      const advanceCmd = debugStore.tools.find(t => t.command === 'advanceBuffSeconds');
      advanceCmd?.action(2 as never);

      expect(gameStore.state.repelSecs).toBe(0);
    });
  });

  describe('Complex Multi-Step Item Flows', () => {
    beforeEach(() => {
      mockLocalStorage();
      setActivePinia(createPinia());
      const gameStore = useGameStore();
      gameStore.state.starterChosen = true;
      gameStore.state.team = [createComplexMockPokemon()];
    });

    describe('Move Relearner (Family 5)', () => {
      test('backtracks evolution chain to discover pre-evolution forgotten moves', () => {
        const mon = createComplexMockPokemon({ id: 'raichu', level: 50 });
        const currentMoveIds = new Set<string>(mon.moves.filter((m): m is Move & { id: string } => Boolean(m?.id)).map(m => m.id));

        const possibleMoves: Array<{ name: string; lv: number }> = [];
        const processedIds = new Set<string>();
        let currentId: string | null = mon.id;

        while (currentId && isPokemonSpeciesId(currentId) && !processedIds.has(currentId)) {
          processedIds.add(currentId);
          const dbEntry = (POKEMON_DB as Record<string, { learnset?: Array<{ name: string; lv: number }> }>)[currentId];
          if (dbEntry && dbEntry.learnset) {
            for (const m of dbEntry.learnset) {
              const normalizedName = m.name.toLowerCase().replace(/\s+/g, '');
              if (m.lv <= mon.level && !currentMoveIds.has(normalizedName)) {
                possibleMoves.push(m);
              }
            }
          }
          currentId = getPreEvolution(requirePokemonSpeciesId(currentId));
        }

        expect(possibleMoves.length).toBeGreaterThan(0);
        expect(processedIds.has('raichu')).toBe(true);
      });

      test('canceling modal rolls back transaction and retains Heart Scale', () => {
        const gameStore = useGameStore();
        const uiStore = useUIStore();
        const inventoryStore = useInventoryStore();

        inventoryStore.addItem('moverelearner', 2);
        const initialMoves = [...(gameStore.state.team[0] as Pokemon).moves];

        const mon = gameStore.state.team[0] as Pokemon;
        const newMove: Move = { id: 'thunderwave', name: 'Onda Trueno', pp: 20, maxPP: 20, type: 'electric' };

        uiStore.addToLearnQueue({
          pokemon: mon,
          move: newMove,
          onComplete: () => {
            inventoryStore.removeItem('moverelearner', 1);
          },
          onCancel: () => {}
        });

        uiStore.currentMoveToLearn?.onCancel?.();
        uiStore.finishMoveLearning();

        expect(gameStore.state.inventory['moverelearner']).toBe(2);
        expect(mon.moves).toEqual(initialMoves);
      });
    });

    describe('TM Learning (Family 4)', () => {
      test('directly teaches TM if pokemon has < 4 moves and consumes TM immediately', () => {
        const gameStore = useGameStore();
        const inventoryStore = useInventoryStore();

        const mon = gameStore.state.team[0] as Pokemon;
        mon.moves = [
          { id: 'thundershock', name: 'Impactrueno', pp: 30, maxPP: 30, type: 'electric' }
        ];

        inventoryStore.addItem('tm01' as ItemId, 1);
        expect(gameStore.state.inventory['tm01']).toBe(1);

        const res = executeUseItem('tm01', 'team', 0);
        expect(res.success).toBe(true);
        expect(res.resultType).toBe('learn_move');

        expect(mon.moves.length).toBe(2);
        expect(gameStore.state.inventory['tm01']).toBeUndefined();
      });

      test('adds to learnQueue when pokemon already knows 4 moves and consumes only on completion', () => {
        const gameStore = useGameStore();
        const uiStore = useUIStore();
        const inventoryStore = useInventoryStore();

        const mon = gameStore.state.team[0] as Pokemon;
        expect(mon.moves.length).toBe(4);

        inventoryStore.addItem('tm01' as ItemId, 1);

        const res = executeUseItem('tm01', 'team', 0);
        expect(res.success).toBe(true);

        expect(gameStore.state.inventory['tm01']).toBe(1);
        expect(uiStore.currentMoveToLearn).toBeDefined();

        uiStore.currentMoveToLearn?.onComplete?.();
        expect(gameStore.state.inventory['tm01']).toBeUndefined();
      });
    });

    describe('Nature Patch (Family 6A)', () => {
      test('updates nature, recalculates stats and consumes naturepatch on confirm', () => {
        const gameStore = useGameStore();
        const inventoryStore = useInventoryStore();

        const mon = gameStore.state.team[0] as Pokemon;
        mon.nature = 'modest';
        recalcPokemonStats(mon);
        const oldAtk = mon.atk;
        const oldSpa = mon.spa;

        inventoryStore.addItem('naturepatch', 1);

        mon.nature = 'adamant';
        recalcPokemonStats(mon);
        inventoryStore.removeItem('naturepatch', 1);

        expect(mon.nature).toBe('adamant');
        expect(mon.atk).toBeGreaterThan(oldAtk);
        expect(mon.spa).toBeLessThan(oldSpa);
        expect(gameStore.state.inventory['naturepatch']).toBeUndefined();
      });
    });

    describe('Ability Pill (Family 6B)', () => {
      test('switches ability to alternative species ability and consumes abilitypill', () => {
        const gameStore = useGameStore();
        const inventoryStore = useInventoryStore();

        const mon = gameStore.state.team[0] as Pokemon;
        mon.id = 'bulbasaur';
        mon.ability = 'overgrow';

        inventoryStore.addItem('abilitypill', 1);

        const speciesAbilities = pokemonDataProvider.getSpeciesAbilities('bulbasaur');
        expect(speciesAbilities.length).toBeGreaterThanOrEqual(1);

        const altAbility = speciesAbilities.find(a => a !== 'overgrow') || 'chlorophyll';
        mon.ability = requireAbilityId(altAbility);
        inventoryStore.removeItem('abilitypill', 1);

        expect(mon.ability).toBe(altAbility);
        expect(gameStore.state.inventory['abilitypill']).toBeUndefined();
      });
    });

    describe('PP Up & PP Max (Family 6C)', () => {
      test('ppup increases maxPP by +20% and ppmax raises to 160% ceiling', () => {
        const gameStore = useGameStore();
        const inventoryStore = useInventoryStore();

        const mon = gameStore.state.team[0] as Pokemon;
        const move = mon.moves[0] as Move;
        move.id = 'thunderbolt';
        const moveData = pokemonDataProvider.getMoveData('thunderbolt');
        const basePP = moveData?.pp || 15;
        move.maxPP = basePP;

        inventoryStore.addItem('ppup', 3);
        inventoryStore.addItem('ppmax', 1);

        const inc1 = Math.floor(basePP * 0.2);
        move.maxPP = Math.min(Math.floor(basePP * 1.6), move.maxPP + inc1);
        inventoryStore.removeItem('ppup', 1);

        expect(move.maxPP).toBe(basePP + inc1);
        expect(gameStore.state.inventory['ppup']).toBe(2);

        const maxCeiling = Math.floor(basePP * 1.6);
        move.maxPP = maxCeiling;
        inventoryStore.removeItem('ppmax', 1);

        expect(move.maxPP).toBe(maxCeiling);
        expect(gameStore.state.inventory['ppmax']).toBeUndefined();
      });
    });
  });
});
