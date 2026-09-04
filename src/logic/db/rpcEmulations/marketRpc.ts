import { queryLocal, persistSQLite } from '../sqliteEngine.ts';
import type { SQLiteDatabase } from '../sqliteEngine.ts';
import type { DBResponse } from '@/types/system/database';
import type { MarketListingType, MarketAssetType } from '@/logic/economy/market';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { checkPokemonLegality } from '@/logic/pokemon/pokemonLegality.ts';
import { isPokemonBusy } from '@/logic/constants/tags.ts';

interface OfflineSaveData {
  box?: Record<string, unknown>[];
  team?: Record<string, unknown>[];
  inventory?: Record<string, number>;
  money?: number;
  [key: string]: unknown;
}

interface ClaimAssetPayload {
  type: MarketAssetType;
  data: Record<string, unknown> | number | string;
}

export async function emulatePublishListing(
  sqliteDb: SQLiteDatabase,
  params: Record<string, unknown>,
  context: { userId: string; username: string }
): Promise<DBResponse> {
  const { p_listing_type, p_asset_data, p_price } = params as { p_listing_type: MarketListingType, p_asset_data: Pokemon | { name: string; qty: number }, p_price: number };
  const { userId, username } = context;

  if (p_listing_type === 'pokemon') {
    const poke = p_asset_data as Pokemon;
    if (isPokemonBusy(poke)) {
      return { data: null, error: { message: 'No puedes publicar un Pokémon que está en misión, evento o guardería.' } };
    }
    const legality = checkPokemonLegality(poke);
    if (poke.isIllegal || !legality.isLegal) {
      return { data: null, error: { message: `No se puede publicar un Pokémon ilegal en el mercado: ${legality.issues[0] || 'datos no válidos'}.` } };
    }
  }

const MAX_MARKET_LISTINGS_PER_USER = 10;
const BASE_36_RADIX = 36;
const RANDOM_STRING_SUBSTRING_START = 2;
const RANDOM_STRING_SUBSTRING_END = 11;

  const activeListings = await queryLocal(
    "SELECT id FROM market_listings WHERE seller_id = ? AND status = 'active'",
    [userId]
  );
  if (activeListings.length >= MAX_MARKET_LISTINGS_PER_USER) {
    return { data: null, error: { message: `Límite de publicaciones alcanzado (${MAX_MARKET_LISTINGS_PER_USER})` } };
  }

  const saves = await queryLocal("SELECT save_data FROM game_saves WHERE user_id = ?", [userId]);
  if (saves.length === 0) return { data: null, error: { message: 'Save not found' } };
  const saveObj = (typeof saves[0]!.save_data === 'string' ? JSON.parse(saves[0]!.save_data as string) : saves[0]!.save_data) as OfflineSaveData;

  if (p_listing_type === 'pokemon') {
    const poke = p_asset_data as Pokemon;
    const uid = poke.uid;
    const boxLenBefore = saveObj.box?.length || 0;
    saveObj.box = (saveObj.box || []).filter((p) => p && p.uid !== uid);
    if (saveObj.box.length === boxLenBefore) {
      const teamLenBefore = saveObj.team?.length || 0;
      saveObj.team = (saveObj.team || []).filter((p) => p && p.uid !== uid);
      if (saveObj.team.length === teamLenBefore) {
        return { data: null, error: { message: 'Pokémon no encontrado en tu inventario.' } };
      }
    }
  } else {
    const itemData = p_asset_data as { name: string; qty?: number };
    const itemName = itemData.name;
    const qty = itemData.qty || 1;
    saveObj.inventory = saveObj.inventory || {};
    const currentQty = saveObj.inventory[itemName] || 0;
    if (currentQty < qty) {
      return { data: null, error: { message: 'Cantidad insuficiente de objetos.' } };
    }
    saveObj.inventory[itemName] = currentQty - qty;
    if (saveObj.inventory[itemName]! <= 0) {
      delete saveObj.inventory[itemName];
    }
  }

  const newSaveId = crypto.randomUUID();
  sqliteDb.run(
    "UPDATE game_saves SET save_data = ?, last_save_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE user_id = ?",
    [JSON.stringify(saveObj), newSaveId, userId]
  );

  sqliteDb.run(
    "INSERT INTO market_listings (seller_id, seller_name, listing_type, data, price, status) VALUES (?, ?, ?, ?, ?, 'active')",
    [userId, username, p_listing_type, JSON.stringify(p_asset_data), p_price]
  );

  await persistSQLite();
  return { data: 'list_' + Math.random().toString(BASE_36_RADIX).substring(RANDOM_STRING_SUBSTRING_START, RANDOM_STRING_SUBSTRING_END), error: null };
}

