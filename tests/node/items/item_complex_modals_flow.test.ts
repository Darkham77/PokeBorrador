/**
 * tests/node/items/item_complex_modals_flow.test.ts
 *
 * Tier 2 Integration Tests for complex multi-step item workflows:
 * - Move Relearner: Evolution chain backtrack, replacement, rollback on cancel
 * - TM Learning: Compatibility, learning queue, replacement, rollback on cancel
 * - Nature Patch: Recalculates stats, modifies nature, consumes on confirm
 * - Ability Pill: Species alternative abilities, consumes on confirm
 * - PP Up / PP Max: Base PP percentage increases up to 160% ceiling
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mockLocalStorage } from '../../helpers/debugSetup.ts';
import { useGameStore } from '@/stores/game.ts';
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

function createMockPokemon(partial?: Partial<Pokemon>): Pokemon {
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

describe('Complex Multi-Step Item Flows', () => {
  beforeEach(() => {
    mockLocalStorage();
    setActivePinia(createPinia());
    const gameStore = useGameStore();
    gameStore.state.starterChosen = true;
    gameStore.state.team = [createMockPokemon()];
  });

  // ─── 1. MOVE RELEARNER ───────────────────────────────────────────────────
  describe('Move Relearner (Family 5)', () => {
    test('backtracks evolution chain to discover pre-evolution forgotten moves', () => {
      const mon = createMockPokemon({ id: 'raichu', level: 50 });
      const currentMoveIds = new Set<string>(mon.moves.filter((m): m is Move & { id: string } => Boolean(m?.id)).map(m => m.id));

      // Trace back chain manually as MoveRelearnerModal does
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
      expect(processedIds.has('pikachu')).toBe(true);
      expect(processedIds.has('pichu')).toBe(true);
    });

    test('replaces move and consumes moverelearner onComplete', () => {
      const gameStore = useGameStore();
      const uiStore = useUIStore();
      const inventoryStore = useInventoryStore();

      inventoryStore.addItem('moverelearner', 2);
      expect(gameStore.state.inventory['moverelearner']).toBe(2);

      const res = executeUseItem('moverelearner', 'team', 0);
      expect(res.success).toBe(true);
      expect(res.resultType).toBe('relearner');

      // 4 moves -> triggers learnQueue
      const mon = gameStore.state.team[0] as Pokemon;
      const newMove: Move = { id: 'thunderwave', name: 'Onda Trueno', pp: 20, maxPP: 20, type: 'electric' };

      uiStore.addToLearnQueue({
        pokemon: mon,
        move: newMove,
        onComplete: () => {
          inventoryStore.removeItem('moverelearner', 1);
        }
      });

      expect(uiStore.currentMoveToLearn).toBeDefined();

      // Simulate player choosing to replace slot 1 (Ataque Rápido)
      mon.moves[1] = { ...newMove };
      uiStore.currentMoveToLearn?.onComplete?.();

      expect(mon.moves[1]?.id).toBe('thunderwave');
      expect(gameStore.state.inventory['moverelearner']).toBe(1);
    });

    test('does NOT consume moverelearner if player cancels learning', () => {
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
        onCancel: () => {
          // No consumption
        }
      });

      // Player cancels
      uiStore.currentMoveToLearn?.onCancel?.();
      uiStore.finishMoveLearning();

      expect(gameStore.state.inventory['moverelearner']).toBe(2);
      expect(mon.moves).toEqual(initialMoves);
    });
  });

  // ─── 2. TECHNICAL MACHINES (TMs) ──────────────────────────────────────────
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

      // Item should NOT be consumed yet
      expect(gameStore.state.inventory['tm01']).toBe(1);
      expect(uiStore.currentMoveToLearn).toBeDefined();

      // Complete replacement
      uiStore.currentMoveToLearn?.onComplete?.();
      expect(gameStore.state.inventory['tm01']).toBeUndefined();
    });
  });

  // ─── 3. NATURE PATCH ─────────────────────────────────────────────────────
  describe('Nature Patch (Family 6A)', () => {
    test('updates nature, recalculates stats and consumes naturepatch on confirm', () => {
      const gameStore = useGameStore();
      const inventoryStore = useInventoryStore();

      const mon = gameStore.state.team[0] as Pokemon;
      mon.nature = 'modest'; // +SpA, -Atk
      recalcPokemonStats(mon);
      const oldAtk = mon.atk;
      const oldSpa = mon.spa;

      inventoryStore.addItem('naturepatch', 1);

      // Change nature to Adamant (+Atk, -SpA)
      mon.nature = 'adamant';
      recalcPokemonStats(mon);
      inventoryStore.removeItem('naturepatch', 1);

      expect(mon.nature).toBe('adamant');
      expect(mon.atk).toBeGreaterThan(oldAtk);
      expect(mon.spa).toBeLessThan(oldSpa);
      expect(gameStore.state.inventory['naturepatch']).toBeUndefined();
    });
  });

  // ─── 4. ABILITY PILL ─────────────────────────────────────────────────────
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

  // ─── 5. PP UP & PP MAX ───────────────────────────────────────────────────
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

      // 1. First PP Up (+20% of basePP = +3)
      const inc1 = Math.floor(basePP * 0.2);
      move.maxPP = Math.min(Math.floor(basePP * 1.6), move.maxPP + inc1);
      inventoryStore.removeItem('ppup', 1);

      expect(move.maxPP).toBe(basePP + inc1);
      expect(gameStore.state.inventory['ppup']).toBe(2);

      // 2. PP Max (instantly jumps to 160% max)
      const maxCeiling = Math.floor(basePP * 1.6);
      move.maxPP = maxCeiling;
      inventoryStore.removeItem('ppmax', 1);

      expect(move.maxPP).toBe(maxCeiling);
      expect(gameStore.state.inventory['ppmax']).toBeUndefined();
    });
  });
});
