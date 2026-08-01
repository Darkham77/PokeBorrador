import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import { shouldEnemySwitch, findBestSwitchIndex } from './ai/battleAI.ts'

import type { BattleState } from '@/types/battle/battle'
import type { ChoiceRequest } from './helpers/requestHelper.ts'

function computeP1Choice(active: BattleState | null, move: Move | null, isStruggle: boolean): string {
  let p1Choice = isStruggle ? 'struggle' : `move ${move?.id ?? 'struggle'}`
  const pReq = active?.playerRequest as ChoiceRequest | undefined
  const reqMoves = pReq?.active?.[0]?.moves
  if (!isStruggle && move?.id && reqMoves && Array.isArray(reqMoves)) {
    const idx = reqMoves.findIndex((m: { id?: string }) => m && m.id === move.id)
    if (idx !== -1) {
      p1Choice = `move ${idx + 1}`
    }
  }
  return p1Choice
}

export async function computeP2Choice(
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
    const reqMoves = active?.enemyRequest?.active?.[0]?.moves
    if (eMove && reqMoves) {
      const idx = reqMoves.findIndex((m: { id?: string }) => m.id === eMove.id)
      if (idx !== -1) {
        p2Choice = `move ${idx + 1}`
      } else {
        p2Choice = `move ${eMove.id}`
      }
    } else if (eMove) {
      p2Choice = `move ${eMove.id}`
    } else if (reqMoves) {
      const idx = reqMoves.findIndex((m: { disabled?: boolean | string }) => !m.disabled)
      if (idx !== -1) {
        p2Choice = `move ${idx + 1}`
      }
    }
  }

  if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
    const debugObj = window.__VITE_DEBUG__;
    const { ShowdownBattleRunner } = await import('./helpers/showdownBattleRunner.ts');
    const runner = new ShowdownBattleRunner((debugObj.playerChoices as string[]) || [], (debugObj.enemyChoices as string[]) || []);
    runner.p1ChoiceIdx = debugObj.p1ChoiceIdx ?? 0;
    runner.p2ChoiceIdx = debugObj.p2ChoiceIdx ?? 0;
    p2Choice = runner.resolveAndConsumeNextChoice('p2', active?.enemyRequest);
    debugObj.p1ChoiceIdx = runner.p1ChoiceIdx;
    debugObj.p2ChoiceIdx = runner.p2ChoiceIdx;
    console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Resolved enemy choice via ShowdownBattleRunner in executeTurn: "${p2Choice}" (p2Idx: ${debugObj.p2ChoiceIdx})`);
  } else if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.nextEnemyChoice) {
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

  return { p1Choice, p2Choice, p1Skip, p2Skip }
}
