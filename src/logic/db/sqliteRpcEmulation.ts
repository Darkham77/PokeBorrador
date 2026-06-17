import { initSQLite } from './sqliteEngine.ts';
import { logger } from '../utils/logger.ts';
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

/**
 * Emulates Supabase RPC calls on local SQLite database in offline mode.
 */
export async function emulateOfflineRpc(name: string, params: Record<string, unknown> = {}): Promise<DBResponse> {
  logger.debug('DBRouter', `Local RPC: ${name}`, params);
  const sqliteDb = await initSQLite();

  if (!sqliteDb) {
    return { data: null, error: 'Database not initialized' };
  }

  // Determine current offline session context
  const localUserStr = typeof localStorage !== 'undefined' ? localStorage.getItem('pokevicio_local_user') : null;
  const localUser = localUserStr ? JSON.parse(localUserStr) : null;
  const userId = (localUser as { id?: string } | null)?.id || 'local_user';
  const username = (localUser as { user_metadata?: { username?: string } } | null)?.user_metadata?.username || 'Invitado';
  
  const context = { userId, username };

  switch (name) {
    case 'change_username':
      return emulateChangeUsername(sqliteDb, params, context);

    case 'save_game_trusted':
      return emulateSaveGameTrusted(sqliteDb, params, context);

    case 'fn_report_passive_battle':
      return emulateReportPassiveBattle(sqliteDb, params);

    case 'publish_listing_v2':
      return emulatePublishListing(sqliteDb, params, context);

    case 'buy_listing_v2':
      return emulateBuyListing(sqliteDb, params, context);

    case 'cancel_listing_v2':
      return emulateCancelListing(sqliteDb, params, context);

    case 'claim_asset_v2':
      return emulateClaimAsset(sqliteDb, params, context);

    case 'send_trade_offer_v2':
      return emulateSendTradeOffer(sqliteDb, params, context);

    case 'accept_trade_v2':
      return emulateAcceptTrade(sqliteDb, params, context);

    case 'reject_trade_v2':
      return emulateRejectTrade(sqliteDb, params, context);

    default:
      // Default mock success for other RPCs in offline mode
      return { data: { success: true }, error: null };
  }
}
