import { queryLocal, persistSQLite } from '../sqliteEngine.ts';
import type { SQLiteDatabase } from '../sqliteEngine.ts';
import type { DBResponse } from '@/types/system/database';

interface OfflineSaveData {
  box?: Record<string, unknown>[];
  team?: Record<string, unknown>[];
  inventory?: Record<string, number>;
  money?: number;
  [key: string]: unknown;
}

interface ClaimAssetPayload {
  type: 'pokemon' | 'money' | 'item';
  data: Record<string, unknown> | number | string;
}

export async function emulatePublishListing(
  sqliteDb: SQLiteDatabase,
  params: Record<string, unknown>,
  context: { userId: string; username: string }
): Promise<DBResponse> {
  const { p_listing_type, p_asset_data, p_price } = params as { p_listing_type: 'pokemon' | 'item', p_asset_data: Record<string, unknown>, p_price: number };
  const { userId, username } = context;

  const activeListings = await queryLocal(
    "SELECT id FROM market_listings WHERE seller_id = ? AND status = 'active'",
    [userId]
  );
  if (activeListings.length >= 10) {
    return { data: null, error: { message: `Límite de publicaciones alcanzado (10)` } };
  }

  const saves = await queryLocal("SELECT save_data FROM game_saves WHERE user_id = ?", [userId]);
  if (saves.length === 0) return { data: null, error: { message: 'Save not found' } };
  const saveObj = (typeof saves[0]!.save_data === 'string' ? JSON.parse(saves[0]!.save_data as string) : saves[0]!.save_data) as OfflineSaveData;

  if (p_listing_type === 'pokemon') {
    const uid = p_asset_data.uid as string;
    const boxLenBefore = saveObj.box?.length || 0;
    saveObj.box = (saveObj.box || []).filter((p) => p.uid !== uid);
    if (saveObj.box.length === boxLenBefore) {
      const teamLenBefore = saveObj.team?.length || 0;
      saveObj.team = (saveObj.team || []).filter((p) => p.uid !== uid);
      if (saveObj.team.length === teamLenBefore) {
        return { data: null, error: { message: 'Pokémon no encontrado en tu inventario.' } };
      }
    }
  } else {
    const itemName = p_asset_data.name as string;
    const qty = (p_asset_data.qty as number) || 1;
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

  sqliteDb.run(
    "UPDATE game_saves SET save_data = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE user_id = ?",
    [JSON.stringify(saveObj), userId]
  );

  sqliteDb.run(
    "INSERT INTO market_listings (seller_id, seller_name, listing_type, data, price, status) VALUES (?, ?, ?, ?, ?, 'active')",
    [userId, username, p_listing_type, JSON.stringify(p_asset_data), p_price]
  );

  await persistSQLite();
  return { data: 'list_' + Math.random().toString(36).substring(2, 11), error: null };
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
  const listing = listings[0] as { id: string | number; seller_id: string; listing_type: 'pokemon' | 'item'; price: number; data: string | Record<string, unknown> };
  if (listing.seller_id === userId) return { data: null, error: { message: 'No puedes comprar tu propia oferta.' } };

  const buyerSaves = await queryLocal("SELECT save_data FROM game_saves WHERE user_id = ?", [userId]);
  if (buyerSaves.length === 0) return { data: null, error: { message: 'Save not found' } };
  const buyerSave = (typeof buyerSaves[0]!.save_data === 'string' ? JSON.parse(buyerSaves[0]!.save_data as string) : buyerSaves[0]!.save_data) as OfflineSaveData;

  const price = Number(listing.price);
  if ((buyerSave.money || 0) < price) {
    return { data: null, error: { message: 'Fondos insuficientes.' } };
  }

  buyerSave.money = (buyerSave.money || 0) - price;
  sqliteDb.run(
    "UPDATE game_saves SET save_data = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE user_id = ?",
    [JSON.stringify(buyerSave), userId]
  );

  let assetDataObj = listing.data;
  if (typeof assetDataObj === 'string') {
    try {
      assetDataObj = JSON.parse(assetDataObj) as Record<string, unknown>; // open-record
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
  params: Record<string, unknown>, // open-record
  context: { userId: string }
): Promise<DBResponse> {
  const { p_listing_id } = params;
  const { userId } = context;

  const listings = await queryLocal("SELECT * FROM market_listings WHERE id = ? AND status = 'active'", [p_listing_id]);
  if (listings.length === 0) return { data: null, error: { message: 'Publicación no encontrada o procesada.' } };
  const listing = listings[0] as { id: string | number; seller_id: string; listing_type: 'pokemon' | 'item'; data: string | Record<string, unknown> };
  if (listing.seller_id !== userId) return { data: null, error: { message: 'No autorizado.' } };

  let assetDataObj = listing.data;
  if (typeof assetDataObj === 'string') {
    try {
      assetDataObj = JSON.parse(assetDataObj) as Record<string, unknown>; // open-record
    } catch (_e) {
      void 0;
    }
  }

  const saves = await queryLocal("SELECT save_data FROM game_saves WHERE user_id = ?", [userId]);
  if (saves.length === 0) return { data: null, error: { message: 'Save not found' } };
  const saveObj = (typeof saves[0]!.save_data === 'string' ? JSON.parse(saves[0]!.save_data as string) : saves[0]!.save_data) as OfflineSaveData;

  if (listing.listing_type === 'pokemon') {
    saveObj.box = saveObj.box || [];
    saveObj.box.push(assetDataObj as Record<string, unknown>); // open-record
  } else {
    saveObj.inventory = saveObj.inventory || {};
    const itemName = (assetDataObj as { name: string }).name;
    const qty = Number((assetDataObj as { qty?: number }).qty || 1);
    saveObj.inventory[itemName] = (saveObj.inventory[itemName] || 0) + qty;
  }

  sqliteDb.run(
    "UPDATE game_saves SET save_data = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE user_id = ?",
    [JSON.stringify(saveObj), userId]
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
  params: Record<string, unknown>, // open-record
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

  let assetPayload: ClaimAssetPayload;
  if (typeof claim.asset_data === 'string') {
    assetPayload = JSON.parse(claim.asset_data) as ClaimAssetPayload;
  } else {
    assetPayload = claim.asset_data as ClaimAssetPayload;
  }

  if (assetPayload.type === 'pokemon') {
    userSave.team = userSave.team || [];
    if (userSave.team.length < 6) {
      userSave.team.push(assetPayload.data as Record<string, unknown>); // open-record
    } else {
      userSave.box = userSave.box || [];
      userSave.box.push(assetPayload.data as Record<string, unknown>); // open-record
    }
  } else if (assetPayload.type === 'money') {
    userSave.money = (userSave.money || 0) + Number(assetPayload.data);
  } else if (assetPayload.type === 'item') {
    userSave.inventory = userSave.inventory || {};
    const itemData = assetPayload.data as { name: string; qty?: number };
    const itemName = itemData.name;
    const qty = Number(itemData.qty || 1);
    userSave.inventory[itemName] = (userSave.inventory[itemName] || 0) + qty;
  }

  sqliteDb.run(
    "UPDATE game_saves SET save_data = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE user_id = ?",
    [JSON.stringify(userSave), userId]
  );

  sqliteDb.run("DELETE FROM claim_queue WHERE id = ?", [p_claim_id]);

  await persistSQLite();
  return { data: userSave, error: null };
}
