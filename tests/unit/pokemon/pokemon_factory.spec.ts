import { describe, it, expect, vi } from 'vitest';
import { makePokemon, levelUpPokemon } from '@/logic/pokemon/pokemonFactory';

// Mock dependencies
vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getPokemonData: vi.fn((id: string) => {
      if (id === 'charmander') return { id: 'charmander', name: 'Charmander', emoji: '🔥', type: 'fire', hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65, learnset: [{ lv: 10, id: 'flamethrower', name: 'Lanzallamas' }] };
      if (id === 'pidgey') return { id: 'pidgey', name: 'Pidgey', emoji: '🐦', type: 'normal', hp: 40, atk: 45, def: 40, spa: 35, spd: 35, spe: 56 };
      return null;
    }),
    getNatureData: vi.fn(() => ({ up: null, down: null })),
    getSpeciesAbilities: vi.fn((id) => {
      if (id === 'pidgey') return ['keeneye'];
      return ['blaze'];
    }),
    resolveMoveId: vi.fn((name) => {
      if (!name) return '';
      const lower = name.toLowerCase().trim();
      if (lower === 'placaje' || lower === 'ataque') return 'tackle';
      if (lower === 'lanzallamas') return 'flamethrower';
      return name;
    }),
    getMoveData: vi.fn((id) => {
      if (id === 'tackle') return { id: 'tackle', name: 'Placaje', power: 40, type: 'normal', cat: 'physical', pp: 35 };
      if (id === 'flamethrower') return { id: 'flamethrower', name: 'Lanzallamas', power: 90, type: 'fire', cat: 'special', pp: 15 };
      if (id === 'scratch' || id === 'growl' || id === 'ember' || id === 'smokescreen') {
        return { id, name: id.toUpperCase(), power: 40, type: 'normal', cat: 'physical', pp: 35 };
      }
      return { id: 'tackle', name: 'Placaje', power: 40, type: 'normal', cat: 'physical', pp: 35 };
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

vi.mock('@/stores/player/playerClass', () => ({
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

vi.mock('@/logic/pokemon/pokemonUtils', () => ({
  getMovesAtLevel: vi.fn(() => [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35 }])
}));

describe('Pokemon Factory', () => {
  
  describe('makePokemon', () => {
    it('should create a valid pokemon object', () => {
      const p = makePokemon('charmander', 5);
      expect(p).toBeDefined();
      expect(p!.id).toBe('charmander');
      expect(p!.level).toBe(5);
      expect(p!.hp).toBe(p!.maxHp);
      expect(p!.moves.length).toBeGreaterThan(0);
      expect(p!.uid).toBeDefined();
    });

    it('should throw an error if species is missing', () => {
      expect(() => makePokemon('missing_id', 5)).toThrow()
    });

    it('should handle numeric IDs correctly by casting to string and throw if invalid', () => {
      expect(() => makePokemon(1776736888069.925, 5)).toThrow()
    });

    it('should respect level limits', () => {
      const p = makePokemon('charmander', 150);
      expect(p!.level).toBe(100);
    });

    it('should assign a gender unless genderless', () => {
      const p = makePokemon('charmander', 5);
      expect(['m', 'f']).toContain(p!.gender);
    });
  });

  describe('levelUpPokemon', () => {
    it('should increase level and update stats', () => {
      const p = makePokemon('charmander', 5);
      const oldLevel = p!.level;
      const oldMaxHp = p!.maxHp;
      
      levelUpPokemon(p!);
      
      expect(p!.level).toBe(oldLevel + 1);
      expect(p!.maxHp).toBeGreaterThanOrEqual(oldMaxHp);
    });

    it('should not level up if already at level 100', () => {
      const p = makePokemon('charmander', 100);
      const res = levelUpPokemon(p!);
      expect(p!.level).toBe(100);
      expect(res).toEqual([]);
    });

    it('should block level up if holding Everstone (Piedra Eterna)', () => {
      const p = makePokemon('charmander', 5);
      p!.heldItem = 'everstone';
      const res = levelUpPokemon(p!);
      expect(p!.level).toBe(5);
      expect(res).toBeNull();
    });

    it('should return pending moves if moves list is full', () => {
      const p = makePokemon('charmander', 9);
      p!.moves = [
        { id: 'scratch', name: 'Scratch', pp: 10, maxPP: 10 },
        { id: 'growl', name: 'Growl', pp: 10, maxPP: 10 },
        { id: 'ember', name: 'Ember', pp: 10, maxPP: 10 },
        { id: 'smokescreen', name: 'Smokescreen', pp: 10, maxPP: 10 }
      ];
      
      const pending = levelUpPokemon(p!);
      expect(pending!.length).toBe(1);
      expect(pending![0]!.name).toBe('Lanzallamas');
      expect(p!.moves.length).toBe(4);
    });
  });
});
