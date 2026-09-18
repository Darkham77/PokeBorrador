import { queryLocal, persistSQLite } from '../sqliteEngine.ts';
import type { SQLiteDatabase } from '../sqliteEngine.ts';
import type { DBResponse } from '@/types/system/database';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { checkPokemonLegality } from '@/logic/pokemon/pokemonLegality.ts';
import { isPokemonBusy } from '@/logic/constants/tags.ts';

interface OfflineSaveData {
  box?: Pokemon[];
  team?: Pokemon[];
  inventory?: Record<string, number>;
  money?: number;
  [key: string]: unknown;
}

function validateTradeOfferPokemon(poke: Pokemon | null): DBResponse | null {
  if (!poke) return null;
  if (isPokemonBusy(poke)) {
    return { data: null, error: { message: 'No puedes ofrecer un Pokémon que está en misión, evento o guardería.' } };
  }
  const legality = checkPokemonLegality(poke);
  if (poke.isIllegal || !legality.isLegal) {
    return { data: null, error: { message: `No puedes ofrecer un Pokémon ilegal en el intercambio: ${legality.issues[0] || 'datos no válidos'}.` } };
  }
  return null;
}

function deductOfferedPokemon(senderSave: OfflineSaveData, poke: Pokemon | null): DBResponse | null {
  if (!poke) return null;
  const uid = poke.uid as string;
  const teamLenBefore = senderSave.team?.length || 0;
  senderSave.team = (senderSave.team || []).filter((p) => p.uid !== uid);
  if (senderSave.team.length === teamLenBefore) {
    const boxLenBefore = senderSave.box?.length || 0;
    senderSave.box = (senderSave.box || []).filter((p) => p.uid !== uid);
    if (senderSave.box.length === boxLenBefore) {
      return { data: null, error: { message: 'Pokémon no encontrado en tu inventario.' } };
    }
  }
  return null;
}

function deductOfferedItems(senderSave: OfflineSaveData, items: Record<string, number> | null): DBResponse | null {
  if (!items) return null;
  senderSave.inventory = senderSave.inventory || {};
  for (const [itemName, qty] of Object.entries(items)) {
    const currentQty = senderSave.inventory[itemName] || 0;
    if (currentQty < qty) {
      return { data: null, error: { message: `Cantidad insuficiente de ${itemName}.` } };
    }
    senderSave.inventory[itemName] = currentQty - qty;
    if (senderSave.inventory[itemName]! <= 0) {
      delete senderSave.inventory[itemName];
    }
  }
  return null;
}

function deductOfferedMoney(senderSave: OfflineSaveData, money: number): DBResponse | null {
  if (money <= 0) return null;
  const currentMoney = senderSave.money || 0;
  if (currentMoney < money) {
    return { data: null, error: { message: 'Dinero insuficiente.' } };
  }
  senderSave.money = currentMoney - money;
  return null;
}

