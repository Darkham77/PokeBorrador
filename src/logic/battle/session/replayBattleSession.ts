import { BaseBattleSession } from './baseBattleSession.ts';
import type { BattleContext } from '@/types/battle/battleContext';
import type { ITacticalReplayEngine } from '../replay/tacticalReplayEngine.ts';
import { filterShowdownLogs } from '../showdownBridge.ts';
import { parseLogsWithSkip } from '../helpers/turnActionResolver.ts';
import { syncTeamsFromLastWorkerState } from '../showdownWorkerClient.ts';

export interface ReplaySessionOptions {
  engine: ITacticalReplayEngine;
}

export class ReplayBattleSession extends BaseBattleSession {
  readonly engine: ITacticalReplayEngine;

  constructor(context: BattleContext, options: ReplaySessionOptions) {
    super('replay', context, {
      showTurnTimer: false,
      allowBag: false,
      allowCatch: false,
      allowForfeit: false,
      showActionButtons: false,
      showSpectatorBadge: false,
      showReplayControls: true
    });
    this.engine = options.engine;
  }

  async resolveOpponentChoice(_playerChoice: string): Promise<string> {
    return 'pass';
  }

  async stepNext(): Promise<boolean> {
    const hasNext = this.engine.nextTurn();
    if (!hasNext) return false;

    const logs = this.engine.getLogsForCurrentTurn();
    const filteredLogs = filterShowdownLogs([...logs]);
    await parseLogsWithSkip(this.context, filteredLogs, false, false);
    await syncTeamsFromLastWorkerState();

    if (this.engine.isOver()) {
      const winner = this.engine.getWinnerSide();
      await this.onBattleEnd(winner === 'p1', 'Replay concluido');
    }
    return true;
  }

  async processRewards(_won: boolean): Promise<void> {
    // Replay viewing does not award exp or rank
  }
}
