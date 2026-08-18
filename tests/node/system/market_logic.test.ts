import { test, describe } from 'vitest';
import assert from 'node:assert/strict';
import { 
  applyMarketFilters, 
  buildMarketSaleLabel, 
  ensureMarketSoldSeenState 
} from '../../../src/logic/economy/market.ts';
import type { MarketListing, MarketFilters } from '../../../src/logic/economy/market.ts';
import type { GameState } from '../../../src/types/system/game.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

const mockPokemon: Pokemon = {
  uid: 'test-uid-pikachu',
  id: 'pikachu',
  name: 'Pikachu',
  species: 'pikachu',
  level: 10,
  exp: 0,
  expNeeded: 100,
  hp: 35,
  maxHp: 35,
  atk: 55,
  def: 40,
  spa: 50,
  spd: 50,
  spe: 90,
  type: 'electric',
  status: '',
  isShiny: false,
  moves: [],
  ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
  nature: 'hardy'
};

const mockListing: MarketListing = {
  id: 'uuid-1',
  listing_type: 'pokemon',
  price: 1000,
  seller_id: 'seller-1',
  created_at: '2026-05-13T10:00:00Z',
  status: 'active',
  data: mockPokemon
};

const defaultFilters: MarketFilters = {
  mode: 'pokemon',
  search: '',
  priceMin: 0,
  priceMax: 10000,
  tier: 'all',
  type: 'all',
  levelMin: 1,
  levelMax: 100,
  ivTotalMin: 0,
  ivTotalMax: 186,
  ivAny31: false,
  itemCat: 'all'
};

describe('Market Logic', () => {
  test('Market Logic: applyMarketFilters', () => {
    const list = [mockListing];

    // Match all
    assert.strictEqual(applyMarketFilters(list, defaultFilters, 'explore').length, 1);

    // Filter by search
    assert.strictEqual(applyMarketFilters(list, { ...defaultFilters, search: 'Pika' }, 'explore').length, 1);
    assert.strictEqual(applyMarketFilters(list, { ...defaultFilters, search: 'Charm' }, 'explore').length, 0);

    // Filter by price
    assert.strictEqual(applyMarketFilters(list, { ...defaultFilters, priceMax: 500 }, 'explore').length, 0);

    // Filter by type
    assert.strictEqual(applyMarketFilters(list, { ...defaultFilters, type: 'electric' }, 'explore').length, 1);
    assert.strictEqual(applyMarketFilters(list, { ...defaultFilters, type: 'fire' }, 'explore').length, 0);
  });

  test('Market Logic: buildMarketSaleLabel', () => {
    assert.strictEqual(buildMarketSaleLabel(mockListing), 'tu Pokémon Pikachu');
    
    const itemListing: MarketListing = {
      id: 'uuid-2',
      listing_type: 'item',
      price: 200,
      seller_id: 'seller-1',
      created_at: '2026-05-13T10:00:00Z',
      status: 'active',
      data: { name: 'Poke Ball', qty: 5 }
    };
    assert.strictEqual(buildMarketSaleLabel(itemListing), 'tu objeto Poke Ball x5');
  });

  test('Market Logic: state management (seen ids)', () => {
    const state = { marketSoldSeenIds: [] } as unknown as GameState;
    
    const result = ensureMarketSoldSeenState(state);
    assert.deepStrictEqual(result, []);
    
    state.marketSoldSeenIds = ['valid-id', '', '  ', 'invalid-type-simulated'];
    const cleaned = ensureMarketSoldSeenState(state);
    assert.deepStrictEqual(cleaned, ['valid-id']);
  });
});
