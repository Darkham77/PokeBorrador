import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleMode, BattleUiConfig } from '@/types/battle/battleConfig';
import { BaseBattleSession } from './baseBattleSession.ts';
import { PvEBattleSession } from './pveBattleSession.ts';
import { GymBattleSession } from './gymBattleSession.ts';
import { PvPBattleSession } from './pvpBattleSession.ts';
import { SpectatorBattleSession } from './spectatorBattleSession.ts';
import { ReplayBattleSession } from './replayBattleSession.ts';
import { requireGymId, type GymId } from '@/data/world/gyms';
import type { ItemId } from '@/data/inventory/items';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ITacticalReplayEngine } from '../replay/tacticalReplayEngine.ts';

export interface BattleSessionCreationOptions {
  gymId?: GymId;
  rewardTM?: ItemId;
  trainerQuote?: string;
  isHost?: boolean;
  ranked?: boolean;
  opponentId?: string;
  opponentName?: string;
  matchId?: string;
  channel?: RealtimeChannel | null;
  engine?: ITacticalReplayEngine;
  uiOverrides?: Partial<BattleUiConfig>;
}

export function createBattleSession(
  mode: BattleMode,
  context: BattleContext,
  options: BattleSessionCreationOptions = {}
): BaseBattleSession {
  switch (mode) {
    case 'gym': {
      if (!options.gymId) {
        throw new Error('[BattleSessionFactory] gymId is required for gym battle session');
      }
      return new GymBattleSession(context, {
        gymId: requireGymId(options.gymId),
        rewardTM: options.rewardTM,
        trainerQuote: options.trainerQuote
      });
    }
    case 'pvp_casual':
    case 'pvp_ranked':
      return new PvPBattleSession(mode, context, {
        isHost: Boolean(options.isHost),
        ranked: mode === 'pvp_ranked' || Boolean(options.ranked),
        opponentId: options.opponentId,
        opponentName: options.opponentName,
        matchId: options.matchId
      });
    case 'pvp_spectator':
      return new SpectatorBattleSession(context, {
        matchId: options.matchId || 'spectator-session',
        channel: options.channel
      });
    case 'replay':
      return new ReplayBattleSession(context, {
        engine: options.engine as ITacticalReplayEngine
      });
    case 'wild':
    case 'trainer':
    case 'faction_war':
    default:
      return new PvEBattleSession(mode, context, options.uiOverrides);
  }
}
