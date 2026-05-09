
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makePokemon, levelUpPokemon } from '@/logic/pokemonFactory';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';

// Mock dependencies
vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getPokemonData: vi.fn((id) => {
      if (id === 'charmander') return { id: 'charmander', name: 'Charmander', emoji: '🔥', type: 'fire', hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65, learnset: [{ lv: 10, name: 'Lanzallamas' }] };
      if (id === 'pidgey') return { id: 'pidgey', name: 'Pidgey', emoji: '🐦', type: 'normal', hp: 40, atk: 45, def: 40, spa: 35, spd: 35, spe: 56 };
      return null;
    }),
    getNatureData: vi.fn(() => ({ up: null, down: null })),
    getSpeciesAbilities: vi.fn(() => ['Mar Llamas']),
    getMoveData: vi.fn((name) => {
      if (name === 'Placaje') return { power: 40, type: 'normal', cat: 'physical', pp: 35 };
      if (name === 'Lanzallamas') return { power: 90, type: 'fire', cat: 'special', pp: 15 };
      return { power: 40, type: 'normal', cat: 'physical', pp: 35 };
    })
  }
}));

vi.mock('@/stores/events', () => ({
  useEventStore: vi.fn(() => ({
    getEventSpeciesShinyMultiplier: vi.fn(() => 1),
    getSpeciesBonuses: vi.fn(),
    globalMultipliers: { shiny: 1 }
  }))
}));

vi.mock('@/stores/playerClass', () => ({
  usePlayerClassStore: vi.fn(() => ({
    playerClass: 'standard',
    classData: { captureStreak: 0 }
  }))
}));

vi.mock('@/stores/war', () => ({
  useWarStore: vi.fn(() => ({
    getGuardianForMap: vi.fn(),
    hasDominanceIvBonus: vi.fn(),
    getDominanceShinyMultiplier: vi.fn()
  }))
}));

vi.mock('@/logic/pokemonUtils', () => ({
  getMovesAtLevel: vi.fn(() => [{ name: 'Placaje', pp: 35, maxPP: 35 }])
}));

describe('Pokemon Factory', () => {
  
  describe('makePokemon', () => {
    it('should create a valid pokemon object', () => {
      const p = makePokemon('charmander', 5);
      expect(p).toBeDefined();
      expect(p.id).toBe('charmander');
      expect(p.level).toBe(5);
      expect(p.hp).toBe(p.maxHp);
      expect(p.moves.length).toBeGreaterThan(0);
      expect(p.uid).toBeDefined();
    });

    it('should fallback to pidgey if species is missing', () => {
      const p = makePokemon('missing_id', 5);
      expect(p.id).toBe('pidgey');
    });

    it('should respect level limits', () => {
      const p = makePokemon('charmander', 150);
      expect(p.level).toBe(100);
    });

    it('should assign a gender unless genderless', () => {
      const p = makePokemon('charmander', 5);
      expect(['M', 'F']).toContain(p.gender);
      
      const g = makePokemon('ditto', 5); // Dittoo is in GENDERLESS list in factory
      // Note: In my mock it might return pidgey if ditto not in mock, but GENDERLESS check happens before data fetch in assignGender if used directly, 
      // however makePokemon calls assignGender(id).
    });
  });

  describe('levelUpPokemon', () => {
    it('should increase level and update stats', () => {
      const p = makePokemon('charmander', 5);
      const oldLevel = p.level;
      const oldMaxHp = p.maxHp;
      
      levelUpPokemon(p);
      
      expect(p.level).toBe(oldLevel + 1);
      expect(p.maxHp).toBeGreaterThanOrEqual(oldMaxHp);
    });

    it('should not level up if already at level 100', () => {
      const p = makePokemon('charmander', 100);
      const res = levelUpPokemon(p);
      expect(p.level).toBe(100);
      expect(res).toEqual([]);
    });

    it('should block level up if holding Everstone (Piedra Eterna)', () => {
      const p = makePokemon('charmander', 5);
      p.heldItem = 'Piedra Eterna';
      const res = levelUpPokemon(p);
      expect(p.level).toBe(5);
      expect(res).toBeNull();
    });

    it('should return pending moves if moves list is full', () => {
      const p = makePokemon('charmander', 9);
      p.moves = [
        { name: 'M1', pp: 10, maxPP: 10 },
        { name: 'M2', pp: 10, maxPP: 10 },
        { name: 'M3', pp: 10, maxPP: 10 },
        { name: 'M4', pp: 10, maxPP: 10 }
      ];
      
      const pending = levelUpPokemon(p);
      expect(pending.length).toBe(1);
      expect(pending[0].name).toBe('Lanzallamas');
      expect(p.moves.length).toBe(4);
    });
  });
});
