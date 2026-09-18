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

const MAX_MARKET_LISTINGS_PER_USER = 10;
const BASE_36_RADIX = 36;
const RANDOM_STRING_SUBSTRING_START = 2;
const RANDOM_STRING_SUBSTRING_END = 11;

function validatePublishListing(
  listingType: MarketListingType,
  assetData: Pokemon | { name: string; qty: number }
): string | null {
  if (listingType !== 'pokemon') return null;
  const poke = assetData as Pokemon;
  if (isPokemonBusy(poke)) {
    return 'No puedes publicar un Pokémon que está en misión, evento o guardería.';
  }
  const legality = checkPokemonLegality(poke);
  if (poke.isIllegal || !legality.isLegal) {
    return `No se puede publicar un Pokémon ilegal en el mercado: ${legality.issues[0] || 'datos no válidos'}.`;
  }
  return null;
}

function removePokemonFromSave(saveObj: OfflineSaveData, uid: string): boolean {
  const boxLenBefore = saveObj.box?.length || 0;
  saveObj.box = (saveObj.box || []).filter((p) => p && p.uid !== uid);
  if (saveObj.box.length < boxLenBefore) return true;

  const teamLenBefore = saveObj.team?.length || 0;
  saveObj.team = (saveObj.team || []).filter((p) => p && p.uid !== uid);
  return saveObj.team.length < teamLenBefore;
}

function removeItemFromSave(saveObj: OfflineSaveData, itemName: string, qty: number): boolean {
  saveObj.inventory = saveObj.inventory || {};
  const currentQty = saveObj.inventory[itemName] || 0;
  if (currentQty < qty) return false;

  saveObj.inventory[itemName] = currentQty - qty;
  if (saveObj.inventory[itemName]! <= 0) {
    delete saveObj.inventory[itemName];
  }
  return true;
}

function removePublishedAssetFromSave(
  saveObj: OfflineSaveData,
  listingType: MarketListingType,
  assetData: Pokemon | { name: string; qty: number }
): string | null {
  if (listingType === 'pokemon') {
    const poke = assetData as Pokemon;
    if (!removePokemonFromSave(saveObj, poke.uid)) {
      return 'Pokémon no encontrado en tu inventario.';
    }
  } else {
    const itemData = assetData as { name: string; qty?: number };
    const itemName = itemData.name;
    const qty = itemData.qty || 1;
    if (!removeItemFromSave(saveObj, itemName, qty)) {
      return 'Cantidad insuficiente de objetos.';
    }
  }
  return null;
}

