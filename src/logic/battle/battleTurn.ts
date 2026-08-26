import { decideEnemyMove, evaluateAndUseNPCItem } from './ai/battleAI.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import { logger } from '../utils/logger.ts'
import { resolveTurnChoices } from './battleTurnChoiceHelper.ts'
import { updateCastformForm } from './battleFlow.ts'
import {
  runEnemyAction,
  parseLogsWithSkip,
  resolvePostTurnSwitchesAndFaints
} from './helpers/turnActionResolver.ts'

export { runEnemyAction }

/**
 * Handles the turn logic for a single move execution.
 */
export async function executeTurn(store: BattleContext, moveIndex: number) {
  const p = store.activeBattle.value?.player
  const e = store.activeBattle.value?.enemy
  if (p) {
    console.debug(`[E2E-DEBUG-TURN] executeTurn started. moveIndex: ${moveIndex}, active player: "${p.nickname || p.name}" (UID: ${p.uid}), moves: ${JSON.stringify(p.moves.map(m => m?.id))}`);
  }
  
  if (!p || !e) {
    throw new Error(`[BattleTurn] Cannot execute turn: Active combatant missing. Player: ${p ? p.uid : 'null'}, Enemy: ${e ? e.uid : 'null'}`);
  }

  // Resetear banderas de uso de objetos al inicio del turno
  if (store.activeBattle.value) {
    store.activeBattle.value.playerUsedItem = false;
    store.activeBattle.value.enemyUsedItem = false;
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
    const forcedIdx = p.moves.findIndex((m) => m?.id === 'thrash');
    if (forcedIdx !== -1) moveIndex = forcedIdx;
  } else if (p.encoreTurns && p.encoreTurns > 0 && p.encoreMove) {
    const forcedIdx = p.moves.findIndex((m) => m?.id === p.encoreMove?.id);
    if (forcedIdx !== -1) moveIndex = forcedIdx;
  }

  // If there is only 1 move available (e.g. Rollout, Recharge, Struggle, locked move),
  // fallback moveIndex to 0 if the requested moveIndex is out of range.
  if (p.moves.length === 1 && p.moves[0]) {
    moveIndex = 0;
  }

  const isLocked = !!(p.volatileCounters?.['lockedmove'] && p.volatileCounters['lockedmove'] > 0) || 
                   !!(p.volatileCounters?.['twoturnmove'] && p.volatileCounters['twoturnmove'] > 0) || 
                   !!(p.thrashTurns && p.thrashTurns > 0) ||
                   p.moves.length === 1;
  const isStruggle = moveIndex === -1;
  const move = isStruggle ? null : p.moves[moveIndex];

  if (!isStruggle && !isLocked && move?.id !== 'struggle' && !(typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode)) {
    if (!move || move.pp <= 0) {
      store.addLog(`¡No queda PP para ${move?.name || 'este movimiento'}!`, 'log-info', p)
      return
    }
  }

  const isWild = !store.activeBattle.value?.isTrainer && !store.activeBattle.value?.isGym
  
  // Evaluar uso de objetos por parte del enemigo en turno normal
  let p2Skip = false
  if (!isWild && await evaluateAndUseNPCItem(store, e)) {
    p2Skip = true
    if (store.activeBattle.value) {
      store.activeBattle.value.enemyUsedItem = true
    }
  }

  let eMove = p2Skip ? null : decideEnemyMove(e, p, store.enemyStages.value, isWild, store)
  if (!p2Skip && e.volatileCounters?.['lockedmove'] && e.volatileCounters['lockedmove'] > 0 && e.lastMove) {
    eMove = e.lastMove
  }

  // Importar dinámicamente dependencias asíncronas para evitar dependencias circulares
  const { showdownWorker, executeTurnInWorker } = await import('./showdownWorkerClient.ts')
  const { filterShowdownLogs } = await import('./showdownBridge.ts')

  if (showdownWorker) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.BUILD_QUEUE)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POP_ACTION)

    if (move && move.pp > 0 && !isLocked) {
      move.pp--
    }

    const { validateAndInterceptFaintedPlayer } = await import('./resolution.ts')
    const intercepted = await validateAndInterceptFaintedPlayer(store)
    if (intercepted) return

    const active = store.activeBattle.value
    const choices = await resolveTurnChoices(store, p, e, move || null, isStruggle, isWild, p2Skip, eMove, moveIndex)
    const p1Choice = choices.p1Choice
    let p2Choice = choices.p2Choice
    const p1Skip = choices.p1Skip
    p2Skip = choices.p2Skip || p2Skip
    if (p2Choice === 'pass') {
      p2Choice = '';
      p2Skip = true;
    }
    const result = await executeTurnInWorker(p1Choice, p2Choice, p1Skip, p2Skip)
    if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
      const { ShowdownBattleRunner } = await import('./helpers/showdownBattleRunner.ts')
      ShowdownBattleRunner.advanceHistoryAfterAcceptedTurn(window.__VITE_DEBUG__)
    }
    logger.info('BattleTurn', 'Logs recibidos de pkms:', result.logs)

    if (active) {
      active.playerRequest = result.p1Request;
      active.enemyRequest = result.p2Request;
    }

    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)

    // Reproducir todos los logs del simulador asíncronamente omitiendo efectos de dummy moves.
    const filteredLogs = filterShowdownLogs(result.logs);
    await parseLogsWithSkip(store, filteredLogs, false, p2Skip);

    const { syncTeamsFromLastWorkerState } = await import('./showdownWorkerClient.ts');
    await syncTeamsFromLastWorkerState();

    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)

    const shouldReturn = await resolvePostTurnSwitchesAndFaints(store, result)
    if (shouldReturn) return
  }

  if (store.activeBattle.value?.over) {
    if (store.activeBattle.value.fled) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM)
      if (store.animations?.awaitTween) {
        await store.animations.awaitTween('escape-enemy')
      }
      await store.endBattle(false, true)
    }
    return
  }
  
  console.debug(`[BattleTurn] executeTurn finished. calling store.persistBattle`);
  if (store.persistBattle) store.persistBattle()
}
