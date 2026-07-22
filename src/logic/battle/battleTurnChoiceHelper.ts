import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import { shouldEnemySwitch, findBestSwitchIndex } from './ai/battleAI.ts'

import type { BattleState } from '@/types/battle/battle'
import type { ChoiceRequest } from './helpers/requestHelper'

function computeP1Choice(active: BattleState | null, move: Move | null, isStruggle: boolean): string {
  let p1Choice = isStruggle ? 'struggle' : `move ${move?.id ?? 'struggle'}`
  const pReq = active?.playerRequest as ChoiceRequest | undefined
  if (pReq?.active?.[0]?.moves) {
    const activeMoves = pReq.active[0].moves
    if (activeMoves && activeMoves.length === 1 && activeMoves[0] && activeMoves[0].id === 'recharge') {
      p1Choice = 'move recharge'
    }
  }
  return p1Choice
}

async function computeP2Choice(
  store: BattleContext,
  p: Pokemon,
  e: Pokemon,
  isWild: boolean,
  p2Skip: boolean,
  eMove: Move | null
): Promise<string> {
  let p2Choice = 'struggle'
  const active = store.activeBattle.value
  const enemyTeam = store.activeBattle.value?.enemyTeam
  const wantSwitch = !isWild && shouldEnemySwitch(e, p, enemyTeam, store)

  if (wantSwitch) {
    const bestIdx = findBestSwitchIndex(enemyTeam || [], p, e.uid, store)
    if (bestIdx !== -1) {
      const { ShowdownTeamResolver } = await import('./showdownTeamResolver.ts')
      const targetMon = enemyTeam?.[bestIdx]
      if (targetMon && targetMon.uid) {
        const slot = ShowdownTeamResolver.getShowdownSlotForUid(active?.enemyRequest, targetMon.uid)
        p2Choice = `switch ${slot}`
      }
    }
  } else {
    if (eMove) {
      p2Choice = `move ${eMove.id}`
    }
    if (p2Skip && active?.enemyRequest?.active?.[0]?.moves) {
      const validMove = active.enemyRequest.active[0].moves.find((m: { id?: string; disabled?: boolean | string }) => !m.disabled)
      if (validMove) {
        p2Choice = `move ${validMove.id}`
      }
    }
  }

  if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.nextEnemyChoice) {
    if (!p2Skip) {
      p2Choice = window.__VITE_DEBUG__.nextEnemyChoice
      console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Intercepted enemy choice via nextEnemyChoice in executeTurn: ${p2Choice}`)
      window.__VITE_DEBUG__.nextEnemyChoice = undefined
    } else {
      console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Bypassed nextEnemyChoice interception in executeTurn because P2 is in wait state.`)
    }
  } else if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.enemyChoicesQueue?.length) {
    p2Choice = window.__VITE_DEBUG__.enemyChoicesQueue.shift() ?? p2Choice
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
  eMove: Move | null
) {
  const active = store.activeBattle.value
  let p1Choice = computeP1Choice(active, move, isStruggle)
  let p2Choice = await computeP2Choice(store, p, e, isWild, p2Skip, eMove)

  let p1Skip = false
  if (p1Choice === 'pass') {
    p1Choice = ''
    p1Skip = true
  }
  if (p2Choice === 'pass') {
    p2Choice = ''
    p2Skip = true
  }

  return { p1Choice, p2Choice, p1Skip }
}