export async function emulateSendTradeOffer(
  sqliteDb: SQLiteDatabase,
  params: Record<string, unknown>,
  context: { userId: string }
): Promise<DBResponse> {
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
    p_offer_pokemon: Pokemon | null;
    p_offer_items: Record<string, number> | null;
    p_offer_money: number;
    p_request_pokemon: Pokemon | null;
    p_request_items: Record<string, number> | null;
    p_request_money: number;
    p_message: string;
  };
  const { userId } = context;

  const pokeValError = validateTradeOfferPokemon(p_offer_pokemon);
  if (pokeValError) return pokeValError;

  const senderSaves = await queryLocal("SELECT save_data FROM game_saves WHERE user_id = ?", [userId]);
  if (senderSaves.length === 0) return { data: null, error: { message: 'Save not found' } };
  const senderSave = (typeof senderSaves[0]!.save_data === 'string' ? JSON.parse(senderSaves[0]!.save_data as string) : senderSaves[0]!.save_data) as OfflineSaveData;

  const pokeDeductError = deductOfferedPokemon(senderSave, p_offer_pokemon);
  if (pokeDeductError) return pokeDeductError;

  const itemsDeductError = deductOfferedItems(senderSave, p_offer_items);
  if (itemsDeductError) return itemsDeductError;

  const moneyDeductError = deductOfferedMoney(senderSave, p_offer_money);
  if (moneyDeductError) return moneyDeductError;

  const newTradeSaveId = crypto.randomUUID();
  sqliteDb.run(
    "UPDATE game_saves SET save_data = ?, last_save_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE user_id = ?",
    [JSON.stringify(senderSave), newTradeSaveId, userId]
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

interface EmulatedTradeOffer extends Record<string, unknown> {
  id: number
  sender_id: string
  receiver_id: string
  offer_pokemon: string | null
  offer_items: string | null
  offer_money: number
  request_pokemon: string | null
  request_items: string | null
  request_money: number
  status: string
}

function validateTradeLegality(
  trade: EmulatedTradeOffer,
  userId: string,
  offerPokeObj: Pokemon | null,
  requestPokeObj: Pokemon | null
): DBResponse | null {
  if (trade.status !== 'pending') {
    return { data: null, error: { message: 'Oferta no válida o ya procesada.' } }
  }
  if (trade.receiver_id !== userId) {
    return { data: null, error: { message: 'No autorizado.' } }
  }
  if (offerPokeObj && (offerPokeObj.isIllegal || !checkPokemonLegality(offerPokeObj).isLegal)) {
    return { data: null, error: { message: 'La oferta contiene un Pokémon ilegal y no puede ser aceptada.' } }
  }
  if (requestPokeObj && isPokemonBusy(requestPokeObj)) {
    return { data: null, error: { message: 'El Pokémon solicitado está ocupado en una misión o evento.' } }
  }
  if (requestPokeObj && (requestPokeObj.isIllegal || !checkPokemonLegality(requestPokeObj).isLegal)) {
    return { data: null, error: { message: 'El Pokémon solicitado es ilegal y no puede ser transferido.' } }
  }
  return null
}

function removePokemonFromReceiverSave(receiverSave: OfflineSaveData, uid: string): boolean {
  const teamLenBefore = receiverSave.team?.length || 0
  receiverSave.team = (receiverSave.team || []).filter(p => p.uid !== uid)
  if (receiverSave.team.length < teamLenBefore) return true

  const boxLenBefore = receiverSave.box?.length || 0
  receiverSave.box = (receiverSave.box || []).filter(p => p.uid !== uid)
  return receiverSave.box.length < boxLenBefore
}

function deductItemsFromReceiverSave(receiverSave: OfflineSaveData, requestItemsObj: Record<string, number>): string | null {
  receiverSave.inventory = receiverSave.inventory || {}
  for (const [itemName, qty] of Object.entries(requestItemsObj)) {
    const currentQty = receiverSave.inventory[itemName] || 0
    if (currentQty < qty) {
      return `Cantidad insuficiente de ${itemName}.`
    }
    receiverSave.inventory[itemName] = currentQty - qty
    if (receiverSave.inventory[itemName]! <= 0) {
      delete receiverSave.inventory[itemName]
    }
  }
  return null
}

function deductReceiverTradeCost(
  receiverSave: OfflineSaveData,
  requestPokeObj: Pokemon | null,
  requestMoney: number,
  requestItemsObj: Record<string, number> | null
): string | null {
  if (requestPokeObj && !removePokemonFromReceiverSave(receiverSave, requestPokeObj.uid as string)) {
    return 'Pokémon solicitado no encontrado en tu inventario.'
  }

  if (requestMoney > 0) {
    const currentMoney = receiverSave.money || 0
    if (currentMoney < requestMoney) {
      return 'Dinero insuficiente para aceptar el intercambio.'
    }
    receiverSave.money = currentMoney - requestMoney
  }

  if (requestItemsObj) {
    const itemError = deductItemsFromReceiverSave(receiverSave, requestItemsObj)
    if (itemError) return itemError
  }

  return null
}

function enqueueTradeClaims(
  sqliteDb: SQLiteDatabase,
  tradeId: string | number,
  recipientUserId: string, // uuid-ok: User account UUID identifier
  pokeObj: Pokemon | null,
  money: number,
  itemsObj: Record<string, number> | null
): void {
  if (pokeObj) {
    const claimId = 'claim_' + Math.random().toString(36).substring(2, 11)
    sqliteDb.run(
      "INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, 'trade', ?, ?)",
      [claimId, recipientUserId, String(tradeId), JSON.stringify({ type: 'pokemon', data: pokeObj })]
    )
  }
  if (money > 0) {
    const claimId = 'claim_' + Math.random().toString(36).substring(2, 11)
    sqliteDb.run(
      "INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, 'trade', ?, ?)",
      [claimId, recipientUserId, String(tradeId), JSON.stringify({ type: 'money', data: money })]
    )
  }
  if (itemsObj) {
    for (const [itemName, qty] of Object.entries(itemsObj)) {
      if (qty > 0) {
        const claimId = 'claim_' + Math.random().toString(36).substring(2, 11)
        sqliteDb.run(
          "INSERT INTO claim_queue (id, user_id, source_type, source_id, asset_data) VALUES (?, ?, 'trade', ?, ?)",
          [claimId, recipientUserId, String(tradeId), JSON.stringify({ type: 'item', data: { name: itemName, qty } })]
        )
      }
    }
  }
}

export async function emulateAcceptTrade(
  sqliteDb: SQLiteDatabase,
  params: Record<string, unknown>,
  context: { userId: string }
): Promise<DBResponse> {
  const { p_trade_id } = params as { p_trade_id: string | number }
  const { userId } = context

  const trades = await queryLocal("SELECT * FROM trade_offers WHERE id = ?", [p_trade_id])
  if (trades.length === 0) return { data: null, error: { message: 'Oferta no válida o ya procesada.' } }
  const trade = trades[0] as EmulatedTradeOffer

  const offerPokeObj = trade.offer_pokemon ? (JSON.parse(trade.offer_pokemon) as Pokemon) : null
  const offerItemsObj = trade.offer_items ? (JSON.parse(trade.offer_items) as Record<string, number>) : null // open-record: Generic key-value data dictionary container
  const requestPokeObj = trade.request_pokemon ? (JSON.parse(trade.request_pokemon) as Pokemon) : null
  const requestItemsObj = trade.request_items ? (JSON.parse(trade.request_items) as Record<string, number>) : null // open-record: Generic key-value data dictionary container

  const validationError = validateTradeLegality(trade, userId, offerPokeObj, requestPokeObj)
  if (validationError) return validationError

  const receiverSaves = await queryLocal("SELECT save_data FROM game_saves WHERE user_id = ?", [userId])
  if (receiverSaves.length === 0) return { data: null, error: { message: 'Save not found' } }
  const receiverSave = (typeof receiverSaves[0]!.save_data === 'string' ? JSON.parse(receiverSaves[0]!.save_data as string) : receiverSaves[0]!.save_data) as OfflineSaveData

  const deductionError = deductReceiverTradeCost(receiverSave, requestPokeObj, trade.request_money, requestItemsObj)
  if (deductionError) return { data: null, error: { message: deductionError } }

  const newAcceptSaveId = crypto.randomUUID()
  sqliteDb.run(
    "UPDATE game_saves SET save_data = ?, last_save_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE user_id = ?",
    [JSON.stringify(receiverSave), newAcceptSaveId, userId]
  )

  enqueueTradeClaims(sqliteDb, p_trade_id, userId, offerPokeObj, trade.offer_money, offerItemsObj)
  enqueueTradeClaims(sqliteDb, p_trade_id, trade.sender_id, requestPokeObj, trade.request_money, requestItemsObj)

  sqliteDb.run(
    "UPDATE trade_offers SET status = 'accepted', created_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
    [p_trade_id]
  )

  await persistSQLite()
  return { data: true, error: null }
}

export async function emulateRejectTrade(
  sqliteDb: SQLiteDatabase,
  params: Record<string, unknown>,
  context: { userId: string }
): Promise<DBResponse> {
  const { p_trade_id } = params as { p_trade_id: string | number };
  const { userId } = context;

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
  const offerPokeObj = trade.offer_pokemon ? (JSON.parse(trade.offer_pokemon) as Pokemon) : null;
  const offerItemsObj = trade.offer_items ? (JSON.parse(trade.offer_items) as Record<string, number>) : null; // open-record: Generic key-value data dictionary container

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
    for (const [itemName, qty] of Object.entries(offerItemsObj as Record<string, number>)) { // open-record: Generic key-value data dictionary container
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
