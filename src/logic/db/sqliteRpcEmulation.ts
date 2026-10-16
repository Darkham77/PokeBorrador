import { initSQLite, type SQLiteDatabase } from './sqliteEngine.ts';
import { logger } from '../utils/logger.ts';
import { safeStorage } from '../utils/storage.ts';
import type { DBResponse } from '@/types/system/database';

// Import sub-modules for offline RPC emulations
import { emulateChangeUsername } from './rpcEmulations/profileRpc.ts';
import { emulateSaveGameTrusted, emulateReportPassiveBattle } from './rpcEmulations/saveRpc.ts';
import {
  emulatePublishListing,
  emulateBuyListing,
  emulateCancelListing,
  emulateClaimAsset
} from './rpcEmulations/marketRpc.ts';
import {
  emulateSendTradeOffer,
  emulateAcceptTrade,
  emulateRejectTrade
} from './rpcEmulations/tradeRpc.ts';
import { emulateAwardEventAutomated, emulateClaimAward } from './rpcEmulations/eventRpc.ts';
import {
  emulateAwardRankedSeasonAutomated,
  emulateRecordPassiveBattleResult,
  emulatePublishBattleReplay,
  emulateGetFeaturedReplays
} from './rpcEmulations/rankedRpc.ts';

/**
 * Emulates Supabase RPC calls on local SQLite database in offline mode.
 */
export async function emulateOfflineRpc(
  name: string,
  params: Record<string, unknown> = {}
): Promise<DBResponse> {
  logger.debug('DBRouter', `Local RPC: ${name}`, params);
  const sqliteDb = await initSQLite();

  if (!sqliteDb) {
    return { data: null, error: 'Database not initialized' };
  }

  // Determine current offline session context
  const localUserStr = safeStorage.getItem('pokevicio_local_user');
  const localUser = localUserStr ? (JSON.parse(localUserStr) as Record<string, unknown>) : null; // open-record: Generic key-value data dictionary container
  const userId = (localUser as { id?: string } | null)?.id || 'local_user';
  const username =
    (localUser as { user_metadata?: { username?: string } } | null)?.user_metadata?.username ||
    'Invitado';

  const context = { userId, username };

  type RpcHandler = (
    db: SQLiteDatabase,
    params: Record<string, unknown>,
    ctx: { userId: string; username: string }
  ) => Promise<DBResponse>;

  const RPC_DISPATCH_TABLE: Readonly<Record<string, RpcHandler>> = {
    // open-record: Dynamic RPC procedure dispatch table
    change_username: (db, p, ctx) => emulateChangeUsername(db, p, ctx),
    save_game_trusted: (db, p, ctx) => emulateSaveGameTrusted(db, p, ctx),
    fn_report_passive_battle: (db, p) => emulateReportPassiveBattle(db, p),
    publish_listing_v2: (db, p, ctx) => emulatePublishListing(db, p, ctx),
    buy_listing_v2: (db, p, ctx) => emulateBuyListing(db, p, ctx),
    cancel_listing_v2: (db, p, ctx) => emulateCancelListing(db, p, ctx),
    claim_asset_v2: (db, p, ctx) => emulateClaimAsset(db, p, ctx),
    send_trade_offer_v2: (db, p, ctx) => emulateSendTradeOffer(db, p, ctx),
    accept_trade_v2: (db, p, ctx) => emulateAcceptTrade(db, p, ctx),
    reject_trade_v2: (db, p, ctx) => emulateRejectTrade(db, p, ctx),
    fn_award_event_automated: (db, p) => emulateAwardEventAutomated(db, p),
    claim_award: (db, p) => emulateClaimAward(db, p),
    fn_award_ranked_season_automated: (db, p) => emulateAwardRankedSeasonAutomated(db, p),
    record_passive_battle_result: (db, p, ctx) => emulateRecordPassiveBattleResult(db, p, ctx),
    fn_publish_battle_replay: (db, p, ctx) => emulatePublishBattleReplay(db, p, ctx),
    fn_get_featured_replays: (db, p) => emulateGetFeaturedReplays(db, p)
  };

  const handler = RPC_DISPATCH_TABLE[name];
  if (handler) {
    return await handler(sqliteDb, params, context);
  }

  // Default mock success for other RPCs in offline mode
  return { data: { success: true }, error: null };
}
