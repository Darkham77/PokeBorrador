
import { describe, it, expect } from 'vitest';
import { getPokemonTier } from '@/logic/pokemon/tierEngine';
import { getSellPrice, filterInventoryByCategory } from '@/logic/inventory/inventoryEngine';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Tier Engine', () => {
  it('should calculate specific tiers correctly', () => {
    const perfectPoke = { ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } };
    expect(getPokemonTier(perfectPoke).tier).toBe('S+');

    const midPoke = { ivs: { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 } }; // 120
    expect(getPokemonTier(midPoke).tier).toBe('B');

    const badPoke = { ivs: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 } }; // 6
    expect(getPokemonTier(badPoke).tier).toBe('F');
    
    const nulledPoke = { ivs: {} } as unknown as Partial<Pokemon>;
    expect(getPokemonTier(nulledPoke as unknown as Pokemon).tier).toBe('F');
  });
});

describe('Inventory Engine', () => {
  it('should calculate sell prices as half of buying price', () => {
    // pokeball is 200, so sell price should be 100
    expect(getSellPrice('pokeball')).toBe(100);
    // greatball is 500, so sell price should be 250
    expect(getSellPrice('greatball')).toBe(250);
    // Non-existent item
    expect(getSellPrice('objeto_imaginario' as unknown as import('@/data/inventory/items').ItemId)).toBe(0);
  });

  it('should filter inventory by category', () => {
    const inv = {
      'pokeball': 10,
      'potion': 5,
      'firestone': 1,
      'objeto_desconocido': 2
    };

    const balls = filterInventoryByCategory(inv, 'pokeballs');
    expect(balls.length).toBe(1);
    expect(balls[0]![0]).toBe('pokeball');

    const potions = filterInventoryByCategory(inv, 'potions');
    expect(potions.length).toBe(1);
    expect(potions[0]![0]).toBe('potion');
  });
});
