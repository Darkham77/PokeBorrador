import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import { shouldEnemySwitch, findBestSwitchIndex } from './ai/battleAI.ts'

import type { BattleState } from '@/types/battle/battle'
import type { ChoiceRequest } from './helpers/requestHelper.ts'
import { ShowdownBattleRunner } from './helpers/showdownBattleRunner.ts'

interface ShowdownRequestMove {
  id?: string
  disabled?: boolean | string
}

function isPlayerMoveLocked(player: Pokemon | null | undefined): boolean {
  if (!player) return false
  return Boolean(
    (player.volatileCounters?.['lockedmove'] && player.volatileCounters['lockedmove'] > 0) ||
    (player.volatileCounters?.['twoturnmove'] && player.volatileCounters['twoturnmove'] > 0) ||
    (player.volatileCounters?.['mustrecharge'] && player.volatileCounters['mustrecharge'] > 0) ||
    (player.thrashTurns && player.thrashTurns > 0) ||
    (player.moves && player.moves.length === 1)
  )
}

function resolveReqMoveIndex(
  reqMoves: Array<{ id?: string; disabled?: boolean | string; pp?: number; maxpp?: number }>,
  move: Move | null,
  moveIndex?: number,
  isLocked?: boolean
): number {
  if (move?.id) {
    const idx = reqMoves.findIndex(m => m && m.id === move.id)
    if (idx !== -1) {
      const targetReqMove = reqMoves[idx]
      if (targetReqMove?.disabled && !isLocked) {
        throw new Error(`[computeP1Choice] Move "${move.id}" is disabled. Reason: ${JSON.stringify(targetReqMove.disabled)}. PP: ${targetReqMove.pp}/${targetReqMove.maxpp}`)
      }
      return idx
    }
  }

  if (typeof moveIndex === 'number' && moveIndex >= 0 && moveIndex < reqMoves.length && reqMoves[moveIndex]?.id) {
    const targetReqMove = reqMoves[moveIndex]
    if (targetReqMove?.disabled && !isLocked) {
      throw new Error(`[computeP1Choice] Move "${targetReqMove.id}" is disabled. Reason: ${JSON.stringify(targetReqMove.disabled)}. PP: ${targetReqMove.pp}/${targetReqMove.maxpp}`)
    }
    return moveIndex
  }

  throw new Error(`[computeP1Choice] Move "${move?.id}" is not available in active Showdown request. Available request moves: ${JSON.stringify(reqMoves)}`)
}

export function computeP1Choice(active: BattleState | null, move: Move | null, isStruggle: boolean, moveIndex?: number): string {
  if (isStruggle) return 'struggle'
  const activeState = ((active as { value?: BattleState } | null)?.value || active) as BattleState | null
  const pReq = activeState?.playerRequest as ChoiceRequest | undefined
  const reqMoves = pReq?.active?.[0]?.moves

  if (reqMoves && Array.isArray(reqMoves)) {
    if (reqMoves.length === 1 && reqMoves[0]?.id) {
      return 'move 1'
    }
    const isLocked = isPlayerMoveLocked(active?.player)
    const resolvedIndex = resolveReqMoveIndex(reqMoves, move, moveIndex, isLocked)
    return `move ${resolvedIndex + 1}`
  }

  if (!move?.id) {
    throw new Error(`[computeP1Choice] Cannot compute choice: No move provided and playerRequest is missing.`)
  }
  return `move ${move.id}`
}

async function tryComputeEnemySwitchChoice(
  store: BattleContext,
  p: Pokemon,
  e: Pokemon,
  isWild: boolean
): Promise<string> {
  const active = store.activeBattle.value
  const enemyTeam = active?.enemyTeam
  const isP2Trapped = Boolean(
    active?.enemyRequest?.active?.[0]?.trapped ||
    active?.enemyRequest?.active?.[0]?.maybeTrapped
  )

  if (isWild || isP2Trapped || !shouldEnemySwitch(e, p, enemyTeam, store)) {
    return ''
  }

  const bestIdx = findBestSwitchIndex(enemyTeam || [], p, e.uid, store, 'counter')
  if (bestIdx === -1) return ''

  const { ShowdownTeamResolver } = await import('./showdownTeamResolver.ts')
  const targetMon = enemyTeam?.[bestIdx]
  if (!targetMon?.uid) return ''

  const slot = ShowdownTeamResolver.getShowdownSlotForUid(active?.enemyRequest, targetMon.uid)
  return slot ? `switch ${slot}` : ''
}

