/**
 * tests/node/market.test.ts
 *
 * VITEST (vite-node) — node environment
 *
 * Tests pure global market logic and filters from src/logic/market.ts.
 * Zero mocks, zero Pinia, zero Vue, zero browser dependencies.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import {
  applyMarketFilters,
  buildMarketSaleLabel,
  ensureMarketSoldSeenState,
  isMarketSoldSeen,
  markMarketSoldSeen,
  type MarketListing,
  type MarketFilters
} from '../../../src/logic/economy/market.ts';

import type { GameState } from '../../../src/types/system/game.ts';

// Helper to create mock market listings
function makeMockListing(id: string, type: 'pokemon' | 'item', name: string, price: number, sellerId: string, extra: Record<string, unknown> = {}): MarketListing {
  return {
    id,
    listing_type: type,
    price,
    seller_id: sellerId,
    seller_name: `Seller_${sellerId}`,
    status: 'active',
    created_at: '2026-05-13T10:00:00Z',
    data: {
      name,
      ...extra
    }
  };
}

// Helper to get default filters
function getDefaultFilters(mode: 'pokemon' | 'item' = 'pokemon'): MarketFilters {
  return {
    mode,
    search: '',
    priceMin: 0,
    priceMax: 1000000,
    tier: 'all',
    type: 'all',
    levelMin: 1,
    levelMax: 100,
    ivTotalMin: 0,
    ivTotalMax: 186,
    ivAny31: false,
    itemCat: 'all'
  };
}

describe('Global Market Logic & Calculations', () => {
  describe('buildMarketSaleLabel', () => {
    it('returns standard label for null or empty listing', () => {
      assert.strictEqual(buildMarketSaleLabel(null as unknown as MarketListing), 'una publicación');
    });

    it('returns correct label for a Pokemon listing', () => {
      const listing = makeMockListing('list_1', 'pokemon', 'Charizard', 15000, 'seller_1');
      assert.strictEqual(buildMarketSaleLabel(listing), 'tu Pokémon Charizard');
    });

    it('returns correct label for an item listing with custom quantity', () => {
      const listing = makeMockListing('list_2', 'item', 'Ultra Ball', 800, 'seller_1', { qty: 5 });
      assert.strictEqual(buildMarketSaleLabel(listing), 'tu objeto Ultra Ball x5');
    });

    it('defaults to qty 1 if quantity is omitted in item listing', () => {
      const listing = makeMockListing('list_3', 'item', 'Poción', 300, 'seller_1');
      assert.strictEqual(buildMarketSaleLabel(listing), 'tu objeto Poción x1');
    });
  });

  describe('ensureMarketSoldSeenState & seen status', () => {
    it('initializes and manages market sold seen IDs array safely', () => {
      const state = {} as GameState;
      const seenIds = ensureMarketSoldSeenState(state);
      assert.ok(Array.isArray(seenIds));
      assert.strictEqual(seenIds.length, 0);
    });

    it('correctly reports seen status and prevents duplicates', () => {
      const state = { marketSoldSeenIds: [] } as unknown as GameState;
      
      assert.strictEqual(isMarketSoldSeen('listing_123', state), false);
      
      markMarketSoldSeen('listing_123', state);
      assert.strictEqual(isMarketSoldSeen('listing_123', state), true);
      
      // Attempting to mark seen again should not duplicate
      markMarketSoldSeen('listing_123', state);
      assert.strictEqual(state.marketSoldSeenIds?.length, 1);
    });
  });

  describe('applyMarketFilters', () => {
    const pokemonListing1 = makeMockListing('pk_1', 'pokemon', 'Pikachu', 1200, 'user_a', {
      level: 25,
      type: 'electric',
      ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } // Sum = 60
    });

    const pokemonListing2 = makeMockListing('pk_2', 'pokemon', 'Gyarados', 9500, 'user_b', {
      level: 42,
      type: 'water',
      ivs: { hp: 31, atk: 25, def: 20, spa: 15, spd: 20, spe: 31 } // Sum = 122, contains 31 IV
    });

    const itemListing1 = makeMockListing('it_1', 'item', 'Poción', 150, 'user_c', { qty: 10 });
    const itemListing2 = makeMockListing('it_2', 'item', 'Gema Dominante', 50000, 'user_d', { qty: 1 });

    const allListings = [pokemonListing1, pokemonListing2, itemListing1, itemListing2];

    it('filters listings by mode correctly', () => {
      const pFilters = getDefaultFilters('pokemon');
      const filteredPokes = applyMarketFilters(allListings, pFilters, 'explore');
      assert.strictEqual(filteredPokes.length, 2);
      assert.ok(filteredPokes.every(i => i.listing_type === 'pokemon'));

      const iFilters = getDefaultFilters('item');
      const filteredItems = applyMarketFilters(allListings, iFilters, 'explore');
      assert.strictEqual(filteredItems.length, 2);
      assert.ok(filteredItems.every(i => i.listing_type === 'item'));
    });

    it('filters listings by price ranges', () => {
      const filters = getDefaultFilters('pokemon');
      filters.priceMin = 5000;
      filters.priceMax = 20000;

      const filtered = applyMarketFilters(allListings, filters, 'explore');
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0]?.id, 'pk_2'); // Gyarados cost is 9500
    });

    it('filters listings by name search query', () => {
      const filters = getDefaultFilters('pokemon');
      filters.search = 'pika';

      const filtered = applyMarketFilters(allListings, filters, 'explore');
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0]?.data.name, 'Pikachu');
    });

    it('filters Pokemon by level parameters', () => {
      const filters = getDefaultFilters('pokemon');
      filters.levelMin = 30;
      filters.levelMax = 50;

      const filtered = applyMarketFilters(allListings, filters, 'explore');
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0]?.id, 'pk_2'); // Gyarados level is 42
    });

    it('filters Pokemon containing at least one perfect 31 IV', () => {
      const filters = getDefaultFilters('pokemon');
      filters.ivAny31 = true;

      const filtered = applyMarketFilters(allListings, filters, 'explore');
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0]?.id, 'pk_2'); // Gyarados has 31 IV in hp and spe
    });

    it('filters Pokemon by overall IV total bounds', () => {
      const filters = getDefaultFilters('pokemon');
      filters.ivTotalMin = 100;
      filters.ivTotalMax = 150;

      const filtered = applyMarketFilters(allListings, filters, 'explore');
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0]?.id, 'pk_2'); // Gyarados total IV is 122
    });
  });
});