export async function emulatePublishListing(
  sqliteDb: SQLiteDatabase,
  params: Record<string, unknown>,
  context: { userId: string; username: string }
): Promise<DBResponse> {
  const { p_listing_type, p_asset_data, p_price } = params as { p_listing_type: MarketListingType, p_asset_data: Pokemon | { name: string; qty: number }, p_price: number };
  const { userId, username } = context;

  const validationError = validatePublishListing(p_listing_type, p_asset_data);
  if (validationError) {
    return { data: null, error: { message: validationError } };
  }

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

  const removeError = removePublishedAssetFromSave(saveObj, p_listing_type, p_asset_data);
  if (removeError) {
    return { data: null, error: { message: removeError } };
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
  const sellerAssetPayload: Record<string, unknown> = { // open-record: Generic key-value data dictionary container
    type: 'money',
    data: finalPayment
  };
  if (listing.listing_type === 'item') {
    const itemData = assetDataObj as { name?: string; qty?: number };
    sellerAssetPayload.sold_item = { name: itemData?.name, qty: itemData?.qty || 1 };
  } else if (listing.listing_type === 'pokemon') {
    const pokeData = assetDataObj as { name?: string; level?: number; isShiny?: boolean };
    sellerAssetPayload.sold_pokemon = {
      name: pokeData?.name,
      level: pokeData?.level,
      isShiny: Boolean(pokeData?.isShiny)
    };
  }
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

const CLAIM_BASE_FRIENDSHIP = 70;
const MAX_TEAM_SIZE_CLAIM = 6;

async function resolveClaimUserSave(
  userId: string, // uuid-ok: Supabase authentication user UUID identifier
  claimUserId: string // uuid-ok: Supabase authentication user UUID identifier
): Promise<{ userSave: OfflineSaveData; resolvedUserUid: string } | null> {
  let userSaves = await queryLocal("SELECT save_data, user_id FROM game_saves WHERE user_id = ?", [userId]);
  let resolvedUserUid = userId;
  if (userSaves.length === 0) {
    userSaves = await queryLocal("SELECT save_data, user_id FROM game_saves WHERE user_id = ?", [claimUserId]);
    if (userSaves.length > 0) {
      resolvedUserUid = claimUserId;
    } else {
      userSaves = await queryLocal("SELECT save_data, user_id FROM game_saves LIMIT 1");
      if (userSaves.length > 0) {
        resolvedUserUid = String(userSaves[0]!.user_id);
      }
    }
  }
  if (userSaves.length === 0) return null;

  const rawData = userSaves[0]!.save_data;
  const userSave = (typeof rawData === 'string' ? JSON.parse(rawData) : rawData) as OfflineSaveData;
  return { userSave, resolvedUserUid };
}

function parseClaimAssetPayload(rawAssetData: string | ClaimAssetPayload): ClaimAssetPayload | null {
  if (typeof rawAssetData !== 'string') {
    return rawAssetData;
  }
  try {
    return JSON.parse(rawAssetData) as ClaimAssetPayload;
  } catch {
    return null;
  }
}

function applyClaimPokemonToSave(userSave: OfflineSaveData, assetPayload: ClaimAssetPayload): void {
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
  const nowMs = Temporal.Now.instant().epochMilliseconds;
  const poke: Record<string, unknown> = { // open-record: Generic key-value data dictionary container
    ...(rawPoke || {}),
    friendship: CLAIM_BASE_FRIENDSHIP,
    obtainedAt: (rawPoke as { obtainedAt?: number })?.obtainedAt || nowMs,
    obtainedMethod: (rawPoke as { obtainedMethod?: string })?.obtainedMethod || 'reward',
  };
  userSave.team = userSave.team || [];
  if (userSave.team.length < MAX_TEAM_SIZE_CLAIM) {
    userSave.team.push(poke);
  } else {
    userSave.box = userSave.box || [];
    userSave.box.push(poke);
  }
}

function applyClaimAssetToSave(userSave: OfflineSaveData, assetPayload: ClaimAssetPayload | null): void {
  if (!assetPayload) return;
  if (assetPayload.type === 'pokemon') {
    applyClaimPokemonToSave(userSave, assetPayload);
  } else if (assetPayload.type === 'money') {
    userSave.money = (userSave.money || 0) + Number(assetPayload.data);
  } else if (assetPayload.type === 'item') {
    userSave.inventory = userSave.inventory || {};
    const itemData = assetPayload.data as { name: string; qty?: number };
    const itemName = itemData.name;
    const qty = Number(itemData.qty || 1);
    userSave.inventory[itemName] = (userSave.inventory[itemName] || 0) + qty;
  }
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

  const resolved = await resolveClaimUserSave(userId, claim.user_id);
  if (!resolved) return { data: null, error: { message: 'Save not found' } };
  const { userSave, resolvedUserUid } = resolved;

  if (claim.user_id !== userId && claim.user_id !== resolvedUserUid) {
    return { data: null, error: { message: 'No autorizado.' } };
  }

  const assetPayload = parseClaimAssetPayload(claim.asset_data);
  applyClaimAssetToSave(userSave, assetPayload);

  const newClaimSaveId = crypto.randomUUID();
  sqliteDb.run(
    "UPDATE game_saves SET save_data = ?, last_save_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE user_id = ?",
    [JSON.stringify(userSave), newClaimSaveId, resolvedUserUid]
  );

  sqliteDb.run("DELETE FROM claim_queue WHERE id = ?", [p_claim_id]);

  await persistSQLite();
  return { data: userSave, error: null };
}

