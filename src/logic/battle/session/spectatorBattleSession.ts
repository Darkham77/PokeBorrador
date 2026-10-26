import type { RealtimeChannel } from '@supabase/supabase-js';

import type { BattleContext } from '@/types/battle/battleContext';
import type { PvpTurnStreamPayload } from '@/types/battle/pvp';

import { parseLogsWithSkip } from '../battleTurnLogHelper.ts';
import { filterShowdownLogs } from '../showdownBridge.ts';
import { syncTeamsFromLastWorkerState } from '../showdownWorkerClient.ts';
import { BaseBattleSession } from './baseBattleSession.ts';

export interface SpectatorSessionOptions {
  matchId: string;
  channel?: RealtimeChannel | null;
  initialViewerCount?: number;
}

export class SpectatorBattleSession extends BaseBattleSession {
  public readonly matchId: string;
  public readonly channel?: RealtimeChannel | null;
  public viewerCount: number;

  public constructor(context: BattleContext, options: SpectatorSessionOptions) {
    super('pvp_spectator', context, {
      showTurnTimer: true,
      allowBag: false,
      allowCatch: false,
      allowForfeit: false,
      showActionButtons: false,
      showSpectatorBadge: true,
      showReplayControls: false
    });
    this.matchId = options.matchId;
    this.channel = options.channel;
    this.viewerCount = options.initialViewerCount ?? 1;
  }

  public async onStreamTurn(payload: PvpTurnStreamPayload): Promise<void> {
    const store = this.context;
    const filteredLogs = filterShowdownLogs(payload.streamLines || []);
    await parseLogsWithSkip(store, filteredLogs, false, false);
    await syncTeamsFromLastWorkerState();

    if (payload.over) {
      const won = payload.winnerSide === 'p1';
      await this.onBattleEnd(won, 'Combate finalizado');
    }
  }

  public async processRewards(_won: boolean): Promise<void> {
    // Spectators do not receive battle rewards or ELO updates
  }
}
