import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import type { BattleContext } from '@/types/battle/battleContext'

export interface MoveResolutionResult {
  finalMoveIndex: number
  isLocked: boolean
  isStruggle: boolean
  move: Move | null
  isValid: boolean
}

interface RequestMoveItem {
  id?: string
  move?: string
  disabled?: boolean | 'pp'
}

function resolveForcedMoveByStatus(p: Pokemon): number | null {
  if (p.volatileCounters?.['lockedmove'] && p.volatileCounters['lockedmove'] > 0 && p.lastMove) {
    const forcedIdx = p.moves.findIndex((m) => m?.id === p.lastMove?.id)
    if (forcedIdx !== -1) return forcedIdx
  }
  if (p.thrashTurns && p.thrashTurns > 0) {
    const forcedIdx = p.moves.findIndex((m) => m?.id === 'thrash')
    if (forcedIdx !== -1) return forcedIdx
  }
  if (p.encoreTurns && p.encoreTurns > 0 && p.encoreMove) {
    const forcedIdx = p.moves.findIndex((m) => m?.id === p.encoreMove?.id)
    if (forcedIdx !== -1) return forcedIdx
  }
  return null
}

function resolveForcedMoveByRequest(p: Pokemon, playerRequestMoves?: Array<RequestMoveItem>): number | null {
  if (playerRequestMoves?.length === 1 && playerRequestMoves[0]?.id) {
    const singleReqId = playerRequestMoves[0].id
    const forcedIdx = p.moves.findIndex((m) => m?.id === singleReqId)
    return forcedIdx !== -1 ? forcedIdx : 0
  }
  return null
}

function checkIsRecharge(p: Pokemon, playerRequestMoves?: Array<RequestMoveItem>): boolean {
  if (p.volatileCounters?.['mustrecharge'] && p.volatileCounters['mustrecharge'] > 0) {
    return true
  }
  if (playerRequestMoves?.length === 1) {
    const req = playerRequestMoves[0]
    return req?.id === 'recharge' || req?.move === 'Recharge'
  }
  return false
}

function isMoveLockedState(p: Pokemon, isRecharge: boolean): boolean {
  return (
    isRecharge ||
    Boolean(p.volatileCounters?.['lockedmove'] && p.volatileCounters['lockedmove'] > 0) ||
    Boolean(p.volatileCounters?.['twoturnmove'] && p.volatileCounters['twoturnmove'] > 0) ||
    Boolean(p.volatileCounters?.['mustrecharge'] && p.volatileCounters['mustrecharge'] > 0) ||
    Boolean(p.thrashTurns && p.thrashTurns > 0) ||
    p.moves.length === 1
  )
}

export function resolvePlayerForcedMoveIndex(
  p: Pokemon,
  requestedMoveIndex: number,
  playerRequestMoves?: Array<RequestMoveItem>
): { finalMoveIndex: number; isRecharge: boolean } {
  const nonDisabledReqMoves = playerRequestMoves ? playerRequestMoves.filter(m => !m.disabled) : undefined
  if (nonDisabledReqMoves && nonDisabledReqMoves.length > 1) {
    if (p.volatileCounters?.['lockedmove']) {
      delete p.volatileCounters['lockedmove']
    }
    return { finalMoveIndex: requestedMoveIndex, isRecharge: false }
  }

  let moveIndex = requestedMoveIndex

  const statusIdx = resolveForcedMoveByStatus(p)
  if (statusIdx !== null) {
    moveIndex = statusIdx
  }

  if (p.moves.length === 1 && p.moves[0]) {
    moveIndex = 0
  }

  const reqIdx = resolveForcedMoveByRequest(p, playerRequestMoves)
  if (reqIdx !== null) {
    moveIndex = reqIdx
  }

  const isRecharge = checkIsRecharge(p, playerRequestMoves)
  if (isRecharge) {
    moveIndex = 0
  }

  return { finalMoveIndex: moveIndex, isRecharge }
}

export function evaluateMoveValidityAndLock(
  p: Pokemon,
  moveIndex: number,
  isRecharge: boolean,
  store: BattleContext
): MoveResolutionResult {
  const isLocked = isMoveLockedState(p, isRecharge)
  const isStruggle = moveIndex === -1
  const move = isStruggle ? null : p.moves[moveIndex] || null

  const isScriptedReplay = typeof window !== 'undefined' && Boolean(window.__VITE_DEBUG__?.isScriptedReplayMode)
  if (!isStruggle && !isLocked && move?.id !== 'struggle' && !isScriptedReplay) {
    if (!move || move.pp <= 0) {
      store.addLog(`¡No queda PP para ${move?.name || 'este movimiento'}!`, 'log-info', p)
      return { finalMoveIndex: moveIndex, isLocked, isStruggle, move, isValid: false }
    }
  }

  return { finalMoveIndex: moveIndex, isLocked, isStruggle, move, isValid: true }
}
