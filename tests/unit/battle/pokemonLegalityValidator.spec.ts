import { describe, it, expect } from 'vitest';
import { PokemonLegalityValidator } from '@/logic/battle/engine/pokemonLegalityValidator';

describe('PokemonLegalityValidator', () => {
  it('validates legal pokemon correctly', () => {
    const poke = {
      species: 'pikachu',
      ability: 'static',
      gender: 'm',
      moves: ['thunderbolt', 'quickattack']
    };
    const result = PokemonLegalityValidator.validatePokemon(poke);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects invalid species ID', () => {
    const poke = {
      species: 'not_a_pokemon_12345',
      ability: 'static'
    };
    const result = PokemonLegalityValidator.validatePokemon(poke);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid or non-existent species ID');
  });

  it('rejects invalid ability for species', () => {
    const poke = {
      species: 'pikachu',
      ability: 'wonderguard',
      moves: ['thunderbolt']
    };
    const result = PokemonLegalityValidator.validatePokemon(poke);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('cannot legally have ability'))).toBe(true);
  });

  it('rejects gender on strictly genderless species', () => {
    const poke = {
      species: 'magnemite',
      ability: 'magnetpull',
      gender: 'f',
      moves: ['thunderbolt']
    };
    const result = PokemonLegalityValidator.validatePokemon(poke);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('strictly genderless'))).toBe(true);
  });

  it('rejects pokemon with more than 4 moves', () => {
    const poke = {
      species: 'pikachu',
      ability: 'static',
      moves: ['thunderbolt', 'quickattack', 'irontail', 'surf', 'agility']
    };
    const result = PokemonLegalityValidator.validatePokemon(poke);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('maximum allowed is 4'))).toBe(true);
  });
});
