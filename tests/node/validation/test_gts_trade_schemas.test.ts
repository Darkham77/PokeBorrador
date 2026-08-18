import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { validateGtsListing, validateTradeOffer } from '../../../src/logic/validation/schemas.ts';

describe('GTS & Trade Schemas Strict Validation', () => {
  const validPokemonData = {
    uid: 'poke-gts-1',
    id: 'charizard',
    species: 'charizard',
    name: 'Charizard',
    level: 50,
    exp: 50000,
    expNeeded: 60000,
    hp: 150,
    maxHp: 150,
    atk: 100,
    def: 90,
    spa: 120,
    spd: 100,
    spe: 110,
    type: 'fire',
    type2: 'flying',
    isShiny: false,
    ability: 'blaze',
    nature: 'timid',
    gender: 'm',
    friendship: 100,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 },
    moves: []
  };

  it('validates a correct GTS Pokémon listing', () => {
    const listing = {
      id: 'gts-1',
      seller_id: 'user_1',
      seller_name: 'Red',
      price: 5000,
      status: 'active',
      listing_type: 'pokemon',
      data: validPokemonData,
      created_at: '2026-08-18T00:00:00.000Z'
    };

    const res = validateGtsListing(listing);
    assert.strictEqual(res.success, true);
  });

  it('validates a correct GTS Item listing', () => {
    const listing = {
      id: 'gts-2',
      seller_id: 'user_2',
      seller_name: 'Blue',
      price: 1500,
      status: 'active',
      listing_type: 'item',
      data: { id: 'masterball', name: 'Master Ball', qty: 2 },
      created_at: '2026-08-18T00:00:00.000Z'
    };

    const res = validateGtsListing(listing);
    assert.strictEqual(res.success, true);
  });

  it('rejects GTS listing with invalid price (<= 0)', () => {
    const invalidListing = {
      id: 'gts-3',
      seller_id: 'user_3',
      price: 0,
      status: 'active',
      listing_type: 'item',
      data: { id: 'pokeball', qty: 1 },
      created_at: '2026-08-18T00:00:00.000Z'
    };

    const res = validateGtsListing(invalidListing);
    assert.strictEqual(res.success, false);
  });

  it('validates a compliant TradeOffer structure', () => {
    const offer = {
      id: 'trade-1',
      sender_id: 'user_1',
      receiver_id: 'user_2',
      offer_pokemon: validPokemonData,
      offer_items: { pokeball: 10 },
      offer_money: 1000,
      request_pokemon: null,
      request_items: { rare_candy: 1 },
      request_money: 0,
      message: 'Trade please!',
      status: 'pending',
      created_at: '2026-08-18T00:00:00.000Z'
    };

    const res = validateTradeOffer(offer);
    assert.strictEqual(res.success, true);
  });

  it('rejects TradeOffer with negative money or invalid item quantity', () => {
    const invalidOffer = {
      id: 'trade-2',
      sender_id: 'user_1',
      receiver_id: 'user_2',
      offer_pokemon: null,
      offer_items: { pokeball: 0 }, // min 1
      offer_money: -500, // min 0
      request_pokemon: null,
      request_items: {},
      request_money: 0,
      message: 'Bad trade',
      status: 'pending',
      created_at: '2026-08-18T00:00:00.000Z'
    };

    const res = validateTradeOffer(invalidOffer);
    assert.strictEqual(res.success, false);
  });
});
