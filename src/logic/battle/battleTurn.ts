import { gsapSleep as sleep } from '@/logic/utils/gsapHelpers'
import { getEffectiveSpeed } from './battleEngine.ts'
import { decideEnemyMove, shouldEnemySwitch, findBestSwitchIndex } from './ai/battleAI.ts'
import type { BattleContext } from '@/types/battleContext'
import { logger } from '../utils/logger.ts'
import { executeMoveAction } from './actions/moveExecutor.ts'

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

  const fsm = store.fsm
  const { BATTLE_STATES, BATTLE_SUBSTATES } = store

  // Thrash check
  if (p.thrashTurns && p.thrashTurns > 0) {
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

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.BUILD_QUEUE)

  // Determine Turn Order (Consider Priority)
  const isWild = !store.activeBattle.value?.isTrainer && !store.activeBattle.value?.isGym
  const eMove = decideEnemyMove(e, p, store.enemyStages.value, isWild)
  
  const pPrio = move.priority || 0
  const ePrio = eMove?.priority || 0

  const pSpe = getEffectiveSpeed(p, store.playerStages.value, { weather: store.activeBattle.value?.weather })
  const eSpe = getEffectiveSpeed(e, store.enemyStages.value, { weather: store.activeBattle.value?.weather })
  
  let playerFirst = true
  if (pPrio > ePrio) playerFirst = true
  else if (ePrio > pPrio) playerFirst = false
  else playerFirst = pSpe >= eSpe

  const queue: { source: 'player' | 'enemy'; action: () => Promise<void> }[] = []
  if (playerFirst) {
    queue.push({ source: 'player', action: () => runPlayerAction(store, moveIndex) })
    if (eMove) queue.push({ source: 'enemy', action: () => runEnemyAction(store) })
  } else {
    if (eMove) queue.push({ source: 'enemy', action: () => runEnemyAction(store) })
    queue.push({ source: 'player', action: () => runPlayerAction(store, moveIndex) })
  }

  console.log('[executeTurn] Queue initialized:', queue.map(q => q.source))
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.BUILD_QUEUE)
  
  while (queue.length > 0) {
    console.log('[executeTurn] Loop iteration start, queue length:', queue.length)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POP_ACTION)
    const currentAction = queue.shift()
    if (!currentAction) {
      console.log('[executeTurn] No current action, breaking')
      break
    }

    console.log('[executeTurn] Running action:', currentAction.source)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)
    try {
      await currentAction.action()
      console.log('[executeTurn] Action completed successfully:', currentAction.source)
    } catch (e) {
      console.error('[executeTurn] Error running action:', currentAction.source, e)
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
      break;
    }

    if (store.activeBattle.value?.over) {
      console.log('[executeTurn] Battle is over, breaking')
      break;
    }

    if (queue.length > 0) {
      console.log('[executeTurn] Queue has more items, transitioning to EVAL_CONTINUE')
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_CONTINUE)
      await sleep(400)
    } else {
      console.log('[executeTurn] Queue is empty, finishing loop')
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

  const enemyMove = decideEnemyMove(e, p, store.playerStages.value, isWild)
  if (!enemyMove) {
    store.addLog(`¡${e.name} no tiene más PP y usa Forcejeo!`, 'log-enemy', e)
    return
  }

  await executeMoveAction(store, 'enemy', enemyMove)
}
