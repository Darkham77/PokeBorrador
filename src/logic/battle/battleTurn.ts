import { decideEnemyMove, evaluateAndUseNPCItem } from './ai/battleAI.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import { resolveTurnChoices } from './battleTurnChoiceHelper.ts'
import { updateCastformForm } from './battleFlow.ts'
import { runEnemyAction } from './helpers/turnActionResolver.ts'
import {
  resolvePlayerForcedMoveIndex,
  evaluateMoveValidityAndLock
} from './helpers/turnMoveValidator.ts'

export { runEnemyAction }

import type { Pokemon, Move } from '@/types/pokemon/pokemon'

function prepareTurnCombatants(store: BattleContext, p: Pokemon, e: Pokemon): void {
  const active = store.activeBattle.value
  if (!active) return

  active.playerUsedItem = false
  active.enemyUsedItem = false

  updateCastformForm(p, active.weather?.type, store.addLog)
  updateCastformForm(e, active.weather?.type, store.addLog)
}

interface EnemyTurnActionResult {
  eMove: Move | null
  p2Skip: boolean
}

async function resolveEnemyTurnAction(
  store: BattleContext,
  e: Pokemon,
  p: Pokemon,
  isWild: boolean
): Promise<EnemyTurnActionResult> {
  let p2Skip = false
  if (!isWild && await evaluateAndUseNPCItem(store, e)) {
    p2Skip = true
    if (store.activeBattle.value) {
      store.activeBattle.value.enemyUsedItem = true
    }
  }

  let eMove: Move | null = p2Skip ? null : decideEnemyMove(e, p, store.enemyStages.value, isWild, store)
  if (!p2Skip && e.volatileCounters?.['lockedmove'] && e.volatileCounters['lockedmove'] > 0 && e.lastMove) {
    eMove = e.lastMove
  }

  return { eMove, p2Skip }
}

interface TurnExecutionArgs {
  store: BattleContext
  p: Pokemon
  e: Pokemon
  move: Move | null
  isLocked: boolean
  isStruggle: boolean
  isWild: boolean
  p2Skip: boolean
  eMove: Move | null
  finalMoveIndex: number
}

async function executeWorkerTurn(args: TurnExecutionArgs): Promise<void> {
  const { store, p, e, move, isLocked, isStruggle, isWild, eMove, finalMoveIndex } = args
  let p2Skip = args.p2Skip

  const { getShowdownWorker } = await import('./showdownWorkerClient.ts')
  const worker = getShowdownWorker()
  if (!worker) return

  if (move && move.pp > 0 && !isLocked) {
    move.pp--
  }

  const { validateAndInterceptFaintedPlayer } = await import('./resolution.ts')
  const intercepted = await validateAndInterceptFaintedPlayer(store)
  if (intercepted) return

  const choices = await resolveTurnChoices(store, p, e, move || null, isStruggle, isWild, p2Skip, eMove, finalMoveIndex)
  const p1Choice = choices.p1Choice
  let p2Choice = choices.p2Choice
  const p1Skip = choices.p1Skip
  p2Skip = choices.p2Skip || p2Skip
  if (p2Choice === 'pass') {
    p2Choice = ''
    p2Skip = true
  }

  const { executeCanonicalTurn } = await import('./helpers/canonicalTurnRunner.ts')
  await executeCanonicalTurn(store, p1Choice, p2Choice, p1Skip, p2Skip)
}

/**
 * Handles the turn logic for a single move execution.
 */
export async function executeTurn(store: BattleContext, moveIndex: number) {
  const p = store.activeBattle.value?.player
  const e = store.activeBattle.value?.enemy
  if (p) {
    console.debug(`[E2E-DEBUG-TURN] executeTurn started. moveIndex: ${moveIndex}, active player: "${p.nickname || p.name}" (UID: ${p.uid}), moves: ${JSON.stringify(p.moves.map(m => m?.id))}`)
  }
  
  if (!p || !e) {
    throw new Error(`[BattleTurn] Cannot execute turn: Active combatant missing. Player: ${p ? p.uid : 'null'}, Enemy: ${e ? e.uid : 'null'}`)
  }

  prepareTurnCombatants(store, p, e)

  const playerRequestMoves = store.activeBattle.value?.playerRequest?.active?.[0]?.moves
  const { finalMoveIndex, isRecharge } = resolvePlayerForcedMoveIndex(p, moveIndex, playerRequestMoves)
  const { isLocked, isStruggle, move, isValid } = evaluateMoveValidityAndLock(p, finalMoveIndex, isRecharge, store)

  if (!isValid) return

  const isWild = !store.activeBattle.value?.isTrainer && !store.activeBattle.value?.isGym
  const { eMove, p2Skip } = await resolveEnemyTurnAction(store, e, p, isWild)

  await executeWorkerTurn({
    store,
    p,
    e,
    move,
    isLocked,
    isStruggle,
    isWild,
    p2Skip,
    eMove,
    finalMoveIndex
  })
}
