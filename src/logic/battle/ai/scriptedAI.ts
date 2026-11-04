import { logger } from '@/logic/utils/logger';

import type { BattleStages } from '../../../types/battle/battle.ts';
import type { BattleContext } from '../../../types/battle/battleContext.ts';
import type { Pokemon, Move } from '../../../types/pokemon/pokemon.ts';
import { ShowdownTeamResolver } from '../showdownTeamResolver.ts';
import type { CombatAI } from './combatAI.ts';

export class ScriptedAI implements CombatAI {
  private getDebugChoices(): { mockChoices: string[]; idx: number } | null {
    const debugObj = globalThis.__VITE_DEBUG__;

    if (!debugObj?.mockEnemyChoices) return null;
    const mockChoices = debugObj.mockEnemyChoices;
    const idx =
      debugObj.p2ChoiceIdx !== undefined ? debugObj.p2ChoiceIdx : (debugObj.enemyChoiceIndex ?? 0);
    if (!mockChoices) return null;
    return { mockChoices, idx };
  }
  public decideMove(
    enemy: Pokemon,
    _player: Pokemon,
    _playerStages: BattleStages,
    _isWild = false,
    _store?: BattleContext
  ): Move | null {
    const state = this.getDebugChoices();
    if (!state) return null;
    const { mockChoices, idx } = state;
    const choiceStr = mockChoices[idx];
    if (choiceStr && choiceStr.startsWith('move ')) {
      const splitPart = choiceStr.split(' ')[1] || '0';
      const moveIdx = parseInt(splitPart, 10) - 1;
      const targetMove = enemy.moves[moveIdx];
      if (targetMove) {
        logger.debug(
          `[DEBUG-AI] [E2E-MOCK] ScriptedAI decideMove replaying choice #${idx}: ${choiceStr} -> ${targetMove.id}`
        );
        return targetMove;
      }
    }
    return null;
  }

  public shouldSwitch(
    _enemy: Pokemon,
    _player: Pokemon,
    _enemyTeam: Pokemon[] | undefined,
    _store?: BattleContext
  ): boolean {
    const state = this.getDebugChoices();
    if (!state) return false;
    const { mockChoices, idx } = state;
    const choiceStr = mockChoices[idx];
    if (choiceStr && choiceStr.startsWith('switch ')) {
      logger.debug(
        `[DEBUG-AI] [E2E-MOCK] ScriptedAI shouldSwitch replaying choice #${idx}: true (choice is ${choiceStr})`
      );
      return true;
    }
    return false;
  }

  public findBestSwitchIndex(
    enemyTeam: Pokemon[],
    _player: Pokemon,
    _currentEnemyUid: string,
    store?: BattleContext,
    _mode?: unknown
  ): number {
    const state = this.getDebugChoices();
    if (!state) return -1;
    const { mockChoices, idx } = state;
    const choiceStr = mockChoices[idx];
    if (choiceStr && choiceStr.startsWith('switch ')) {
      const splitPart = choiceStr.split(' ')[1] || '0';
      const slotNum = parseInt(splitPart, 10);
      const active = store?.activeBattle?.value;
      const enemyRequest = active?.enemyRequest;
      const targetPoke = ShowdownTeamResolver.getPokemonByShowdownSlot(
        enemyTeam,
        enemyRequest,
        slotNum
      );
      if (targetPoke) {
        const teamIdx = enemyTeam.findIndex((p) => p && p.uid === targetPoke.uid);
        if (teamIdx !== -1) {
          logger.debug(
            `[DEBUG-AI] [E2E-MOCK] ScriptedAI findBestSwitchIndex replaying choice #${idx}: ${choiceStr} -> UID ${targetPoke.uid} at idx ${teamIdx}`
          );
          return teamIdx;
        }
      }
    }
    return -1;
  }

  // Deterministic simulations strictly follow the script and do not use items automatically
  public async evaluateAndUseItem(_ctx: BattleContext, _e: Pokemon): Promise<boolean> {
    logger.debug(
      '[DEBUG-AI] [E2E-MOCK] ScriptedAI evaluateAndUseItem returning false (items disabled during E2E simulation)'
    );
    return false;
  }
}
