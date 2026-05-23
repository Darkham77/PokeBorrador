import { initSQLite, persistSQLite, queryLocal } from './sqliteEngine.ts';
import { logger } from '../utils/logger.ts';
import type { DBResponse } from '@/types/database';

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

/**
 * Emulates Supabase RPC calls on local SQLite database in offline mode.
 */
export async function emulateOfflineRpc(name: string, params: Record<string, unknown> = {}): Promise<DBResponse> {
  logger.debug('DBRouter', `Local RPC: ${name}`, params);
  const sqliteDb = await initSQLite();

  if (!sqliteDb) {
    return { data: null, error: 'Database not initialized' };
  }

  // Implement specific local logic for critical RPCs
  const localUserStr = typeof localStorage !== 'undefined' ? localStorage.getItem('pokevicio_local_user') : null;
  const localUser = localUserStr ? JSON.parse(localUserStr) : null;
  const userId = (localUser as { id?: string } | null)?.id || 'local_user';
  const username = (localUser as { user_metadata?: { username?: string } } | null)?.user_metadata?.username || 'Invitado';

  if (name === 'change_username') {
    const { new_username } = params as { new_username: string };

    // 1. Length validation (3 to 15 characters)
    if (!new_username || new_username.trim().length < 3 || new_username.trim().length > 15) {
      return { data: null, error: 'El nombre de entrenador debe tener entre 3 y 15 caracteres.' };
    }

    // 2. Query current profile data for validations
    const current = await queryLocal("SELECT username, last_renamed_at FROM profiles WHERE id = ?", [userId]);
    
    if (current.length > 0) {
      // 3. Identical name validation
      if (current[0]!.username === new_username.trim()) {
        return { data: null, error: 'El nuevo nombre es idéntico al actual.' };
      }

      // 4. Cooldown validation (30 days)
      if (current[0]!.last_renamed_at) {
        const lastRename = Temporal.Instant.from(current[0]!.last_renamed_at as string);
        const thirtyDaysAgo = Temporal.Now.instant().subtract({ hours: 24 * 30 });
        if (Temporal.Instant.compare(lastRename, thirtyDaysAgo) > 0) {
          return { data: null, error: 'Solo puedes cambiar tu nombre una vez cada 30 días. Debes esperar al menos 30 días.' };
        }
      }
    }
    
    await queryLocal("UPDATE profiles SET username = ?, last_renamed_at = ? WHERE id = ?", [new_username.trim(), Temporal.Now.instant().toString(), userId]);
    return { data: { success: true }, error: null };
  }

  if (name === 'save_game_trusted') {
    const { p_save_data, p_expected_id } = params as { p_save_data: Record<string, unknown>, p_expected_id: string | null };
    const newSaveId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11) + Temporal.Now.instant().epochMilliseconds.toString(36);
    
    // 1. Verificar concurrencia (optimistic lock)
    if (p_expected_id) {
      const current = await queryLocal("SELECT last_save_id FROM game_saves WHERE user_id = ?", [userId]);
      if (current.length > 0 && current[0]!.last_save_id !== p_expected_id) {
        return { data: { success: false, error: 'OUT_OF_SYNC', current_id: current[0]!.last_save_id }, error: null };
      }
    }

    // 2. Upsert del save
    sqliteDb.run(
      `INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at) 
       VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
       ON CONFLICT(user_id) DO UPDATE SET 
        save_data = excluded.save_data, 
        last_save_id = excluded.last_save_id, 
        updated_at = excluded.updated_at`,
      [userId, JSON.stringify(p_save_data), newSaveId]
    );

    await persistSQLite();
    return { data: { success: true, last_save_id: newSaveId }, error: null };
  }

  if (name === 'fn_report_passive_battle') {
    const { p_opponent_id, p_result, p_report_data } = params;
    sqliteDb.run(
      `INSERT INTO passive_battle_reports (user_id, opponent_id, result, report_data) VALUES (?, ?, ?, ?)`,
      ['local_user', p_opponent_id, p_result, JSON.stringify(p_report_data)]
    );
    await persistSQLite();
    return { data: { success: true }, error: null };
  }

  // 1. Publish Listing Emulation
  if (name === 'publish_listing_v2') {
    const { p_listing_type, p_asset_data, p_price } = params as { p_listing_type: 'pokemon' | 'item', p_asset_data: Record<string, unknown>, p_price: number };
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

  // 2. Buy Listing Emulation
  if (name === 'buy_listing_v2') {
    const { p_listing_id } = params;
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
        assetDataObj = JSON.parse(assetDataObj) as Record<string, unknown>;
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

  // 3. Cancel Listing Emulation
  if (name === 'cancel_listing_v2') {
    const { p_listing_id } = params;
    const listings = await queryLocal("SELECT * FROM market_listings WHERE id = ? AND status = 'active'", [p_listing_id]);
    if (listings.length === 0) return { data: null, error: { message: 'Publicación no encontrada o procesada.' } };
    const listing = listings[0] as { id: string | number; seller_id: string; listing_type: 'pokemon' | 'item'; data: string | Record<string, unknown> };
    if (listing.seller_id !== userId) return { data: null, error: { message: 'No autorizado.' } };

    let assetDataObj = listing.data;
    if (typeof assetDataObj === 'string') {
      try {
        assetDataObj = JSON.parse(assetDataObj) as Record<string, unknown>;
      } catch (_e) {
        void 0;
      }
    }

    const saves = await queryLocal("SELECT save_data FROM game_saves WHERE user_id = ?", [userId]);
    if (saves.length === 0) return { data: null, error: { message: 'Save not found' } };
    const saveObj = (typeof saves[0]!.save_data === 'string' ? JSON.parse(saves[0]!.save_data as string) : saves[0]!.save_data) as OfflineSaveData;

    if (listing.listing_type === 'pokemon') {
      saveObj.box = saveObj.box || [];
      saveObj.box.push(assetDataObj as Record<string, unknown>);
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

  // 4. Claim Asset Emulation
  if (name === 'claim_asset_v2') {
    const { p_claim_id } = params;
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
      userSave.team.push(assetPayload.data as Record<string, unknown>);
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

  // 5. Send Trade Offer Emulation
  if (name === 'send_trade_offer_v2') {
    const {
      p_receiver_id,
      p_offer_pokemon,
      p_offer_items,
      p_offer_money,
      p_request_pokemon,
      p_request_items,
      p_request_money,
      p_message
    } = params as {
      p_receiver_id: string;
      p_offer_pokemon: Record<string, unknown> | null;
      p_offer_items: Record<string, number> | null;
      p_offer_money: number;
      p_request_pokemon: Record<string, unknown> | null;
      p_request_items: Record<string, number> | null;
      p_request_money: number;
      p_message: string;
    };

    const senderSaves = await queryLocal("SELECT save_data FROM game_saves WHERE user_id = ?", [userId]);
    if (senderSaves.length === 0) return { data: null, error: { message: 'Save not found' } };
    const senderSave = (typeof senderSaves[0]!.save_data === 'string' ? JSON.parse(senderSaves[0]!.save_data as string) : senderSaves[0]!.save_data) as OfflineSaveData;

    // 1. Quitar Pokemon Ofrecido
    if (p_offer_pokemon) {
      const uid = p_offer_pokemon.uid as string;
      const teamLenBefore = senderSave.team?.length || 0;
      senderSave.team = (senderSave.team || []).filter((p) => p.uid !== uid);
      if (senderSave.team.length === teamLenBefore) {
        const boxLenBefore = senderSave.box?.length || 0;
        senderSave.box = (senderSave.box || []).filter((p) => p.uid !== uid);
        if (senderSave.box.length === boxLenBefore) {
          return { data: null, error: { message: 'Pokémon no encontrado en tu inventario.' } };
        }
      }
    }

    // 2. Quitar Items Ofrecidos
    if (p_offer_items) {
      senderSave.inventory = senderSave.inventory || {};
      for (const [itemName, qty] of Object.entries(p_offer_items)) {
        const currentQty = senderSave.inventory[itemName] || 0;
        if (currentQty < qty) {
          return { data: null, error: { message: `Cantidad insuficiente de ${itemName}.` } };
        }
        senderSave.inventory[itemName] = currentQty - qty;
        if (senderSave.inventory[itemName]! <= 0) {
          delete senderSave.inventory[itemName];
        }
      }
    }

    // 3. Quitar Dinero Ofrecido
    if (p_offer_money > 0) {
      const currentMoney = senderSave.money || 0;
      if (currentMoney < p_offer_money) {
        return { data: null, error: { message: 'Dinero insuficiente.' } };
      }
      senderSave.money = currentMoney - p_offer_money;
    }

    sqliteDb.run(
      "UPDATE game_saves SET save_data = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE user_id = ?",
      [JSON.stringify(senderSave), userId]
    );

    const generatedId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11) + Temporal.Now.instant().epochMilliseconds.toString(36);

    sqliteDb.run(
      "INSERT INTO trade_offers (id, sender_id, receiver_id, offer_pokemon, offer_items, offer_money, request_pokemon, request_items, request_money, message, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')",
      [
        generatedId,
        userId,
        p_receiver_id,
        p_offer_pokemon ? JSON.stringify(p_offer_pokemon) : null,
        p_offer_items ? JSON.stringify(p_offer_items) : null,
        p_offer_money,
        p_request_pokemon ? JSON.stringify(p_request_pokemon) : null,
        p_request_items ? JSON.stringify(p_request_items) : null,
        p_request_money,
        p_message || '',
      ]
    );

    await persistSQLite();
    return { data: generatedId, error: null };
  }

  // 6. Accept Trade Offer Emulation
  if (name === 'accept_trade_v2') {
    const { p_trade_id } = params as { p_trade_id: string | number };

    const trades = await queryLocal("SELECT * FROM trade_offers WHERE id = ?", [p_trade_id]);
    if (trades.length === 0) return { data: null, error: { message: 'Oferta no válida o ya procesada.' } };
    const trade = trades[0] as {
      id: number;
      sender_id: string;
      receiver_id: string;
      offer_pokemon: string | null;
      offer_items: string | null;
      offer_money: number;
      request_pokemon: string | null;
      request_items: string | null;
      request_money: number;
      status: string;
    };

    if (trade.status !== 'pending') {
      return { data: null, error: { message: 'Oferta no válida o ya procesada.' } };
    }
    if (trade.receiver_id !== userId) {
      return { data: null, error: { message: 'No autorizado.' } };
    }

    const receiverSaves = await queryLocal("SELECT save_data FROM game_saves WHERE user_id = ?", [userId]);
    if (receiverSaves.length === 0) return { data: null, error: { message: 'Save not found' } };
    const receiverSave = (typeof receiverSaves[0]!.save_data === 'string' ? JSON.parse(receiverSaves[0]!.save_data as string) : receiverSaves[0]!.save_data) as OfflineSaveData;

    // Parse columns since SQLite stores objects as strings/JSON strings
    const offerPokeObj = trade.offer_pokemon ? (typeof trade.offer_pokemon === 'string' ? JSON.parse(trade.offer_pokemon) : trade.offer_pokemon) : null;
    const offerItemsObj = trade.offer_items ? (typeof trade.offer_items === 'string' ? JSON.parse(trade.offer_items) : trade.offer_items) : null;
    const requestPokeObj = trade.request_pokemon ? (typeof trade.request_pokemon === 'string' ? JSON.parse(trade.request_pokemon) : trade.request_pokemon) : null;
    const requestItemsObj = trade.request_items ? (typeof trade.request_items === 'string' ? JSON.parse(trade.request_items) : trade.request_items) : null;

    // 1. Validar y Quitar lo que el receptor ofrece (request del trade)
    // 1a. Pokémon
    if (requestPokeObj) {
      const uid = requestPokeObj.uid as string;
      const teamLenBefore = receiverSave.team?.length || 0;
      receiverSave.team = (receiverSave.team || []).filter((p) => p.uid !== uid);
      if (receiverSave.team.length === teamLenBefore) {
        const boxLenBefore = receiverSave.box?.length || 0;
        receiverSave.box = (receiverSave.box || []).filter((p) => p.uid !== uid);
        if (receiverSave.box.length === boxLenBefore) {
          return { data: null, error: { message: 'Pokémon solicitado no encontrado en tu inventario.' } };
        }
      }
    }

    // 1b. Dinero
    if (trade.request_money > 0) {
      const currentMoney = receiverSave.money || 0;
      if (currentMoney < trade.request_money) {
        return { data: null, error: { message: 'Dinero insuficiente para aceptar el intercambio.' } };
      }
      receiverSave.money = currentMoney - trade.request_money;
    }

    // 1c. Items
    if (requestItemsObj) {
      receiverSave.inventory = receiverSave.inventory || {};
      for (const [itemName, qty] of Object.entries(requestItemsObj as Record<string, number>)) {
        const currentQty = receiverSave.inventory[itemName] || 0;
        if (currentQty < qty) {
          return { data: null, error: { message: `Cantidad insuficiente de ${itemName}.` } };
        }
        receiverSave.inventory[itemName] = currentQty - qty;
        if (receiverSave.inventory[itemName]! <= 0) {
          delete receiverSave.inventory[itemName];
        }
      }
    }

    // 2. Persistir cambio en save del receptor
    sqliteDb.run(
      "UPDATE game_saves SET save_data = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE user_id = ?",
      [JSON.stringify(receiverSave), userId]
    );

    // 3. Mover activos a la COLA DE RECLAMO
    // Lo que el emisor ofreció va al receptor (userId)
    if (offerPokeObj) {
      const claimId = 'claim_' + Math.random().toString(36).substring(2, 11);
      sqliteDb.run(
        "INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, 'trade', ?, ?)",
        [claimId, userId, String(p_trade_id), JSON.stringify({ type: 'pokemon', data: offerPokeObj })]
      );
    }
    if (trade.offer_money > 0) {
      const claimId = 'claim_' + Math.random().toString(36).substring(2, 11);
      sqliteDb.run(
        "INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, 'trade', ?, ?)",
        [claimId, userId, String(p_trade_id), JSON.stringify({ type: 'money', data: trade.offer_money })]
      );
    }
    if (offerItemsObj) {
      for (const [itemName, qty] of Object.entries(offerItemsObj as Record<string, number>)) {
        if (qty > 0) {
          const claimId = 'claim_' + Math.random().toString(36).substring(2, 11);
          sqliteDb.run(
            "INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, 'trade', ?, ?)",
            [claimId, userId, String(p_trade_id), JSON.stringify({ type: 'item', data: { name: itemName, qty } })]
          );
        }
      }
    }

    // Lo que el receptor ofreció va al emisor (trade.sender_id)
    if (requestPokeObj) {
      const claimId = 'claim_' + Math.random().toString(36).substring(2, 11);
      sqliteDb.run(
        "INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, 'trade', ?, ?)",
        [claimId, trade.sender_id, String(p_trade_id), JSON.stringify({ type: 'pokemon', data: requestPokeObj })]
      );
    }
    if (trade.request_money > 0) {
      const claimId = 'claim_' + Math.random().toString(36).substring(2, 11);
      sqliteDb.run(
        "INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, 'trade', ?, ?)",
        [claimId, trade.sender_id, String(p_trade_id), JSON.stringify({ type: 'money', data: trade.request_money })]
      );
    }
    if (requestItemsObj) {
      for (const [itemName, qty] of Object.entries(requestItemsObj as Record<string, number>)) {
        if (qty > 0) {
          const claimId = 'claim_' + Math.random().toString(36).substring(2, 11);
          sqliteDb.run(
            "INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, 'trade', ?, ?)",
            [claimId, trade.sender_id, String(p_trade_id), JSON.stringify({ type: 'item', data: { name: itemName, qty } })]
          );
        }
      }
    }

    // 4. Finalizar trade
    sqliteDb.run(
      "UPDATE trade_offers SET status = 'accepted', created_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
      [p_trade_id]
    );

    await persistSQLite();
    return { data: true, error: null };
  }

  // 7. Reject Trade Offer Emulation
  if (name === 'reject_trade_v2') {
    const { p_trade_id } = params as { p_trade_id: string | number };

    const trades = await queryLocal("SELECT * FROM trade_offers WHERE id = ?", [p_trade_id]);
    if (trades.length === 0) return { data: null, error: { message: 'Oferta no encontrada.' } };
    const trade = trades[0] as {
      id: number;
      sender_id: string;
      receiver_id: string;
      offer_pokemon: string | null;
      offer_items: string | null;
      offer_money: number;
      status: string;
    };

    if (trade.status !== 'pending') {
      return { data: null, error: { message: 'Solo se pueden rechazar u ocultar ofertas pendientes.' } };
    }
    if (trade.sender_id !== userId && trade.receiver_id !== userId) {
      return { data: null, error: { message: 'No autorizado.' } };
    }

    // Devolver activos al emisor (trade.sender_id) en su claim_queue
    const offerPokeObj = trade.offer_pokemon ? (typeof trade.offer_pokemon === 'string' ? JSON.parse(trade.offer_pokemon) : trade.offer_pokemon) : null;
    const offerItemsObj = trade.offer_items ? (typeof trade.offer_items === 'string' ? JSON.parse(trade.offer_items) : trade.offer_items) : null;

    if (offerPokeObj) {
      const claimId = 'claim_' + Math.random().toString(36).substring(2, 11);
      sqliteDb.run(
        "INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, 'trade_refund', ?, ?)",
        [claimId, trade.sender_id, String(p_trade_id), JSON.stringify({ type: 'pokemon', data: offerPokeObj })]
      );
    }
    if (trade.offer_money > 0) {
      const claimId = 'claim_' + Math.random().toString(36).substring(2, 11);
      sqliteDb.run(
        "INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, 'trade_refund', ?, ?)",
        [claimId, trade.sender_id, String(p_trade_id), JSON.stringify({ type: 'money', data: trade.offer_money })]
      );
    }
    if (offerItemsObj) {
      for (const [itemName, qty] of Object.entries(offerItemsObj as Record<string, number>)) {
        if (qty > 0) {
          const claimId = 'claim_' + Math.random().toString(36).substring(2, 11);
          sqliteDb.run(
            "INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, 'trade_refund', ?, ?)",
            [claimId, trade.sender_id, String(p_trade_id), JSON.stringify({ type: 'item', data: { name: itemName, qty } })]
          );
        }
      }
    }

    // Marcar como rechazado
    sqliteDb.run(
      "UPDATE trade_offers SET status = 'rejected', created_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
      [p_trade_id]
    );

    await persistSQLite();
    return { data: true, error: null };
  }

  // Default mock success for other RPCs in offline mode
  return { data: { success: true }, error: null };
}
