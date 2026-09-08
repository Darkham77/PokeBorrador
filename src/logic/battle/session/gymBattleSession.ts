import { PvEBattleSession } from './pveBattleSession.ts';
import type { BattleContext } from '@/types/battle/battleContext';
import type { GymId } from '@/data/world/gyms';
import type { ItemId } from '@/data/inventory/items';

export interface GymSessionOptions {
  gymId: GymId;
  rewardTM?: ItemId;
  trainerQuote?: string;
}

export class GymBattleSession extends PvEBattleSession {
  readonly gymId: GymId;
  readonly rewardTM?: ItemId;
  readonly trainerQuote?: string;

  constructor(context: BattleContext, options: GymSessionOptions) {
    super('gym', context, { showLeaderDialogue: true });
    this.gymId = options.gymId;
    this.rewardTM = options.rewardTM;
    this.trainerQuote = options.trainerQuote;
  }

  override async processRewards(won: boolean): Promise<void> {
    await super.processRewards(won);
    if (won) {
      const gameStore = this.context.gs;
      if (gameStore?.state && this.gymId) {
        if (!gameStore.state.defeatedGyms) {
          gameStore.state.defeatedGyms = [];
        }
        if (!gameStore.state.defeatedGyms.includes(this.gymId)) {
          gameStore.state.defeatedGyms.push(this.gymId);
        }
      }
    }
  }
}