function computeEnemyMoveChoice(active: BattleState | null, eMove: Move | null): string {
  const reqMoves = active?.enemyRequest?.active?.[0]?.moves as ShowdownRequestMove[] | undefined
  const preferredMoveIndex = eMove
    ? reqMoves?.findIndex(move => move.id === eMove.id && !move.disabled) ?? -1
    : -1
  const legalMoveIndex = preferredMoveIndex !== -1
    ? preferredMoveIndex
    : reqMoves?.findIndex(move => !move.disabled) ?? -1

  if (legalMoveIndex !== -1) {
    return `move ${legalMoveIndex + 1}`
  }
  if (eMove?.id) {
    return `move ${eMove.id}`
  }
  return 'struggle'
}

function applyDebugEnemyChoiceOverride(p2Choice: string, p2Skip: boolean): string {
  if (typeof window === 'undefined') return p2Choice

  if (window.__VITE_DEBUG__?.isScriptedReplayMode) {
    if (p2Skip) {
      console.debug('[E2E-MOCK-CENTRAL-DEBUG] Preserved the certified history cursor because Showdown did not request a P2 action.')
      return 'pass'
    }
    const debugObj = window.__VITE_DEBUG__
    const historyChoice = ShowdownBattleRunner.requireHistoryChoice(debugObj, 'p2')
    if (historyChoice) {
      console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Resolved enemy choice from the certified history: "${historyChoice}".`)
      return historyChoice
    }
    return p2Choice
  }

  if (window.__VITE_DEBUG__?.nextEnemyChoice) {
    if (!p2Skip) {
      const override = window.__VITE_DEBUG__.nextEnemyChoice
      console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Intercepted enemy choice via nextEnemyChoice in executeTurn: ${override}`)
      window.__VITE_DEBUG__.nextEnemyChoice = undefined
      return override
    }
    console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Bypassed nextEnemyChoice interception in executeTurn because P2 is in wait state.`)
    return p2Choice
  }

  if (window.__VITE_DEBUG__?.enemyChoicesQueue?.length) {
    const nextInQueue = window.__VITE_DEBUG__.enemyChoicesQueue.shift()
    if (nextInQueue) return nextInQueue
  }

  return p2Choice
}

export async function computeP2Choice(
  store: BattleContext,
  p: Pokemon,
  e: Pokemon,
  isWild: boolean,
  p2Skip: boolean,
  eMove: Move | null
): Promise<string> {
  const switchChoice = await tryComputeEnemySwitchChoice(store, p, e, isWild)
  let p2Choice = switchChoice || computeEnemyMoveChoice(store.activeBattle.value, eMove)

  p2Choice = applyDebugEnemyChoiceOverride(p2Choice, p2Skip)

  if (!p2Choice) {
    throw new Error(`[computeP2Choice] Failed to resolve P2 choice for enemy Pokémon ${e.name} (${e.uid}).`)
  }

  return p2Choice
}

export async function resolveTurnChoices(
  store: BattleContext,
  p: Pokemon,
  e: Pokemon,
  move: Move | null,
  isStruggle: boolean,
  isWild: boolean,
  p2Skip: boolean,
  eMove: Move | null,
  moveIndex?: number
) {
  const active = store.activeBattle.value
  let p1Choice = computeP1Choice(active, move, isStruggle, moveIndex)
  let p2Choice = await computeP2Choice(store, p, e, isWild, p2Skip, eMove)

  if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
    const debugObj = window.__VITE_DEBUG__ as Record<string, unknown> // open-record: Generic key-value data dictionary container
    const historyChoice = ShowdownBattleRunner.requireHistoryChoice(debugObj, 'p2')
    if (historyChoice) {
      p2Choice = historyChoice
    }
    console.debug(`[E2E-CERTIFIED-REPLAY] Resolved the enemy Showdown submission from certified history: ${p2Choice}. Player choice: ${p1Choice}`)
  }

  let p1Skip = false
  if (p1Choice === 'pass') {
    p1Choice = ''
    p1Skip = true
  }
  if (p2Choice === 'pass') {
    p2Choice = ''
    p2Skip = true
  }

  return { p1Choice, p2Choice, p1Skip, p2Skip }
}
