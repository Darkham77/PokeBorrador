import { describe, it, expect } from 'vitest';
import { getPokemonTier } from '@/logic/pokemon/tierEngine';
import { getSellPrice, filterInventoryByCategory } from '@/logic/inventory/inventoryEngine';

describe('Tier Engine', () => {
  it('should calculate specific tiers correctly', () => {
    const perfectPoke = { ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } };
    expect(getPokemonTier(perfectPoke).tier).toBe('S+');

    const midPoke = { ivs: { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 } }; // 120
    expect(getPokemonTier(midPoke).tier).toBe('B');

    const badPoke = { ivs: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 } }; // 6
    expect(getPokemonTier(badPoke).tier).toBe('F');
    
    const nulledPoke = { ivs: {} };
    expect(getPokemonTier(nulledPoke).tier).toBe('F');
  });
});

describe('Inventory Engine', () => {
  it('should calculate sell prices as half of buying price', () => {
    // Pokéball is 200, so sell price should be 100
    expect(getSellPrice('Pokéball')).toBe(100);
    // Súper Ball is 500, so sell price should be 250
    expect(getSellPrice('Súper Ball')).toBe(250);
    // Non-existent item
    expect(getSellPrice('Objeto Imaginario')).toBe(0);
  });

  it('should filter inventory by category', () => {
    const inv = {
      'Pokéball': 10,
      'Poción': 5,
      'Piedra Fuego': 1,
      'Objeto Desconocido': 2
    };

    const balls = filterInventoryByCategory(inv, 'pokeballs');
    expect(balls.length).toBe(1);
    expect(balls[0][0]).toBe('Pokéball');

    const potions = filterInventoryByCategory(inv, 'pociones');
    expect(potions.length).toBe(1);
    expect(potions[0][0]).toBe('Poción');
  });
});
