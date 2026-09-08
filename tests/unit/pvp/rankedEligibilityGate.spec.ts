import { describe, it, expect } from 'vitest';
import {
  validatePokemonForRanked,
  validateTeamForRanked,
  normalizeRankedRules
} from '@/logic/pvp/rankedEngine';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('rankedEligibilityGate', () => {
  const sampleRules = normalizeRankedRules({
    levelCap: 50,
    maxPokemon: 3,
    allowedTypes: ['fire', 'electric'],
    bannedPokemonIds: ['mewtwo', 'rayquaza']
  }, 'Torneo Fuego y Trueno');

  const createTestPokemon = (overrides: Partial<Pokemon>): Pokemon => ({
    uid: 'poke_test_uid',
    id: 'charmander',
    name: 'Charmander',
    level: 25,
    type: 'fire',
    type2: undefined,
    hp: 100,
    maxHp: 100,
    moves: [{ id: 'ember', name: 'Ember', pp: 25, maxPP: 25 }],
    heldItem: null,
    isShiny: false,
    ...overrides
  } as Pokemon);

  describe('validatePokemonForRanked', () => {
    it('approves a Pokemon matching all constraints', () => {
      const validMon = createTestPokemon({ id: 'charmander', level: 30, type: 'fire' });
      expect(validatePokemonForRanked(validMon, sampleRules)).toEqual({ ok: true });
    });

    it('rejects a Pokemon exceeding the level cap', () => {
      const overleveled = createTestPokemon({ id: 'charmander', level: 55, type: 'fire' });
      const result = validatePokemonForRanked(overleveled, sampleRules);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('supera el nivel máximo');
    });

    it('rejects a banned Pokemon', () => {
      const bannedMon = createTestPokemon({ id: 'mewtwo', name: 'Mewtwo', level: 50, type: 'psychic' });
      const result = validatePokemonForRanked(bannedMon, sampleRules);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('está baneado');
    });

    it('rejects a Pokemon with an unallowed type', () => {
      const waterMon = createTestPokemon({ id: 'squirtle', name: 'Squirtle', level: 40, type: 'water' });
      const result = validatePokemonForRanked(waterMon, sampleRules);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('no tiene un tipo permitido');
    });

    it('accepts a dual-type Pokemon if at least one type matches allowedTypes', () => {
      const dualType = createTestPokemon({ id: 'charizard', name: 'Charizard', level: 50, type: 'fire', type2: 'flying' });
      expect(validatePokemonForRanked(dualType, sampleRules)).toEqual({ ok: true });
    });
  });

  describe('validateTeamForRanked', () => {
    it('rejects an empty team', () => {
      expect(validateTeamForRanked([], sampleRules).ok).toBe(false);
    });

    it('rejects a team exceeding maxPokemon', () => {
      const team = [
        createTestPokemon({ id: 'charmander', level: 40 }),
        createTestPokemon({ id: 'pikachu', level: 40, type: 'electric' }),
        createTestPokemon({ id: 'vulpix', level: 40, type: 'fire' }),
        createTestPokemon({ id: 'voltorb', level: 40, type: 'electric' })
      ];
      const res = validateTeamForRanked(team, sampleRules);
      expect(res.ok).toBe(false);
      expect(res.reason).toContain('Máximo 3');
    });

    it('approves a fully valid team', () => {
      const team = [
        createTestPokemon({ id: 'charmander', level: 40 }),
        createTestPokemon({ id: 'pikachu', level: 40, type: 'electric' })
      ];
      expect(validateTeamForRanked(team, sampleRules)).toEqual({ ok: true });
    });
  });
});
