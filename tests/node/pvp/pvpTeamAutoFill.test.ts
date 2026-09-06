import { describe, it, expect } from 'vitest';
import {
  fillPvpSlotsFromAvailable,
  ensurePvpTeamsFilled,
  resolveOfflineRivalTeam
} from '@/logic/pvp/pvpTeamHelper';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('pvpTeamAutoFill', () => {
  const createMockPokemon = (uid: string, name: string): Pokemon => ({
    uid,
    id: 'pikachu',
    name,
    level: 50,
    type: 'electric',
    hp: 100,
    maxHp: 100,
    atk: 50,
    def: 50,
    spa: 50,
    spd: 50,
    spe: 50,
    moves: [{ name: 'Impactrueno', pp: 20, maxPP: 20 }]
  } as unknown as Pokemon);

  describe('fillPvpSlotsFromAvailable', () => {
    it('fills empty slots up to maxSlots from available pokemon list', () => {
      const allPokes = [
        createMockPokemon('p1', 'Pika 1'),
        createMockPokemon('p2', 'Pika 2'),
        createMockPokemon('p3', 'Pika 3'),
        createMockPokemon('p4', 'Pika 4'),
        createMockPokemon('p5', 'Pika 5'),
        createMockPokemon('p6', 'Pika 6')
      ];

      const filled3 = fillPvpSlotsFromAvailable([], allPokes, 3);
      expect(filled3).toEqual(['p1', 'p2', 'p3']);

      const filled6 = fillPvpSlotsFromAvailable([], allPokes, 6);
      expect(filled6).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    });

    it('preserves existing slots and only backfills missing slots without duplicates', () => {
      const allPokes = [
        createMockPokemon('p1', 'Pika 1'),
        createMockPokemon('p2', 'Pika 2'),
        createMockPokemon('p3', 'Pika 3'),
        createMockPokemon('p4', 'Pika 4'),
        createMockPokemon('p5', 'Pika 5'),
        createMockPokemon('p6', 'Pika 6')
      ];

      const existing = ['p4'];
      const filled6 = fillPvpSlotsFromAvailable(existing, allPokes, 6);
      expect(filled6).toHaveLength(6);
      expect(filled6[0]).toBe('p4');
      expect(new Set(filled6).size).toBe(6);
    });
  });

  describe('ensurePvpTeamsFilled', () => {
    it('guarantees pvpTeam (3v3) and pvpTeam6 (6v6) are never empty if pokemon exist', () => {
      const team = [createMockPokemon('t1', 'Team 1')]; // adventure team with only 1 pokemon
      const box = [
        createMockPokemon('b1', 'Box 1'),
        createMockPokemon('b2', 'Box 2'),
        createMockPokemon('b3', 'Box 3'),
        createMockPokemon('b4', 'Box 4'),
        createMockPokemon('b5', 'Box 5'),
        createMockPokemon('b6', 'Box 6')
      ];

      const state = {
        team,
        box,
        pvpTeam: [],
        pvpTeam6: []
      };

      ensurePvpTeamsFilled(state);

      expect(state.pvpTeam).toHaveLength(3);
      expect(state.pvpTeam6).toHaveLength(6);
      // Adventure team must remain intact with 1 pokemon
      expect(state.team).toHaveLength(1);
    });
  });

  describe('resolveOfflineRivalTeam', () => {
    it('resolves full 6v6 pokemon team for offline combat even if saved pvpTeam6 was empty', () => {
      const team = [createMockPokemon('t1', 'Team 1')];
      const box = [
        createMockPokemon('b1', 'Box 1'),
        createMockPokemon('b2', 'Box 2'),
        createMockPokemon('b3', 'Box 3'),
        createMockPokemon('b4', 'Box 4'),
        createMockPokemon('b5', 'Box 5')
      ];

      const saveData = {
        team,
        box,
        pvpTeam6: []
      };

      const resolved = resolveOfflineRivalTeam(saveData, '6v6');
      expect(resolved).toHaveLength(6);
      expect(resolved[0]?.uid).toBe('t1');
      expect(resolved[1]?.uid).toBe('b1');
    });
  });
});
