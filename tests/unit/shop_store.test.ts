import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useShopStore } from '../../src/stores/shop.ts';
import { useGameStore } from '../../src/stores/game.ts';
import { useUIStore } from '../../src/stores/ui.ts';
import { SHOP_ITEMS } from '../../src/data/items.ts';
import type { Pokemon } from '../../src/types/pokemon.ts';

describe('Shop Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Mock UI notify
    const ui = useUIStore();
    ui.notify = vi.fn();
  });

  it('calculates quantities correctly', () => {
    const shop = useShopStore();
    expect(shop.getQuantity('pokeball')).toBe(1);
    
    shop.setQuantity('pokeball', 5);
    expect(shop.getQuantity('pokeball')).toBe(5);
    
    shop.setQuantity('pokeball', -1);
    expect(shop.getQuantity('pokeball')).toBe(1);
    
    shop.setQuantity('pokeball', 1000);
    expect(shop.getQuantity('pokeball')).toBe(999);
  });

  it('allows buying items with enough money', () => {
    const shop = useShopStore();
    const game = useGameStore();
    const ui = useUIStore();
    
    game.state.money = 1000;
    game.state.trainerLevel = 10;
    game.state.inventory = {};
    
    const item = SHOP_ITEMS.find(i => i.id === 'pokeball')!;
    const price = item.price;
    
    shop.setQuantity('pokeball', 2);
    shop.buyItem('pokeball');
    
    expect(game.state.money).toBe(1000 - (price * 2));
    expect(game.state.inventory[item.id]).toBe(2);
    expect(ui.notify).toHaveBeenCalledWith(expect.stringContaining('Compraste x2'), item.icon);
  });

  it('prevents buying items without enough money', () => {
    const shop = useShopStore();
    const game = useGameStore();
    const ui = useUIStore();
    
    game.state.money = 10;
    game.state.trainerLevel = 1;
    shop.buyItem('pokeball');
    
    expect(game.state.money).toBe(10); // No change
    expect(ui.notify).toHaveBeenCalledWith(expect.stringContaining('No tenés suficiente dinero'), '💸');
  });

  it('allows buying items with Battle Coins', () => {
    const shop = useShopStore();
    const game = useGameStore();
    
    game.state.battleCoins = 5000;
    game.state.trainerLevel = 30; // High enough for anything
    game.state.inventory = {};
    
    // Destiny Knot costs 4800 BC
    const item = SHOP_ITEMS.find(i => i.id === 'destiny_knot')!;
    
    shop.buyItemBC(item.id);
    
    expect(game.state.battleCoins).toBe(5000 - 4800);
    expect(game.state.inventory[item.id]).toBe(1);
  });

  it('restores HP and PP when healing all pokemon', () => {
    const shop = useShopStore();
    const game = useGameStore();
    
    game.state.money = 1000;
    game.state.playerClass = 'trainer'; // Free healing for non-rocket
    game.state.team = [{
      hp: 10,
      maxHp: 100,
      status: 'poison',
      moves: [{ pp: 5, maxPP: 20 }]
    }] as unknown as Pokemon[];
    
    const success = shop.healAllPokemon();
    
    expect(success).toBe(true);
    expect(game.state.team![0]!.hp).toBe(100);
    expect(game.state.team![0]!.status).toBe(null);
    expect(game.state.team![0]!.moves![0]!.pp).toBe(20);
  });
});
