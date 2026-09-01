import { gameBus } from '@/logic/events/gameBus';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { useUIStore } from '@/stores/ui';
import { findBestSwitchIndex } from '../ai/battleAI.ts';
import { ShowdownTeamResolver } from '../showdownTeamResolver.ts';
import { showdownWorker, executeTurnInWorker } from '../showdownWorkerClient.ts';
import { parseShowdownLogLine, filterShowdownLogs } from '../showdownBridge.ts';
import { ShowdownBattleRunner } from './showdownBattleRunner.ts';

import { calculatePoliceBail, POLICE_STEAL_CHANCE_PERCENT } from '@/logic/player/classMath.ts';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants.ts';

export async function handlePoliceResolution(
  ctx: BattleContext,
  active: NonNullable<BattleContext['activeBattle']['value']>,
  win: boolean,
  fled: boolean,
  uiStore: ReturnType<typeof useUIStore>
): Promise<void> {
  if (active.trainerArchetype !== 'policeman') return;
  if (ctx.gs.state.playerClass !== 'rocket' || !ctx.gs.state.classData) return;

  const criminality = ctx.gs.state.classData.criminality || 0;
  const officerName = active.trainerName || 'Oficial de Policía';

  if (!win && !fled) {
    const classLevel = ctx.gs.state.classLevel || 1;
    const bailAmount = calculatePoliceBail(classLevel, criminality);

    if (bailAmount > 0) {
      const prevMoney = ctx.gs.state.money || 0;
      ctx.gs.state.money = Math.max(0, prevMoney - bailAmount);
      const moneyPaid = prevMoney - ctx.gs.state.money;

      ctx.addLog(`¡Bajo arresto por ${officerName}! Pagaste ₽${moneyPaid} de fianza.`, 'log-error', 'player');
      uiStore.notify(`Fianza pagada: ₽${moneyPaid}`, '🚨');
    }
  } else if (win && !fled) {
    if (Math.random() < POLICE_STEAL_CHANCE_PERCENT) {
      const pool = active.enemyTeam || [];
      if (pool.length > 0) {
        const stolen = pool[Math.floor(Math.random() * pool.length)];
        if (stolen) {
          const { makePokemon } = await import('@/logic/pokemon/pokemonFactory');
          const safeLevel = Math.max(1, Math.min(MAX_POKEMON_LEVEL, stolen.level || 5));
          const clone = makePokemon(stolen.id, safeLevel);
          if (clone) {
            clone.caught = true;
            ctx.gs.state.box.push(clone);

            ctx.addLog(`¡Robaste el ${clone.name} de ${officerName}!`, 'log-success', 'player');
            uiStore.notify(`¡Robaste un ${clone.name}!`, '🏴‍☠️');

            const audioStore = await import('@/stores/audio').then(m => m.useAudioStore());
            audioStore.play('steal');
          }
        }
      }
    }
  }

  ctx.gs.state.classData.criminality = 0;
  uiStore.notify('Tu nivel de criminalidad ha vuelto a cero.', '🚔');
}

