/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { toBrand, unbrand, type Brand } from '@/types/system/branding';

type PokemonId = Brand<string, 'PokemonSpeciesId'>;
type ItemId = Brand<string, 'ItemId'>;

describe('Nominal Branded Types Unit Tests', () => {
  it('constructs branded nominal types with toBrand', () => {
    const rawId = 'pikachu';
    const brandedPikachu: PokemonId = toBrand<string, 'PokemonSpeciesId'>(rawId);

    expect(brandedPikachu).toBe('pikachu');
  });

  it('unbrands nominal values back to raw primitives', () => {
    const item: ItemId = toBrand<string, 'ItemId'>('potion');
    const rawName = unbrand(item);

    expect(rawName).toBe('potion');
    expect(typeof rawName).toBe('string');
  });

  it('preserves primitive equality under runtime comparison', () => {
    const p1: PokemonId = toBrand<string, 'PokemonSpeciesId'>('charizard');
    const p2: PokemonId = toBrand<string, 'PokemonSpeciesId'>('charizard');

    expect(p1 === p2).toBe(true);
  });
});
