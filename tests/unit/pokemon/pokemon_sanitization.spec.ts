import { describe, it, expect, vi } from 'vitest';
import { recalcPokemonStats } from '@/logic/pokemon/pokemonFactory';
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

describe('Pokemon Recalculation Tests', () => {
  it('should fix missing stats in recalcPokemonStats on a valid structure', () => {
    const p = {
      uid: 'test-uid-charizard',
      id: 'charizard',
      ability: 'blaze',
      nature: 'hardy',
      level: 50,
      gender: 'M',
      vigor: 100,
      maxVigor: 100,
      hp: 5,
      maxHp: 100,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: [{ id: 'scratch', name: 'Arañazo' }]
    } as unknown as Pokemon;

    recalcPokemonStats(p);

    expect(p.maxHp).toBeGreaterThan(0);
    expect(p.atk).toBeGreaterThan(0);
  });

  it('should handle corrupt stats (NaN) during recalculation', () => {
    const p = {
      uid: 'test-uid-zubat',
      id: 'zubat',
      ability: 'innerfocus',
      nature: 'hardy',
      level: 10,
      gender: 'M',
      vigor: 100,
      maxVigor: 100,
      hp: 5,
      ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
      moves: [{ id: 'scratch', name: 'Arañazo' }],
      atk: NaN
    } as unknown as Pokemon;

    p.maxHp = undefined as unknown as number;

    recalcPokemonStats(p);

    expect(isNaN(p.atk)).toBe(false);
    expect(p.atk).toBeGreaterThan(0);
    expect(p.maxHp).toBeGreaterThan(0);
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

