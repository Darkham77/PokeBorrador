
import { describe, it, expect, vi } from 'vitest';
import { sanitizePokemon, recalcPokemonStats } from '@/logic/pokemonFactory';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';

// Mock dependencies
vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getPokemonData: vi.fn((id) => {
      if (id === 'charizard') return { id: 'charizard', name: 'Charizard', hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 };
      if (id === 'zubat') return { id: 'zubat', name: 'Zubat', hp: 40, atk: 45, def: 35, spa: 30, spd: 40, spe: 55 };
      return null;
    }),
    getNatureData: vi.fn(() => ({ up: null, down: null })),
    getSpeciesAbilities: vi.fn((id) => {
      if (id === 'charizard') return ['Mar Llamas', 'Poder Solar'];
      if (id === 'zubat') return ['Foco Interno'];
      return ['Presión'];
    }),
    getMoveData: vi.fn((name) => {
      if (name === 'Placaje') return { power: 40, type: 'normal', cat: 'physical', pp: 35 };
      if (name === 'Arañazo') return { power: 40, type: 'normal', cat: 'physical', pp: 35 };
      return null;
    })
  }
}));

describe('Pokemon Sanitization (Self-Healing) - Deep Fixes', () => {
  
  it('should replace null/undefined move names with "Placaje"', () => {
    const p = {
      id: 'zubat',
      moves: [
        { name: null },
        { name: 'undefined' },
        { name: '???' }
      ]
    };

    sanitizePokemon(p);

    expect(p.moves[0].name).toBe('Placaje');
    expect(p.moves[1].name).toBe('Placaje');
    expect(p.moves[2].name).toBe('Placaje');
    expect(p.moves[0].power).toBe(40);
  });

  it('should repair invalid abilities', () => {
    const p = {
      id: 'charizard',
      ability: 'Habilidad Inventada'
    };

    sanitizePokemon(p);

    // Should fall back to the first valid ability for Charizard
    expect(p.ability).toBe('Mar Llamas');
  });

  it('should provide "Placaje" if a pokemon has no moves', () => {
    const p = {
      id: 'zubat',
      moves: []
    };

    sanitizePokemon(p);

    expect(p.moves.length).toBe(1);
    expect(p.moves[0].name).toBe('Placaje');
  });

  it('should fix missing properties in recalcPokemonStats', () => {
    const p = {
      id: 'charizard',
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: [{ name: 'Arañazo' }] // Missing properties
    };

    recalcPokemonStats(p);

    expect(p.moves[0].power).toBe(40);
    expect(p.moves[0].type).toBe('normal');
    expect(p.maxHp).toBeGreaterThan(0);
  });

  it('should handle corrupt stats (NaN) during recalculation', () => {
    const p = {
      id: 'zubat',
      level: 10,
      ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
      atk: NaN,
      maxHp: undefined
    };

    recalcPokemonStats(p);

    expect(isNaN(p.atk)).toBe(false);
    expect(p.atk).toBeGreaterThan(0);
    expect(p.maxHp).toBeGreaterThan(0);
  });
});