export async function animatePlayerAutoSwap(
  ctx: BattleContext,
  active: NonNullable<BattleContext['activeBattle']['value']>,
  isCurrentBattle: (ctx: BattleContext, battle: NonNullable<BattleContext['activeBattle']['value']>) => boolean
): Promise<void> {
  const firstHealthy = ctx.gs.state.team.find((p: Pokemon) => p && p.hp > 0);
  const oldPlayer = active.player;
  const needsSwap = firstHealthy && (!oldPlayer || oldPlayer.uid !== firstHealthy.uid);

  if (needsSwap && firstHealthy) {
    if (oldPlayer && oldPlayer.hp > 0) ctx.exitingPlayer.value = oldPlayer;
    active.player = firstHealthy;
    active.playerTeamIndex = ctx.gs.state.team.findIndex((p: Pokemon) => p.uid === firstHealthy.uid);

    const withdrawPromise = oldPlayer && oldPlayer.hp > 0 && ctx.animations?.handleCatchRequest
      ? ctx.animations.handleCatchRequest({ side: 'player', pokemon: oldPlayer })
      : Promise.resolve();

    const sendOutPromise = ctx.animations?.handleReleaseRequest
      ? ctx.animations.handleReleaseRequest({ side: 'player', pokemon: firstHealthy })
      : Promise.resolve();

    await Promise.all([withdrawPromise, sendOutPromise]);
    if (!isCurrentBattle(ctx, active)) return;
    ctx.exitingPlayer.value = null;
  } else if (firstHealthy && !oldPlayer) {
    active.player = firstHealthy;
    active.playerTeamIndex = ctx.gs.state.team.findIndex((p: Pokemon) => p.uid === firstHealthy.uid);
    if (ctx.animations?.handleReleaseRequest) {
      await ctx.animations.handleReleaseRequest({ side: 'player', pokemon: firstHealthy });
    }
  }
}

import type { BattleSide } from '@/types/battle/battle';

export async function handleEnemyForceSwitchExecution(
  ctx: BattleContext,
  active: NonNullable<BattleContext['activeBattle']['value']>,
  onFaint: (ctx: BattleContext, side: BattleSide) => Promise<void>
): Promise<void> {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx;
  const fsm = ctx.fsm;

  const activeUidPerShowdown = active.enemyRequest?.side?.pokemon?.find((p) => p?.active)?.uid;
  const activeUidToExclude = activeUidPerShowdown ?? active.enemy?.uid;

  let nextEnemy: Pokemon | null = null;
  if (active.enemyTeam) {
    const activePlayer = active.player || active.enemyTeam[0];
    if (activePlayer) {
      const bestIdx = findBestSwitchIndex(
        active.enemyTeam,
        activePlayer,
        activeUidToExclude ?? '',
        ctx
      );
      if (bestIdx !== -1) {
        nextEnemy = active.enemyTeam[bestIdx] || null;
      } else {
        nextEnemy = active.enemyTeam.find((p: Pokemon) => p.hp > 0 && p.uid !== activeUidToExclude) || null;
      }
    } else {
      nextEnemy = active.enemyTeam.find((p: Pokemon) => p.hp > 0 && p.uid !== activeUidToExclude) || null;
    }
  }

  if (!nextEnemy) return;

  const currentEnemy = active.enemy;
  if (currentEnemy) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL);
    if (ctx.animations?.handleCatchRequest) {
      await ctx.animations.handleCatchRequest({ side: 'enemy', pokemon: currentEnemy });
    } else {
      gameBus.emit('PLAY_WITHDRAW', { side: 'enemy' });
    }
  }

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL);

  if (showdownWorker && active.enemyTeam) {
    let p2Choice = `switch ${ShowdownTeamResolver.getShowdownSlotForUid(active.enemyRequest, nextEnemy.uid)}`;
    if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
      const certifiedChoice = ShowdownBattleRunner.requireHistoryChoice(window.__VITE_DEBUG__, 'p2');
      if (certifiedChoice.startsWith('switch ')) {
        p2Choice = certifiedChoice;
      }
    }
    const result = await executeTurnInWorker('', p2Choice, true, false);
    active.playerRequest = result.p1Request;
    active.enemyRequest = result.p2Request;

    const filteredLogs = filterShowdownLogs(result.logs);
    for (const logLine of filteredLogs) {
      await parseShowdownLogLine(ctx, logLine, filteredLogs);
    }
    if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
      ShowdownBattleRunner.advanceHistoryAfterAcceptedTurn(window.__VITE_DEBUG__);
    }
  }

  active.enemy = nextEnemy;
  if (ctx.animations?.handleReleaseRequest) {
    await ctx.animations.handleReleaseRequest({ side: 'enemy', pokemon: nextEnemy });
  } else {
    gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: nextEnemy });
  }

  if (nextEnemy.hp <= 0) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ);
    await onFaint(ctx, 'enemy');
  }
}
