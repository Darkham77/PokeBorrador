import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import type { BattleContext } from '@/types/battle/battleContext'

export interface MoveResolutionResult {
  finalMoveIndex: number
  isLocked: boolean
  isStruggle: boolean
  move: Move | null
  isValid: boolean
}

export function resolvePlayerForcedMoveIndex(
  p: Pokemon,
  requestedMoveIndex: number,
  playerRequestMoves?: Array<{ id?: string; move?: string }>
): { finalMoveIndex: number; isRecharge: boolean } {
  let moveIndex = requestedMoveIndex

  if (p.volatileCounters?.['lockedmove'] && p.volatileCounters['lockedmove'] > 0 && p.lastMove) {
    const forcedIdx = p.moves.findIndex((m) => m?.id === p.lastMove?.id)
    if (forcedIdx !== -1) moveIndex = forcedIdx
  } else if (p.thrashTurns && p.thrashTurns > 0) {
    const forcedIdx = p.moves.findIndex((m) => m?.id === 'thrash')
    if (forcedIdx !== -1) moveIndex = forcedIdx
  } else if (p.encoreTurns && p.encoreTurns > 0 && p.encoreMove) {
    const forcedIdx = p.moves.findIndex((m) => m?.id === p.encoreMove?.id)
    if (forcedIdx !== -1) moveIndex = forcedIdx
  }

  if (p.moves.length === 1 && p.moves[0]) {
    moveIndex = 0
  }

  if (playerRequestMoves?.length === 1 && playerRequestMoves[0]?.id) {
    const singleReqId = playerRequestMoves[0].id
    const forcedIdx = p.moves.findIndex((m) => m?.id === singleReqId)
    moveIndex = forcedIdx !== -1 ? forcedIdx : 0
  }

  const isRecharge = Boolean(
    (p.volatileCounters?.['mustrecharge'] && p.volatileCounters['mustrecharge'] > 0) ||
    (playerRequestMoves?.length === 1 &&
      (playerRequestMoves[0]?.id === 'recharge' || playerRequestMoves[0]?.move === 'Recharge'))
  )

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
  const isLocked = isRecharge ||
    Boolean(p.volatileCounters?.['lockedmove'] && p.volatileCounters['lockedmove'] > 0) ||
    Boolean(p.volatileCounters?.['twoturnmove'] && p.volatileCounters['twoturnmove'] > 0) ||
    Boolean(p.volatileCounters?.['mustrecharge'] && p.volatileCounters['mustrecharge'] > 0) ||
    Boolean(p.thrashTurns && p.thrashTurns > 0) ||
    p.moves.length === 1

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
