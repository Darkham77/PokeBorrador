/**
 * tests/node/trading/trade_and_market_friendship_simulation.test.ts
 *
 * Tier 1 & Tier 2 Simulation Suite for Friendship Mechanics in P2P Trading and GTS/Market.
 * Tests canonical behavior:
 * 1. P2P Trade transfer resets Pokemon friendship from 255 to base (70).
 * 2. GTS/Market purchase & claim resets Pokemon friendship to base (70).
 * 3. Seller canceling their own listing retains their original friendship value (255).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { SQLiteDatabase } from '@/logic/db/sqliteEngine.ts';
import { emulateSendTradeOffer, emulateAcceptTrade } from '@/logic/db/rpcEmulations/tradeRpc.ts';
import { emulatePublishListing, emulateBuyListing, emulateCancelListing, emulateClaimAsset } from '@/logic/db/rpcEmulations/marketRpc.ts';
import { queryLocal } from '@/logic/db/sqliteEngine.ts';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider.ts';
import { type PokemonSpeciesId } from '@/data/pokemon/pokedex.ts';

vi.mock('@/logic/db/sqliteEngine.ts', () => ({
  queryLocal: vi.fn(),
  persistSQLite: vi.fn(async () => {}),
}));

function createLegalPokemon(id: PokemonSpeciesId, name: string, level = 10, uid = 'legal-uid-1', friendship = 70): Pokemon {
  const abilities = pokemonDataProvider.getSpeciesAbilities(id);
  const ability = abilities[0] || 'waterabsorb';
  return {
    uid,
    id,
    name,
    species: name,
    level,
    maxHp: 50,
    hp: 50,
    atk: 20,
    def: 20,
    spa: 20,
    spd: 20,
    spe: 20,
    moves: [{ id: 'surf', name: 'Surf', type: 'water', cat: 'special', power: 90, acc: 100, pp: 15, maxPP: 15 }],
    ability,
    isIllegal: false,
    friendship,
  } as unknown as Pokemon;
}

describe('Trade and GTS / Market Friendship Simulations', () => {
  let mockSqliteDb: SQLiteDatabase;
  let inMemoryDb: {
    game_saves: Record<string, { user_id: string; save_data: string }>;
    trade_offers: Record<string | number, any>;
    market_listings: Record<string | number, any>;
    claim_queue: Record<string, any>;
  };
  let currentListingId = '';

  beforeEach(() => {
    vi.clearAllMocks();

    inMemoryDb = {
      game_saves: {},
      trade_offers: {},
      market_listings: {},
      claim_queue: {},
    };

    mockSqliteDb = {
      run: vi.fn((sql: string, params: any[] = []) => {
        if (sql.startsWith('UPDATE game_saves')) {
          const [saveDataJson, userId] = params;
          if (inMemoryDb.game_saves[userId]) {
            inMemoryDb.game_saves[userId].save_data = saveDataJson;
          }
        } else if (sql.startsWith('INSERT INTO trade_offers')) {
          const [id, sender_id, receiver_id, offer_pokemon, offer_items, offer_money, request_pokemon, request_items, request_money, message] = params;
          inMemoryDb.trade_offers[id] = {
            id,
            sender_id,
            receiver_id,
            offer_pokemon,
            offer_items,
            offer_money,
            request_pokemon,
            request_items,
            request_money,
            message,
            status: 'pending',
          };
        } else if (sql.startsWith('UPDATE trade_offers SET status =')) {
          const [tradeId] = params;
          if (inMemoryDb.trade_offers[tradeId]) {
            inMemoryDb.trade_offers[tradeId].status = 'accepted';
          }
        } else if (sql.startsWith('INSERT INTO market_listings')) {
          const [seller_id, seller_name, listing_type, data, price] = params;
          const listingId = currentListingId || 'list_default_1';
          inMemoryDb.market_listings[listingId] = {
            id: listingId,
            seller_id,
            seller_name,
            listing_type,
            data,
            price,
            status: 'active',
          };
        } else if (sql.startsWith("UPDATE market_listings SET status = 'sold'")) {
          const [buyerId, listingId] = params;
          if (inMemoryDb.market_listings[listingId]) {
            inMemoryDb.market_listings[listingId].status = 'sold';
            inMemoryDb.market_listings[listingId].buyer_id = buyerId;
          }
        } else if (sql.startsWith("UPDATE market_listings SET status = 'cancelled'")) {
          const [listingId] = params;
          if (inMemoryDb.market_listings[listingId]) {
            inMemoryDb.market_listings[listingId].status = 'cancelled';
          }
        } else if (sql.startsWith('INSERT INTO claim_queue')) {
          const [id, user_id, source_id, asset_data] = params;
          inMemoryDb.claim_queue[id] = {
            id,
            user_id,
            source_id,
            asset_data,
          };
        } else if (sql.startsWith('DELETE FROM claim_queue')) {
          const [claimId] = params;
          delete inMemoryDb.claim_queue[claimId];
        }
      }),
    } as unknown as SQLiteDatabase;

    vi.mocked(queryLocal).mockImplementation(async (sql: string, params: any[] = []) => {
      if (sql.includes('FROM game_saves WHERE user_id =')) {
        const userId = params[0];
        const record = inMemoryDb.game_saves[userId];
        return record ? [record] : [];
      }
      if (sql.includes('FROM trade_offers WHERE id =')) {
        const tradeId = params[0];
        const record = inMemoryDb.trade_offers[tradeId];
        return record ? [record] : [];
      }
      if (sql.includes('FROM market_listings WHERE seller_id =')) {
        const sellerId = params[0];
        return Object.values(inMemoryDb.market_listings).filter((l) => l.seller_id === sellerId && l.status === 'active');
      }
      if (sql.includes('FROM market_listings WHERE id =')) {
        const listingId = params[0];
        const record = inMemoryDb.market_listings[listingId];
        return record ? [record] : [];
      }
      if (sql.includes('FROM claim_queue WHERE id =')) {
        const claimId = params[0];
        const record = inMemoryDb.claim_queue[claimId];
        return record ? [record] : [];
      }
      return [];
    });
  });

  it('P2P Trade: resets traded Pokemon friendship from 255 to base (70) upon claim by receiver', async () => {
    const senderUserId = 'trainer-alice';
    const receiverUserId = 'trainer-bob';

    const maxFriendshipLapras = createLegalPokemon('lapras', 'Lapras', 50, 'alice-lapras-uid', 255);
    const bobPikachu = createLegalPokemon('lapras', 'Lapras', 30, 'bob-lapras-uid', 180);

    inMemoryDb.game_saves[senderUserId] = {
      user_id: senderUserId,
      save_data: JSON.stringify({
        team: [maxFriendshipLapras],
        box: [],
        money: 5000,
        inventory: {},
      }),
    };

    inMemoryDb.game_saves[receiverUserId] = {
      user_id: receiverUserId,
      save_data: JSON.stringify({
        team: [bobPikachu],
        box: [],
        money: 5000,
        inventory: {},
      }),
    };

    // 1. Alice sends trade offer to Bob
    const offerRes = await emulateSendTradeOffer(
      mockSqliteDb,
      {
        p_receiver_id: receiverUserId,
        p_offer_pokemon: maxFriendshipLapras,
        p_offer_items: null,
        p_offer_money: 0,
        p_request_pokemon: bobPikachu,
        p_request_items: null,
        p_request_money: 0,
        p_message: 'Let us trade!',
      },
      { userId: senderUserId }
    );

    expect(offerRes.error).toBeNull();
    const tradeId = offerRes.data as string;

    // 2. Bob accepts trade
    const acceptRes = await emulateAcceptTrade(
      mockSqliteDb,
      { p_trade_id: tradeId },
      { userId: receiverUserId }
    );
    expect(acceptRes.error).toBeNull();

    const bobClaim = Object.values(inMemoryDb.claim_queue).find((c) => c.user_id === receiverUserId);
    expect(bobClaim).toBeDefined();

    // 3. Bob claims Lapras
    const claimRes = await emulateClaimAsset(
      mockSqliteDb,
      { p_claim_id: bobClaim.id },
      { userId: receiverUserId }
    );
    expect(claimRes.error).toBeNull();

    const bobSave = claimRes.data as any;
    const allBobPokemon = [...(bobSave?.team || []), ...(bobSave?.box || [])];
    const receivedLapras = allBobPokemon.find((p: Pokemon) => p.uid === 'alice-lapras-uid');
    expect(receivedLapras).toBeDefined();
    expect(receivedLapras.friendship).toBe(70);
  });

  it('GTS / Market: resets Pokemon friendship from 255 to base (70) when bought and claimed by buyer', async () => {
    const sellerUserId = 'trainer-alice';
    const buyerUserId = 'trainer-bob';

    const maxFriendshipLapras = createLegalPokemon('lapras', 'Lapras', 50, 'alice-lapras-gts-uid', 255);

    inMemoryDb.game_saves[sellerUserId] = {
      user_id: sellerUserId,
      save_data: JSON.stringify({
        team: [maxFriendshipLapras],
        box: [],
        money: 1000,
        inventory: {},
      }),
    };

    inMemoryDb.game_saves[buyerUserId] = {
      user_id: buyerUserId,
      save_data: JSON.stringify({
        team: [],
        box: [],
        money: 50000,
        inventory: {},
      }),
    };

    // 1. Alice publishes Lapras on GTS
    const publishRes = await emulatePublishListing(
      mockSqliteDb,
      {
        p_listing_type: 'pokemon',
        p_asset_data: maxFriendshipLapras,
        p_price: 10000,
      },
      { userId: sellerUserId, username: 'Alice' }
    );
    expect(publishRes.error).toBeNull();
    const listingId = publishRes.data as string;
    // Index under returned id
    const activeList = Object.values(inMemoryDb.market_listings)[0];
    inMemoryDb.market_listings[listingId] = { ...activeList, id: listingId };

    // 2. Bob buys the listing
    const buyRes = await emulateBuyListing(
      mockSqliteDb,
      { p_listing_id: listingId },
      { userId: buyerUserId }
    );
    expect(buyRes.error).toBeNull();

    // Find Bob's claim
    const bobClaim = Object.values(inMemoryDb.claim_queue).find((c) => c.user_id === buyerUserId);
    expect(bobClaim).toBeDefined();

    // 3. Bob claims Lapras
    const claimRes = await emulateClaimAsset(
      mockSqliteDb,
      { p_claim_id: bobClaim.id },
      { userId: buyerUserId }
    );
    expect(claimRes.error).toBeNull();

    const bobSave = claimRes.data as any;
    const allBobPokemon = [...(bobSave.team || []), ...(bobSave.box || [])];
    const boughtPokemon = allBobPokemon.find((p: Pokemon) => p.uid === 'alice-lapras-gts-uid');
    expect(boughtPokemon).toBeDefined();
    expect(boughtPokemon.friendship).toBe(70);
  });

  it('GTS / Market Cancel: seller retains their original 255 friendship when canceling their own listing', async () => {
    const sellerUserId = 'trainer-alice';

    const maxFriendshipLapras = createLegalPokemon('lapras', 'Lapras', 50, 'alice-lapras-cancel-uid', 255);

    inMemoryDb.game_saves[sellerUserId] = {
      user_id: sellerUserId,
      save_data: JSON.stringify({
        team: [maxFriendshipLapras],
        box: [],
        money: 1000,
        inventory: {},
      }),
    };

    // 1. Alice publishes listing
    const publishRes = await emulatePublishListing(
      mockSqliteDb,
      {
        p_listing_type: 'pokemon',
        p_asset_data: maxFriendshipLapras,
        p_price: 10000,
      },
      { userId: sellerUserId, username: 'Alice' }
    );
    const listingId = publishRes.data as string;
    const activeList = Object.values(inMemoryDb.market_listings)[0];
    inMemoryDb.market_listings[listingId] = { ...activeList, id: listingId };

    // 2. Alice cancels her own listing before anyone buys it
    const cancelRes = await emulateCancelListing(
      mockSqliteDb,
      { p_listing_id: listingId },
      { userId: sellerUserId }
    );
    expect(cancelRes.error).toBeNull();

    // 3. Verify Lapras returned to Alice with friendship intact (255)
    const aliceSave = cancelRes.data as any;
    const returnedPoke = (aliceSave.box || []).find((p: Pokemon) => p.uid === 'alice-lapras-cancel-uid');
    expect(returnedPoke).toBeDefined();
    expect(returnedPoke.friendship).toBe(255);
  });
});
