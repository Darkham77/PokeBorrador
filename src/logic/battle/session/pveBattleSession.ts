import { BaseBattleSession } from './baseBattleSession.ts';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleMode, BattleUiConfig } from '@/types/battle/battleConfig';
import { decideEnemyMove, evaluateAndUseNPCItem } from '../ai/battleAI.ts';

export class PvEBattleSession extends BaseBattleSession {
  readonly isWild: boolean;

  constructor(mode: BattleMode, context: BattleContext, uiOverrides?: Partial<BattleUiConfig>) {
    super(mode, context, uiOverrides);
    this.isWild = mode === 'wild';
  }

  async resolveOpponentChoice(_playerChoice: string): Promise<string> {
    const store = this.context;
    const p = store.activeBattle.value?.player;
    const e = store.activeBattle.value?.enemy;
    if (!e || !p) return '';

    let p2Skip = false;
    if (!this.isWild && (await evaluateAndUseNPCItem(store, e))) {
      p2Skip = true;
      if (store.activeBattle.value) {
        store.activeBattle.value.enemyUsedItem = true;
      }
    }

    if (p2Skip) return 'pass';

    const eMove = decideEnemyMove(e, p, store.enemyStages?.value, this.isWild, store);
    if (e.volatileCounters?.['lockedmove'] && e.volatileCounters['lockedmove'] > 0 && e.lastMove) {
      return `move ${e.lastMove.id}`;
    }

    return eMove ? `move ${eMove.id}` : 'pass';
  }

  async processRewards(won: boolean): Promise<void> {
    if (won && this.context.processBattleEndRewards) {
      await this.context.processBattleEndRewards();
    }
  }
}
