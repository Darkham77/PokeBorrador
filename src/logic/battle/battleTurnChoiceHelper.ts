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

export function computeP1Choice(active: BattleState | null, move: Move | null, isStruggle: boolean, moveIndex?: number): string {
  if (isStruggle) return 'struggle'
  const activeState = ((active as { value?: BattleState } | null)?.value || active) as BattleState | null
  const pReq = activeState?.playerRequest as ChoiceRequest | undefined
  const reqMoves = pReq?.active?.[0]?.moves
  if (reqMoves && Array.isArray(reqMoves)) {
    // If Showdown explicitly returned a canonical single-move state (Recharge, Struggle, 2-turn charging move, locked move)
    if (reqMoves.length === 1 && reqMoves[0]?.id) {
      return 'move 1'
    }

    const isLocked = Boolean(
      (active?.player?.volatileCounters?.['lockedmove'] && active.player.volatileCounters['lockedmove'] > 0) ||
      (active?.player?.volatileCounters?.['twoturnmove'] && active.player.volatileCounters['twoturnmove'] > 0) ||
      (active?.player?.volatileCounters?.['mustrecharge'] && active.player.volatileCounters['mustrecharge'] > 0) ||
      (active?.player?.thrashTurns && active.player.thrashTurns > 0) ||
      (active?.player?.moves && active.player.moves.length === 1)
    )

    if (move?.id) {
      const idx = reqMoves.findIndex((m: { id?: string }) => m && m.id === move.id)
      if (idx !== -1) {
        const targetReqMove = reqMoves[idx]
        if (targetReqMove?.disabled && !isLocked) {
          throw new Error(`[computeP1Choice] Move "${move.id}" is disabled. Reason: ${JSON.stringify(targetReqMove.disabled)}. PP: ${targetReqMove.pp}/${targetReqMove.maxpp}`)
        }
        return `move ${idx + 1}`
      }
    }
    // If moveIndex is provided and corresponds to a valid slot in Showdown request (e.g. Sketch/Transform/Mimic)
    if (typeof moveIndex === 'number' && moveIndex >= 0 && moveIndex < reqMoves.length && reqMoves[moveIndex]?.id) {
      const targetReqMove = reqMoves[moveIndex]
      if (targetReqMove?.disabled && !isLocked) {
        throw new Error(`[computeP1Choice] Move "${targetReqMove.id}" is disabled. Reason: ${JSON.stringify(targetReqMove.disabled)}. PP: ${targetReqMove.pp}/${targetReqMove.maxpp}`)
      }
      return `move ${moveIndex + 1}`
    }
    throw new Error(`[computeP1Choice] Move "${move?.id}" is not available in active Showdown request. Available request moves: ${JSON.stringify(reqMoves)}`)
  }
  if (!move?.id) {
    throw new Error(`[computeP1Choice] Cannot compute choice: No move provided and playerRequest is missing.`)
  }
  return `move ${move.id}`
}

export async function computeP2Choice(
  store: BattleContext,
  p: Pokemon,
  e: Pokemon,
  isWild: boolean,
  p2Skip: boolean,
  eMove: Move | null
): Promise<string> {
  let p2Choice = ''
  const active = store.activeBattle.value
  const enemyTeam = store.activeBattle.value?.enemyTeam
  const isP2Trapped = !!(
    active?.enemyRequest?.active?.[0]?.trapped ||
    active?.enemyRequest?.active?.[0]?.maybeTrapped
  )
  const wantSwitch = !isWild && !isP2Trapped && shouldEnemySwitch(e, p, enemyTeam, store)

  if (wantSwitch) {
    const bestIdx = findBestSwitchIndex(enemyTeam || [], p, e.uid, store)
    if (bestIdx !== -1) {
      const { ShowdownTeamResolver } = await import('./showdownTeamResolver.ts')
      const targetMon = enemyTeam?.[bestIdx]
      if (targetMon && targetMon.uid) {
        const slot = ShowdownTeamResolver.getShowdownSlotForUid(active?.enemyRequest, targetMon.uid)
        if (slot) {
          p2Choice = `switch ${slot}`
        }
      }
    }
  }

  if (!p2Choice) {
    const reqMoves = active?.enemyRequest?.active?.[0]?.moves as ShowdownRequestMove[] | undefined
    const preferredMoveIndex = eMove
      ? reqMoves?.findIndex(move => move.id === eMove.id && !move.disabled) ?? -1
      : -1
    const legalMoveIndex = preferredMoveIndex !== -1
      ? preferredMoveIndex
      : reqMoves?.findIndex(move => !move.disabled) ?? -1
    if (legalMoveIndex !== -1) {
      p2Choice = `move ${legalMoveIndex + 1}`
    } else if (eMove?.id) {
      p2Choice = `move ${eMove.id}`
    } else {
      p2Choice = 'struggle'
    }
  }

  if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
    if (p2Skip) {
      console.debug('[E2E-MOCK-CENTRAL-DEBUG] Preserved the certified history cursor because Showdown did not request a P2 action.');
      return 'pass';
    }
    const debugObj = window.__VITE_DEBUG__;
    const historyChoice = ShowdownBattleRunner.requireHistoryChoice(debugObj, 'p2');
    if (historyChoice) {
      p2Choice = historyChoice;
      console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Resolved enemy choice from the certified history: "${p2Choice}".`);
    }
  } else if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.nextEnemyChoice) {
    if (!p2Skip) {
      p2Choice = window.__VITE_DEBUG__.nextEnemyChoice
      console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Intercepted enemy choice via nextEnemyChoice in executeTurn: ${p2Choice}`)
      window.__VITE_DEBUG__.nextEnemyChoice = undefined
    } else {
      console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Bypassed nextEnemyChoice interception in executeTurn because P2 is in wait state.`)
    }
  } else if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.enemyChoicesQueue?.length) {
    const nextInQueue = window.__VITE_DEBUG__.enemyChoicesQueue.shift();
    if (nextInQueue) {
      p2Choice = nextInQueue;
    }
  }

  if (!p2Choice) {
    throw new Error(`[computeP2Choice] Failed to resolve P2 choice for enemy Pokémon ${e.name} (${e.uid}).`);
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