export async function emulateBuyListing(
  sqliteDb: SQLiteDatabase,
  params: Record<string, unknown>,
  context: { userId: string }
): Promise<DBResponse> {
  const { p_listing_id } = params;
  const { userId } = context;

  const listings = await queryLocal("SELECT * FROM market_listings WHERE id = ? AND status = 'active'", [p_listing_id]);
  if (listings.length === 0) return { data: null, error: { message: 'La publicación ya no está disponible o fue vendida.' } };
  const listing = listings[0] as { id: string | number; seller_id: string; listing_type: MarketListingType; price: number; data: string | Record<string, unknown> };
  if (listing.seller_id === userId) return { data: null, error: { message: 'No puedes comprar tu propia oferta.' } };

  const buyerSaves = await queryLocal("SELECT save_data FROM game_saves WHERE user_id = ?", [userId]);
  if (buyerSaves.length === 0) return { data: null, error: { message: 'Save not found' } };
  const buyerSave = (typeof buyerSaves[0]!.save_data === 'string' ? JSON.parse(buyerSaves[0]!.save_data as string) : buyerSaves[0]!.save_data) as OfflineSaveData;

  const price = Number(listing.price);
  if ((buyerSave.money || 0) < price) {
    return { data: null, error: { message: 'Fondos insuficientes.' } };
  }

  buyerSave.money = (buyerSave.money || 0) - price;
  const newBuyerSaveId = crypto.randomUUID();
  sqliteDb.run(
    "UPDATE game_saves SET save_data = ?, last_save_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE user_id = ?",
    [JSON.stringify(buyerSave), newBuyerSaveId, userId]
  );

  let assetDataObj = listing.data;
  if (typeof assetDataObj === 'string') {
    try {
      assetDataObj = JSON.parse(assetDataObj) as Record<string, unknown>; // open-record: Generic key-value data dictionary container
    } catch (_e) {
      void 0;
    }
  }

  const claimIdBuyer = 'claim_' + Math.random().toString(36).substring(2, 11);
  const buyerAssetPayload = {
    type: listing.listing_type === 'pokemon' ? 'pokemon' : 'item',
    data: assetDataObj
  };
  sqliteDb.run(
    "INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, 'gts', ?, ?)",
    [claimIdBuyer, userId, p_listing_id, JSON.stringify(buyerAssetPayload)]
  );

  const claimIdSeller = 'claim_' + Math.random().toString(36).substring(2, 11);
  const finalPayment = Math.floor(price * 0.95);
  const sellerAssetPayload = {
    type: 'money',
    data: finalPayment
  };
  sqliteDb.run(
    "INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, 'gts', ?, ?)",
    [claimIdSeller, listing.seller_id, p_listing_id, JSON.stringify(sellerAssetPayload)]
  );

  sqliteDb.run(
    "UPDATE market_listings SET status = 'sold', buyer_id = ?, created_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
    [userId, p_listing_id]
  );

  await persistSQLite();
  return { data: buyerSave, error: null };
}

export async function emulateCancelListing(
  sqliteDb: SQLiteDatabase,
  params: Record<string, unknown>, // open-record: Generic key-value data dictionary container
  context: { userId: string }
): Promise<DBResponse> {
  const { p_listing_id } = params;
  const { userId } = context;

  const listings = await queryLocal("SELECT * FROM market_listings WHERE id = ? AND status = 'active'", [p_listing_id]);
  if (listings.length === 0) return { data: null, error: { message: 'Publicación no encontrada o procesada.' } };
  const listing = listings[0] as { id: string | number; seller_id: string; listing_type: MarketListingType; data: string | Record<string, unknown> };
  if (listing.seller_id !== userId) return { data: null, error: { message: 'No autorizado.' } };

  let assetDataObj = listing.data;
  if (typeof assetDataObj === 'string') {
    try {
      assetDataObj = JSON.parse(assetDataObj) as Record<string, unknown>; // open-record: Generic key-value data dictionary container
    } catch (_e) {
      void 0;
    }
  }

  const saves = await queryLocal("SELECT save_data FROM game_saves WHERE user_id = ?", [userId]);
  if (saves.length === 0) return { data: null, error: { message: 'Save not found' } };
  const saveObj = (typeof saves[0]!.save_data === 'string' ? JSON.parse(saves[0]!.save_data as string) : saves[0]!.save_data) as OfflineSaveData;

  if (listing.listing_type === 'pokemon') {
    saveObj.box = saveObj.box || [];
    saveObj.box.push(assetDataObj as Record<string, unknown>); // open-record: Generic key-value data dictionary container
  } else {
    saveObj.inventory = saveObj.inventory || {};
    const itemName = (assetDataObj as { name: string }).name;
    const qty = Number((assetDataObj as { qty?: number }).qty || 1);
    saveObj.inventory[itemName] = (saveObj.inventory[itemName] || 0) + qty;
  }

  const newCancelSaveId = crypto.randomUUID();
  sqliteDb.run(
    "UPDATE game_saves SET save_data = ?, last_save_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE user_id = ?",
    [JSON.stringify(saveObj), newCancelSaveId, userId]
  );

  sqliteDb.run(
    "UPDATE market_listings SET status = 'cancelled', created_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
    [p_listing_id]
  );

  await persistSQLite();
  return { data: saveObj, error: null };
}

