import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleMode, BattleUiConfig } from '@/types/battle/battleConfig';
import { createBattleUiConfig } from '@/types/battle/battleConfig';

export abstract class BaseBattleSession {
  readonly context: BattleContext;
  readonly mode: BattleMode;
  readonly uiConfig: BattleUiConfig;

  constructor(mode: BattleMode, context: BattleContext, uiOverrides?: Partial<BattleUiConfig>) {
    this.mode = mode;
    this.context = context;
    this.uiConfig = createBattleUiConfig(mode, uiOverrides);
  }

  abstract resolveOpponentChoice(playerChoice: string): Promise<string>;
  abstract processRewards(won: boolean): Promise<void>;

  async onBattleEnd(won: boolean, _reason?: string): Promise<void> {
    await this.processRewards(won);
    if (this.context.endBattle) {
      await this.context.endBattle(won, false);
    }
  }
}
