import { gsapSleep as sleep } from '@/logic/utils/gsapHelpers'
import { decideEnemyMove, shouldEnemySwitch, findBestSwitchIndex } from './ai/battleAI.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import { logger } from '../utils/logger.ts'
import { executeMoveAction } from './actions/moveExecutor.ts'
import { updateCastformForm } from './battleFlow.ts'

/**
 * Handles the turn logic for a single move execution.
 */
export async function executeTurn(store: BattleContext, moveIndex: number) {
  const p = store.activeBattle.value?.player
  const e = store.activeBattle.value?.enemy
  
  if (!p || !e) {
    logger.warn('BattleTurn', 'Aborting turn: Player or Enemy is null', { p, e })
    return
  }

  // Transformar Castform antes de decidir y evaluar movimientos de IA
  if (store.activeBattle.value) {
    updateCastformForm(p, store.activeBattle.value.weather?.type, store.addLog)
    updateCastformForm(e, store.activeBattle.value.weather?.type, store.addLog)
  }

  const fsm = store.fsm
  const { BATTLE_STATES, BATTLE_SUBSTATES } = store

  // Thrash / lockedmove check
  if (p.volatileCounters?.['lockedmove'] && p.volatileCounters['lockedmove'] > 0 && p.lastMove) {
    const forcedIdx = p.moves.findIndex((m) => m?.id === p.lastMove?.id);
    if (forcedIdx !== -1) moveIndex = forcedIdx;
  } else if (p.thrashTurns && p.thrashTurns > 0) {
    const forcedIdx = p.moves.findIndex((m) => m?.effect === 'thrash');
    if (forcedIdx !== -1) moveIndex = forcedIdx;
  } else if (p.encoreTurns && p.encoreTurns > 0 && p.encoreMove) {
    const forcedIdx = p.moves.findIndex((m) => m?.id === p.encoreMove?.id);
    if (forcedIdx !== -1) moveIndex = forcedIdx;
  }

  const move = p.moves[moveIndex]
  if (!move || move.pp <= 0) {
    store.addLog(`¡No queda PP para ${move?.name || 'este movimiento'}!`, 'log-info', p)
    return
  }

  const isWild = !store.activeBattle.value?.isTrainer && !store.activeBattle.value?.isGym
  let eMove = decideEnemyMove(e, p, store.enemyStages.value, isWild)
  if (e.volatileCounters?.['lockedmove'] && e.volatileCounters['lockedmove'] > 0 && e.lastMove) {
    eMove = e.lastMove
  }

  // Importar dinámicamente dependencias asíncronas para evitar dependencias circulares
  const { showdownWorker, executeTurnInWorker } = await import('./orchestrator.ts')
  const { parseShowdownLogLine, filterShowdownLogs } = await import('./showdownBridge.ts')

  if (showdownWorker) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.BUILD_QUEUE)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POP_ACTION)

    const p1Choice = `move ${move.id}`;
    const p2Choice = eMove ? `move ${eMove.id}` : 'struggle';

    logger.info('BattleTurn', `Enviando elecciones al worker: Player: ${p1Choice}, Enemy: ${p2Choice}`);

    const result = await executeTurnInWorker(p1Choice, p2Choice)

    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)

    // Reproducir todos los logs del simulador asíncronamente
    const filteredLogs = filterShowdownLogs(result.logs);
    for (const logLine of filteredLogs) {
      await parseShowdownLogLine(store, logLine);
    }

    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)

    const playerFainted = store.activeBattle.value?.player && store.activeBattle.value.player.hp <= 0
    const enemyFainted = store.activeBattle.value?.enemy && store.activeBattle.value.enemy.hp <= 0

    if (playerFainted || enemyFainted) {
      if (playerFainted && enemyFainted) {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
        await store.handleFaint('player')
        
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
        await store.handleFaint('enemy')
      } else if (playerFainted) {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
        await store.handleFaint('player')
      } else {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
        await store.handleFaint('enemy')
      }
    }

    if (result.isOver && store.activeBattle.value) {
      store.activeBattle.value.over = true;
    }
  }

  if (store.activeBattle.value?.over) {
    if (store.activeBattle.value.fled) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM)
      if (store.animations?.awaitTween) {
        await store.animations.awaitTween('escape-enemy')
      } else {
        await sleep(800)
      }
      await store.endBattle(false, true)
    }
    return
  }
  
  if (store.persistBattle) store.persistBattle()
}


export async function runPlayerAction(store: BattleContext, moveIndex: number) {
  const p = store.activeBattle.value?.player
  if (!p) return

  const move = p.moves[moveIndex]
  if (!move) return

  await executeMoveAction(store, 'player', move)
}

export async function runEnemyAction(store: BattleContext) {
  const p = store.activeBattle.value?.player
  const e = store.activeBattle.value?.enemy
  if (!p || !e || e.hp <= 0) return

  const isWild = !store.activeBattle.value?.isTrainer && !store.activeBattle.value?.isGym
  
  if (!isWild && store.activeBattle.value && shouldEnemySwitch(e, p, store.activeBattle.value.enemyTeam)) {
    const bestIdx = findBestSwitchIndex(store.activeBattle.value.enemyTeam || [], p, e.uid)
    if (store.activeBattle.value.enemyTeam && bestIdx !== -1) {
      const { executeEnemySwitch } = await import('./actions/switchActions.ts')
      await executeEnemySwitch(store, bestIdx)
      return
    }
  }

  if ((store.activeBattle.value?.isGym) && e.hp < (e.maxHp * 0.25) && !store.activeBattle.value.enemyUsedItem) {
    store.activeBattle.value.enemyUsedItem = true
    const heal = Math.floor(e.maxHp * 0.5)
    e.hp = Math.min(e.maxHp, e.hp + heal)
    store.addLog(`¡El Líder usó una Hiper Poción!`, 'log-enemy', 'enemy_trainer')
    store.addLog(`¡${e.name} recuperó salud!`, 'log-info', e, 'enemy')
    return
  }

  let enemyMove = decideEnemyMove(e, p, store.playerStages.value, isWild)
  if (e.volatileCounters?.['lockedmove'] && e.volatileCounters['lockedmove'] > 0 && e.lastMove) {
    enemyMove = e.lastMove
  }
  if (!enemyMove) {
    store.addLog(`¡${e.name} no tiene más PP y usa Forcejeo!`, 'log-enemy', e)
    return
  }

  await executeMoveAction(store, 'enemy', enemyMove)
}
