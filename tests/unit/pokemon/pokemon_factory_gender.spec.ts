import { describe, it, expect } from 'vitest';
import { assignGender, makePokemon } from '@/logic/pokemon/pokemonFactory';

describe('pokemonFactory gender assignment & validation', () => {
  it('assigns female gender "f" for 100% female species Ogerpon Hearthflame', () => {
    const gender = assignGender('ogerponhearthflame');
    expect(gender).toBe('f');
  });

  it('assigns female gender "f" for 100% female species Ogerpon Cornerstone and Wellspring', () => {
    expect(assignGender('ogerponcornerstone')).toBe('f');
    expect(assignGender('ogerponwellspring')).toBe('f');
  });

  it('assigns gender "f" when creating Ogerpon Hearthflame without specifying gender options', () => {
    const p = makePokemon('ogerponhearthflame', 50, { bypassWhitelist: true });
    expect(p).not.toBeNull();
    expect(p?.gender).toBe('f');
  });
});
