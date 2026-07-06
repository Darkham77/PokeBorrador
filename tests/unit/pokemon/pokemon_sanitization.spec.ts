import { describe, it, expect, vi } from 'vitest';
import { sanitizePokemon, recalcPokemonStats } from '@/logic/pokemon/pokemonFactory';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { getMaxBuffDuration } from '@/data/inventory/items';

// Mock dependencies
vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getPokemonData: vi.fn((id: string) => {
      if (id === 'charizard') return { id: 'charizard', name: 'Charizard', hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 };
      if (id === 'zubat') return { id: 'zubat', name: 'Zubat', hp: 40, atk: 45, def: 35, spa: 30, spd: 40, spe: 55 };
      return null;
    }),
    getNatureData: vi.fn(() => ({ up: null, down: null })),
    getSpeciesAbilities: vi.fn((id) => {
      if (id === 'charizard') return ['blaze', 'solarpower'];
      if (id === 'zubat') return ['innerfocus'];
      return ['pressure'];
    }),
    resolveMoveId: vi.fn((name) => {
      if (!name || name === 'undefined' || name === '???') return 'tackle';
      const lower = name.toLowerCase().trim();
      if (lower === 'placaje' || lower === 'ataque') return 'tackle';
      if (lower === 'arañazo') return 'scratch';
      return name;
    }),
    getMoveIdBySpanishName: vi.fn((name) => {
      if (!name || name === 'undefined' || name === '???') return 'tackle';
      const lower = name.toLowerCase().trim();
      if (lower === 'placaje' || lower === 'ataque') return 'tackle';
      if (lower === 'arañazo') return 'scratch';
      return name;
    }),
    getMoveData: vi.fn((id) => {
      if (id === 'tackle') return { id: 'tackle', name: 'Placaje', power: 40, type: 'normal', cat: 'physical', pp: 35 };
      if (id === 'scratch') return { id: 'scratch', name: 'Arañazo', power: 40, type: 'normal', cat: 'physical', pp: 35 };
      return null;
    })
  }
}));

describe('Pokemon Sanitization (Self-Healing) - Deep Fixes', () => {
  
  it('should replace null/undefined move names with "Placaje" (tackle)', () => {
    const p = {
      id: 'zubat',
      moves: [
        { name: null },
        { name: 'undefined' },
        { name: '???' }
      ]
    } as unknown as Pokemon;

    sanitizePokemon(p);

    expect(p.moves[0]!.id).toBe('tackle');
    expect(p.moves[0]!.name).toBe('Placaje');
    expect(p.moves[1]!.id).toBe('tackle');
    expect(p.moves[1]!.name).toBe('Placaje');
    expect(p.moves[2]!.id).toBe('tackle');
    expect(p.moves[2]!.name).toBe('Placaje');
    expect(p.moves[0]!.power).toBe(40);
  });

  it('should throw an error on invalid abilities', () => {
    const p = {
      id: 'charizard',
      ability: 'Habilidad Inventada'
    } as unknown as Pokemon;

    expect(() => sanitizePokemon(p)).toThrow();
  });

  it('should provide "Placaje" (tackle) if a pokemon has no moves', () => {
    const p = {
      id: 'zubat',
      moves: []
    } as unknown as Pokemon;

    sanitizePokemon(p);

    expect(p.moves.length).toBe(1);
    expect(p.moves[0]!.id).toBe('tackle');
    expect(p.moves[0]!.name).toBe('Placaje');
  });

  it('should fix missing properties in recalcPokemonStats', () => {
    const p = {
      id: 'charizard',
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: [{ name: 'Arañazo' }] // Missing properties
    } as unknown as Pokemon;

    recalcPokemonStats(p);

    expect(p.moves[0]!.id).toBe('scratch');
    expect(p.moves[0]!.name).toBe('Arañazo');
    expect(p.moves[0]!.power).toBe(40);
    expect(p.moves[0]!.type).toBe('normal');
    expect(p.maxHp).toBeGreaterThan(0);
  });

  it('should handle corrupt stats (NaN) during recalculation', () => {
    const p = {
      id: 'zubat',
      level: 10,
      ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
      atk: NaN,
      maxHp: undefined
    } as unknown as Pokemon;

    recalcPokemonStats(p);

    expect(isNaN(p.atk)).toBe(false);
    expect(p.atk).toBeGreaterThan(0);
    expect(p.maxHp).toBeGreaterThan(0);
  });

  it('should heal levels exceeding the maximum level limit', () => {
    const p = {
      id: 'zubat',
      level: 150,
      exp: 500,
      expNeeded: 1000,
      ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
      moves: [{ name: 'Arañazo' }]
    } as unknown as Pokemon;

    sanitizePokemon(p);

    expect(p.level).toBe(100);
    expect(p.exp).toBe(0);
    expect(p.expNeeded).toBe(Infinity);
  });

  it('should heal experience exceeding level bounds for max level', () => {
    const p = {
      id: 'zubat',
      level: 100,
      exp: 500,
      expNeeded: 1000,
      ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
      moves: [{ name: 'Arañazo' }]
    } as unknown as Pokemon;

    sanitizePokemon(p);

    expect(p.level).toBe(100);
    expect(p.exp).toBe(0);
    expect(p.expNeeded).toBe(Infinity);
  });

  it('should clamp experience to expNeeded - 1 for normal levels to prevent corrupt state', () => {
    const p = {
      id: 'zubat',
      level: 50,
      exp: 1500,
      expNeeded: 1000,
      ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
      moves: [{ name: 'Arañazo' }]
    } as unknown as Pokemon;

    sanitizePokemon(p);

    expect(p.level).toBe(50);
    expect(p.exp).toBe(999);
  });
});

describe('Player State Buff Timer Sanitization', () => {
  it('should sanitize active buff timers that exceed the maximum limit of the database item descriptions', () => {
    // Simulating player state structure
    const state: Record<string, unknown> = {
      repelSecs: 99999,
      luckyEggSecs: 1500,
      amuletCoinSecs: 88888,
      shinyBoostSecs: 0,
      team: [],
      box: [],
      eggs: []
    };

    const buffFields = Object.keys(state).filter(key => key.endsWith('Secs'));
    
    // Simulate sanitizeAll logic
    buffFields.forEach(field => {
      const val = state[field]
      if (val !== undefined && typeof val === 'number') {
        const maxAllowedSecs = getMaxBuffDuration(field);
        if (val > maxAllowedSecs) {
          (state as Record<string, number>)[field] = maxAllowedSecs;
        }
      }
    });

    expect(state.repelSecs).toBe(1800);
    expect(state.amuletCoinSecs).toBe(3600);
    expect(state.luckyEggSecs).toBe(1500);
    expect(state.shinyBoostSecs).toBe(0);
  });
});

