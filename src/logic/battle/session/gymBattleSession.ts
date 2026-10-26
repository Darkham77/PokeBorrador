import type { ItemId } from '@/data/inventory/items';
import type { GymId } from '@/data/world/gyms';
import type { BattleContext } from '@/types/battle/battleContext';

import { PvEBattleSession } from './pveBattleSession.ts';

export interface GymSessionOptions {
  gymId: GymId;
  rewardTM?: ItemId;
  trainerQuote?: string;
}

export class GymBattleSession extends PvEBattleSession {
  public readonly gymId: GymId;
  public readonly rewardTM?: ItemId;
  public readonly trainerQuote?: string;

  public constructor(context: BattleContext, options: GymSessionOptions) {
    super('gym', context, { showLeaderDialogue: true });
    this.gymId = options.gymId;
    this.rewardTM = options.rewardTM;
    this.trainerQuote = options.trainerQuote;
  }

  public override async processRewards(won: boolean): Promise<void> {
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
