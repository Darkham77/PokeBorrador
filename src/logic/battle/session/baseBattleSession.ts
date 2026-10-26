import type { BattleMode, BattleUiConfig } from '@/types/battle/battleConfig';
import { createBattleUiConfig } from '@/types/battle/battleConfig';
import type { BattleContext } from '@/types/battle/battleContext';

export abstract class BaseBattleSession {
  public readonly context: BattleContext;
  public readonly mode: BattleMode;
  public readonly uiConfig: BattleUiConfig;

  public constructor(
    mode: BattleMode,
    context: BattleContext,
    uiOverrides?: Partial<BattleUiConfig>
  ) {
    this.mode = mode;
    this.context = context;
    this.uiConfig = createBattleUiConfig(mode, uiOverrides);
  }

  public async resolveOpponentChoice(_playerChoice: string): Promise<string> {
    return 'pass';
  }
  public abstract processRewards(won: boolean): Promise<void>;

  public async onBattleEnd(won: boolean, _reason?: string): Promise<void> {
    await this.processRewards(won);
    if (this.context.endBattle) {
      await this.context.endBattle(won, false);
    }
  }
}
