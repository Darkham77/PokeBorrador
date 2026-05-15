import { describe, it, expect } from 'vitest';
import { getPokemonTier, hasPerfectIV } from '@/logic/pokemon/tierEngine';
import type { Pokemon } from '@/types/pokemon';

describe('Tier Engine', () => {
  it('should return F tier for null or empty pokemon', () => {
    const tier = getPokemonTier(null);
    expect(tier.tier).toBe('F');
    expect(tier.total).toBe(0);
  });

  it('should calculate S+ tier for perfect IVs (186 total)', () => {
    const pokemon = {
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
    };
    const tier = getPokemonTier(pokemon as Partial<Pokemon>);
    expect(tier.tier).toBe('S+');
    expect(tier.total).toBe(186);
  });

  it('should calculate S tier for high IVs (170 total)', () => {
    const pokemon = {
      ivs: { hp: 30, atk: 30, def: 30, spa: 30, spd: 25, spe: 25 }
    };
    const tier = getPokemonTier(pokemon as Partial<Pokemon>);
    expect(tier.tier).toBe('S');
    expect(tier.total).toBe(170);
  });

  it('should calculate A tier for average-high IVs (150 total)', () => {
    const pokemon = {
      ivs: { hp: 25, atk: 25, def: 25, spa: 25, spd: 25, spe: 25 }
    };
    const tier = getPokemonTier(pokemon as Partial<Pokemon>);
    expect(tier.tier).toBe('A');
    expect(tier.total).toBe(150);
  });

  it('should detect perfect IVs correctly', () => {
    expect(hasPerfectIV({ ivs: { hp: 31 } } as Partial<Pokemon>)).toBe(true);
    expect(hasPerfectIV({ ivs: { hp: 30, atk: 20 } } as Partial<Pokemon>)).toBe(false);
    expect(hasPerfectIV(null)).toBe(false);
  });
});
