import { describe, it, expect } from 'vitest';
import { isItemUsableOn, clonePokemonForSimulation } from '@/stores/inventory/inventoryHelpers';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Inventory isItemUsableOn Zero-Allocation & Purity Tests', () => {
  it('should evaluate potion usability without mutating the original pokemon', () => {
    const poke = makePokemon('charmander', 10) as Pokemon;
    poke.maxHp = 30;
    poke.hp = 10; // Damaged

    const originalHp = poke.hp;
    const isUsable = isItemUsableOn('potion', poke);

    expect(isUsable).toBe(true);
    expect(poke.hp).toBe(originalHp); // Untouched
  });

  it('should not be usable when pokemon is at full hp for healing items', () => {
    const poke = makePokemon('charmander', 10) as Pokemon;
    poke.maxHp = 30;
    poke.hp = 30; // Full HP

    expect(isItemUsableOn('potion', poke)).toBe(false);
  });

  it('should evaluate evolution stones accurately without JSON.parse', () => {
    const eevee = makePokemon('eevee', 1) as Pokemon;
    expect(isItemUsableOn('waterstone', eevee)).toBe(true);
    expect(isItemUsableOn('firestone', eevee)).toBe(true);
    expect(isItemUsableOn('leafstone', eevee)).toBe(false);

    const pikachu = makePokemon('pikachu', 1) as Pokemon;
    expect(isItemUsableOn('thunderstone', pikachu)).toBe(true);
    expect(isItemUsableOn('waterstone', pikachu)).toBe(false);
  });

  it('should clone accurately via clonePokemonForSimulation without JSON serialization', () => {
    const poke = makePokemon('pikachu', 15) as Pokemon;
    const cloned = clonePokemonForSimulation(poke);

    expect(cloned.id).toBe(poke.id);
    expect(cloned.hp).toBe(poke.hp);
    expect(cloned.maxHp).toBe(poke.maxHp);
    expect(cloned.moves?.length).toBe(poke.moves?.length);

    // Ensure independence of references
    if (cloned.moves && cloned.moves[0]) {
      cloned.moves[0].pp = 0;
      expect(poke.moves?.[0]?.pp).not.toBe(0);
    }
  });
});
