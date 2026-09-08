import { BaseBattleSession } from './baseBattleSession.ts';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleMode } from '@/types/battle/battleConfig';

export interface PvPSessionOptions {
  isHost: boolean;
  ranked: boolean;
  opponentId?: string;
  opponentName?: string;
  matchId?: string;
  channel?: unknown;
}

export class PvPBattleSession extends BaseBattleSession {
  readonly isHost: boolean;
  readonly ranked: boolean;
  readonly opponentId?: string;
  readonly opponentName?: string;
  readonly matchId?: string;
  private pendingGuestChoice: string | null = null;

  constructor(mode: BattleMode, context: BattleContext, options: PvPSessionOptions) {
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

  setOpponentChoice(choice: string): void {
    this.pendingGuestChoice = choice;
  }

  async resolveOpponentChoice(_playerChoice: string): Promise<string> {
    if (this.pendingGuestChoice) {
      const choice = this.pendingGuestChoice;
      this.pendingGuestChoice = null;
      return choice;
    }
    return 'pass';
  }

  async processRewards(_won: boolean): Promise<void> {
    // PvP rewards: ELO update handled via livePvP / pvpStore
  }
}
