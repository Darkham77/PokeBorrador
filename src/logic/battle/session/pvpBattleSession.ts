import type { BattleMode } from '@/types/battle/battleConfig';
import type { BattleContext } from '@/types/battle/battleContext';

import { BaseBattleSession } from './baseBattleSession.ts';

export interface PvPSessionOptions {
  isHost: boolean;
  ranked: boolean;
  opponentId?: string;
  opponentName?: string;
  matchId?: string;
  channel?: unknown;
}

export class PvPBattleSession extends BaseBattleSession {
  public readonly isHost: boolean;
  public readonly ranked: boolean;
  public readonly opponentId?: string;
  public readonly opponentName?: string;
  public readonly matchId?: string;
  private pendingGuestChoice: string | null = null;

  public constructor(mode: BattleMode, context: BattleContext, options: PvPSessionOptions) {
    super(mode, context, {
      showTurnTimer: true,
      allowBag: false,
      allowCatch: false,
      allowForfeit: true,
      showTeamPreview: true
    });
    this.isHost = options.isHost;
    this.ranked = options.ranked;
    this.opponentId = options.opponentId;
    this.opponentName = options.opponentName;
    this.matchId = options.matchId;
  }

  public setOpponentChoice(choice: string): void {
    this.pendingGuestChoice = choice;
  }

  public override async resolveOpponentChoice(_playerChoice: string): Promise<string> {
    if (this.pendingGuestChoice) {
      const choice = this.pendingGuestChoice;
      this.pendingGuestChoice = null;
      return choice;
    }
    return 'pass';
  }

  public async processRewards(_won: boolean): Promise<void> {
    // PvP rewards: ELO update handled via livePvP / pvpStore
  }
}
