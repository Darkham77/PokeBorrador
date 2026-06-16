import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  applyMarketFilters, 
  buildMarketSaleLabel, 
  ensureMarketSoldSeenState 
} from '../../src/logic/economy/market.ts';
import type { MarketListing, MarketFilters } from '../../src/logic/economy/market.ts';
import type { GameState } from '../../src/types/game.ts';

const mockListing: MarketListing = {
  id: 'uuid-1',
  listing_type: 'pokemon',
  price: 1000,
  seller_id: 'seller-1',
  created_at: '2026-05-13T10:00:00Z',
  status: 'active',
  data: {
    name: 'Pikachu',
    level: 10,
    type: 'electric',
    ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }
  }
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
    ...mockListing,
    listing_type: 'item',
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