export async function emulateClaimAsset(
  sqliteDb: SQLiteDatabase,
  params: Record<string, unknown>, // open-record: Generic key-value data dictionary container
  context: { userId: string }
): Promise<DBResponse> {
  const { p_claim_id } = params;
  const { userId } = context;

  const claims = await queryLocal("SELECT * FROM claim_queue WHERE id = ?", [p_claim_id]);
  if (claims.length === 0) return { data: null, error: { message: 'Reclamo no encontrado.' } };
  const claim = claims[0] as { user_id: string; asset_data: string | ClaimAssetPayload };
  if (claim.user_id !== userId) return { data: null, error: { message: 'No autorizado.' } };

  const userSaves = await queryLocal("SELECT save_data FROM game_saves WHERE user_id = ?", [userId]);
  if (userSaves.length === 0) return { data: null, error: { message: 'Save not found' } };
  const userSave = (typeof userSaves[0]!.save_data === 'string' ? JSON.parse(userSaves[0]!.save_data as string) : userSaves[0]!.save_data) as OfflineSaveData;

  let assetPayload: ClaimAssetPayload | null = null;
  if (typeof claim.asset_data === 'string') {
    try {
      assetPayload = JSON.parse(claim.asset_data) as ClaimAssetPayload;
    } catch {
      assetPayload = null;
    }
  } else {
    assetPayload = claim.asset_data;
  }

  if (assetPayload && assetPayload.type === 'pokemon') {
    let rawPoke: Record<string, unknown> | null = null; // open-record: Generic key-value data dictionary container
    if (typeof assetPayload.data === 'string') {
      try {
        rawPoke = JSON.parse(assetPayload.data) as Record<string, unknown>; // open-record: Generic key-value data dictionary container
      } catch {
        rawPoke = null;
      }
    } else if (typeof assetPayload.data === 'object' && assetPayload.data !== null) {
      rawPoke = assetPayload.data as Record<string, unknown>; // open-record: Generic key-value data dictionary container
    }
    // Reset friendship to canonical base value (70) upon transferring to a new trainer
    const poke: Record<string, unknown> = { // open-record: Generic key-value data dictionary container
      ...(rawPoke || {}),
      friendship: 70,
    };
    userSave.team = userSave.team || [];
    if (userSave.team.length < 6) {
      userSave.team.push(poke);
    } else {
      userSave.box = userSave.box || [];
      userSave.box.push(poke);
    }
  } else if (assetPayload && assetPayload.type === 'money') {
    userSave.money = (userSave.money || 0) + Number(assetPayload.data);
  } else if (assetPayload && assetPayload.type === 'item') {
    userSave.inventory = userSave.inventory || {};
    const itemData = assetPayload.data as { name: string; qty?: number };
    const itemName = itemData.name;
    const qty = Number(itemData.qty || 1);
    userSave.inventory[itemName] = (userSave.inventory[itemName] || 0) + qty;
  }

  const newClaimSaveId = crypto.randomUUID();
  sqliteDb.run(
    "UPDATE game_saves SET save_data = ?, last_save_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE user_id = ?",
    [JSON.stringify(userSave), newClaimSaveId, userId]
  );

  sqliteDb.run("DELETE FROM claim_queue WHERE id = ?", [p_claim_id]);

  await persistSQLite();
  return { data: userSave, error: null };
}
