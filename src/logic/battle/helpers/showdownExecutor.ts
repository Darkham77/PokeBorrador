// src/logic/battle/helpers/showdownExecutor.ts
import { mapVisualToOfficialWeather } from '../../weather/weatherGenerationProvider.ts';
import type { Battle } from '@pkmn/sim';
import type { BattleCheatManager } from './battleCheatManager.ts';
import { syncRequestConditionsWithSimulator } from '../cheats.ts';
import { requiresAction } from './requestHelper.ts';
import { syncSidePokemon } from './showdownSyncHelper.ts';

export interface ShowdownExecutorOptions {
  battle: Battle;
  p1Choice: string;
  p2Choice: string;
  p1Skip?: boolean;
  p2Skip?: boolean;
  p1Hps?: Record<string, number>;
  p2Hps?: Record<string, number>;
  p1Statuses?: Record<string, string>;
  p2Statuses?: Record<string, string>;
  weather?: string;
  cheatManager: BattleCheatManager | null;
  isFuzzerSimulation?: boolean;
}

/**
 * Common executor to process a single battle turn/decision phase uniformly.
 * Handles weather sync, HP/status sync from client, pre-turn cheats,
 * choice registration, flinching skips, and post-turn cheats.
 */
export function executeBattleTurn(options: ShowdownExecutorOptions): void {
  const {
    battle,
    p1Choice,
    p2Choice,
    p1Skip,
    p2Skip,
    p1Hps,
    p2Hps,
    p1Statuses,
    p2Statuses,
    weather,
    cheatManager,
    isFuzzerSimulation
  } = options;

  // 1. Synchronize Weather
  if (weather) {
    const mappedWeather = mapVisualToOfficialWeather(weather, battle.gen || 5);
    const targetWeather = (mappedWeather === 'none' || mappedWeather === 'clear') ? '' : mappedWeather;
    if (battle.field.weather !== targetWeather) {
      if (!targetWeather) {
        battle.field.clearWeather();
      } else {
        battle.field.setWeather(targetWeather as import('@pkmn/sim').ID, 'debug' as const);
      }
    }
  }

  // 2. Synchronize HP and Statuses from Client/Vue store (if provided)
  if (!isFuzzerSimulation) {
    if (p1Hps && typeof p1Hps === 'object') {
      syncSidePokemon(battle.p1, p1Hps, p1Statuses);
      syncRequestConditionsWithSimulator(battle.p1 as unknown as import('../showdown.worker.ts').ExtendedSide);
    }

    if (p2Hps && typeof p2Hps === 'object') {
      syncSidePokemon(battle.p2, p2Hps, p2Statuses);
      syncRequestConditionsWithSimulator(battle.p2 as unknown as import('../showdown.worker.ts').ExtendedSide);
    }
  }

  // 3. Apply Pre-Turn Cheats
  if (cheatManager) {
    cheatManager.applyPreTurnCheats(battle, isFuzzerSimulation);
  }

  // 4. Handle turn skip flinch bypass
  if (!isFuzzerSimulation) {
    if (p1Skip && battle.p1.active?.[0]) {
      const activeMon = battle.p1.active[0] as unknown as { addVolatile: (status: string) => void };
      if (typeof activeMon?.addVolatile === 'function') {
        activeMon.addVolatile('flinch');
      }
    }
    if (p2Skip && battle.p2.active?.[0]) {
      const activeMon = battle.p2.active[0] as unknown as { addVolatile: (status: string) => void };
      if (typeof activeMon?.addVolatile === 'function') {
        activeMon.addVolatile('flinch');
      }
    }
  }

  // 5. Register and Execute Choices
  const resolveChoice = (side: import('@pkmn/sim').Side, choice: string, isSkip: boolean): string => {
    if (choice.includes('struggle') && !isSkip && side?.active?.[0]) {
      const activeMon = side.active[0];
      if (activeMon?.moveSlots) {
        activeMon.moveSlots.forEach((m: { id: string; pp: number } | null) => { if (m) m.pp = 0; });
      }
      return 'default';
    }
    return choice;
  };

  const chooseOrThrow = (player: 'p1' | 'p2', choice: string) => {
    const side = battle[player];
    const resolved = resolveChoice(side, choice, player === 'p1' ? !!p1Skip : !!p2Skip);
    console.debug(`[E2E-CHOOSE-DEBUG] Player ${player} choosing "${resolved}" (raw: "${choice}"). Active request: ${JSON.stringify(side.activeRequest)}`);
    const ok = battle.choose(player, resolved);
    if (!ok) {
      const activeName = side.active?.[0]?.name || 'none';
      const activeMoves = side.active?.[0]?.moves || [];
      const requestStr = JSON.stringify(side.activeRequest || {});
      throw new Error(`INVALID_CHOICE: Elección "${choice}" (resuelta a "${resolved}") rechazada por el simulador para ${player}. ActiveMon: ${activeName}, Simulator Moves: ${JSON.stringify(activeMoves)}, Request: ${requestStr}`);
    }
  };

  const turnBeforeP1 = battle.turn;
  const p1NeedsAction = !isFuzzerSimulation || requiresAction(battle.p1.activeRequest);
  const p2NeedsAction = !isFuzzerSimulation || requiresAction(battle.p2.activeRequest);

  if (p1Choice && p1NeedsAction) {
    chooseOrThrow('p1', p1Choice);
  }
  const turnAlreadyProcessed = battle.turn > turnBeforeP1;
  if (p2Choice && p2NeedsAction && !turnAlreadyProcessed) {
    chooseOrThrow('p2', p2Choice);
  }

  // 6. Apply Post-Turn Cheats
  if (cheatManager) {
    cheatManager.applyPostTurnCheats(battle, turnBeforeP1);
  }
}
