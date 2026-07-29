import { sleep } from '@/logic/utils/timeUtils'

import { calculateDamage } from '@/logic/battle/battleEngine'
import { getStatMultiplier, getAccuracyMultiplier } from '@/logic/pokemon/statEngine'
import { applyMoveEffect } from '@/logic/battle/battleMoves'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleStages } from '@/types/battle/battle'
import type { MoveBaseData } from '@/types/system/database'

/**
 * Resolves a turn in a Live PvP battle. (Host only)
 */

export interface PvPAction {
  type: 'move' | 'switch';
  moveIndex?: number;
  switchIndex?: number;
}

export interface PvPActionResult {
  type: 'move' | 'switch';
  moveName?: string;
  actorIsHost: boolean;
  damage?: number;
  eff?: number;
  newHp?: number;
  newIdx?: number;
  missed?: boolean;
  statusBlocked?: string;
  effectLog: string[];
}

export interface PvPChannel {
  send: (payload: { type: 'presence' | 'postgres_changes' | 'broadcast', event: string, payload: unknown }) => void;
  unsubscribe: () => void;
}

export interface PvPBattleState {
  isHost: boolean;
  isRanked: boolean;
  phase: 'sync' | 'choosing' | 'resolving' | 'animating' | 'faint_switch' | 'over' | 'waiting';
  myTeam: Pokemon[];
  enemyTeam: Pokemon[];
  myActiveIdx: number;
  enemyActiveIdx: number;
  myHp: number[];
  enemyHp: number[];
  myStages: BattleStages;
  enemyStages: BattleStages;
  myPick: PvPAction | null;
  enemyPick: PvPAction | null;
  logs: string[];
  ch: PvPChannel | null;
  isPvP?: boolean;
}

export interface PvPTurnResult {
  firstIsHost: boolean;
  first: PvPActionResult;
  second: PvPActionResult | null;
  hostActiveIdx: number;
  clientActiveIdx: number;
  hostHp: number[];
  clientHp: number[];
  hostStages: BattleStages;
  clientStages: BattleStages;
}

/**
 * Resolves a turn in a Live PvP battle. (Host only)
 */
export function resolvePvPTurn(battleState: PvPBattleState): PvPTurnResult | undefined {
  if (!battleState.isHost || battleState.phase === 'resolving') return
  battleState.phase = 'resolving'
  
  const hostPoke = battleState.myTeam[battleState.myActiveIdx]
  const clientPoke = battleState.enemyTeam[battleState.enemyActiveIdx]
  
  if (!hostPoke || !clientPoke) return

  const hostPick = battleState.myPick
  const clientPick = battleState.enemyPick

  if (!hostPick || !clientPick) return

  // 1. Determine priority and order
  let firstIsHost = true
  if (hostPick.type === 'switch' && clientPick.type !== 'switch') {
    firstIsHost = true
  } else if (clientPick.type === 'switch' && hostPick.type !== 'switch') {
    firstIsHost = false
  } else if (hostPick.type === 'move' && clientPick.type === 'move') {
    const hIdx = hostPick.moveIndex ?? 0
    const cIdx = clientPick.moveIndex ?? 0
    const hMove = hostPoke.moves[hIdx]
    const cMove = clientPoke.moves[cIdx]
    if (!hMove?.id) throw new Error('[pvpEngine] Host selected a move slot without a valid move id');
    if (!cMove?.id) throw new Error('[pvpEngine] Client selected a move slot without a valid move id');
    const hMoveId = hMove.id;
    const cMoveId = cMove.id;
    const hPrio = pokemonDataProvider.getMoveData(hMoveId)?.priority || 0
    const cPrio = pokemonDataProvider.getMoveData(cMoveId)?.priority || 0

    if (hPrio !== cPrio) {
      firstIsHost = hPrio > cPrio
    } else {
      const hSpe = Math.floor(hostPoke.spe * getStatMultiplier(battleState.myStages.spe))
      const cSpe = Math.floor(clientPoke.spe * getStatMultiplier(battleState.enemyStages.spe))
      firstIsHost = hSpe > cSpe || (hSpe === cSpe && Math.random() < 0.5)
    }
  }

  // 2. Helper to calculate a single action
  const calcAction = (actorIsHost: boolean): PvPActionResult => {
    const effectLog: string[] = [] // no-domain
    const attacker = actorIsHost ? hostPoke : clientPoke
    const defender = actorIsHost ? clientPoke : hostPoke
    const atkS = actorIsHost ? battleState.myStages : battleState.enemyStages
    const defS = actorIsHost ? battleState.enemyStages : battleState.myStages
    const pick = actorIsHost ? hostPick : clientPick

    if (pick.type === 'switch') {
      return { type: 'switch', newIdx: pick.switchIndex, actorIsHost, effectLog }
    }

    const moveIdx = pick.moveIndex ?? 0
    const move = attacker.moves[moveIdx]
    if (!move?.id) throw new Error('[pvpEngine] Selected move slot has no valid move id');
    const moveName = move.name
    const moveId = move.id;
    const md: MoveBaseData = pokemonDataProvider.getMoveData(moveId)

    if (attacker.status === 'slp') {
      const sleepTurns = (attacker as unknown as { sleepTurns?: number }).sleepTurns ?? 0
      if (sleepTurns > 0) {
        (attacker as unknown as { sleepTurns: number }).sleepTurns = sleepTurns - 1
        return { type: 'move', moveName, actorIsHost, statusBlocked: 'slp', effectLog }
      }
      attacker.status = ''
      effectLog.push(`¡${attacker.name} se despertó!`)
    }

    if (attacker.status === 'par' && Math.random() < 0.25) {
      return { type: 'move', moveName, actorIsHost, statusBlocked: 'par', effectLog }
    }

    if (md.acc && Math.random() * 100 > md.acc * getAccuracyMultiplier(atkS.accuracy || 0)) {
      return { type: 'move', moveName, actorIsHost, missed: true, effectLog }
    }

    if (md.cat === 'status') {
      applyMoveEffect(md.effect, attacker, defender, atkS, defS, (m: string) => effectLog.push(m))
      return { type: 'move', moveName, actorIsHost, effectLog }
    }

    const { dmg, eff } = calculateDamage(attacker, defender, md, { 
      atkStages: (atkS as unknown as Record<string, number>)[md.cat === 'physical' ? 'atk' : 'spa'], 
      defStages: (defS as unknown as Record<string, number>)[md.cat === 'physical' ? 'def' : 'spd'] 
    })
    const targetHpArr = actorIsHost ? battleState.enemyHp : battleState.myHp
    const targetIdx = actorIsHost ? battleState.enemyActiveIdx : battleState.myActiveIdx
    const newHp = Math.max(0, (targetHpArr[targetIdx] ?? 0) - dmg)
    
    if (md.effect && dmg > 0) {
      applyMoveEffect(md.effect, attacker, defender, atkS, defS, (m: string) => effectLog.push(m))
    }

    return { type: 'move', moveName, actorIsHost, damage: dmg, eff, newHp, effectLog }
  }

  // 3. Execute actions
  const firstAction = calcAction(firstIsHost)
  if (firstAction.newHp !== undefined) {
    if (firstIsHost) {
      if (battleState.enemyHp) battleState.enemyHp[battleState.enemyActiveIdx] = firstAction.newHp
    } else {
      if (battleState.myHp) battleState.myHp[battleState.myActiveIdx] = firstAction.newHp
    }
  }

  let secondAction: PvPActionResult | null = null
  const defenderHp = firstIsHost ? (battleState.enemyHp[battleState.enemyActiveIdx] ?? 0) : (battleState.myHp[battleState.myActiveIdx] ?? 0)
  if (defenderHp > 0 && firstAction.type !== 'switch') {
    secondAction = calcAction(!firstIsHost)
  }

  const result: PvPTurnResult = {
    firstIsHost, first: firstAction, second: secondAction,
    hostActiveIdx: battleState.myActiveIdx, clientActiveIdx: battleState.enemyActiveIdx,
    hostHp: battleState.myHp, clientHp: battleState.enemyHp,
    hostStages: battleState.myStages, clientStages: battleState.enemyStages
  }
  
  if (battleState.ch && typeof battleState.ch.send === 'function') {
    battleState.ch.send({ type: 'broadcast', event: 'pvp_turn_result', payload: result })
  }
  return result
}

export async function applyPvPTurnResult(battleState: PvPBattleState, result: PvPTurnResult, endBattleCallback: (won: boolean, msg: string) => void): Promise<void> {
  battleState.phase = 'animating'
  const isHost = battleState.isHost
  const actions = [result.first, result.second].filter((a): a is PvPActionResult => a !== null)

  for (const action of actions) {
    if ((battleState.phase as string) === 'over') break
    const isMyAction = isHost ? action.actorIsHost : !action.actorIsHost
    
    if (action.type === 'switch') {
      const team = isMyAction ? battleState.myTeam : battleState.enemyTeam
      const targetPoke = team[action.newIdx ?? 0]
      if (targetPoke) {
        battleState.logs.push(`¡${isMyAction ? 'Vas a cambiar a' : 'El rival cambió a'} ${targetPoke.name}!`)
      }
      await sleep(600)
      if (isMyAction) battleState.myActiveIdx = action.newIdx ?? 0
      else battleState.enemyActiveIdx = action.newIdx ?? 0
    } else {
      const team = action.actorIsHost ? (isHost ? battleState.myTeam : battleState.enemyTeam) : (isHost ? battleState.enemyTeam : battleState.myTeam)
      const actorIdx = action.actorIsHost ? (isHost ? battleState.myActiveIdx : battleState.enemyActiveIdx) : (isHost ? battleState.enemyActiveIdx : battleState.myActiveIdx)
      const actorPoke = team[actorIdx]
      
      battleState.logs.push(`¡${isMyAction ? 'Tu' : 'El'} ${actorPoke?.name || 'Pokémon'} usó ${action.moveName}!`)
      if (action.statusBlocked) battleState.logs.push(`¡No pudo moverse por ${action.statusBlocked}!`)
      else if (action.missed) battleState.logs.push('¡Falló!')
      else if (action.damage !== undefined && action.damage > 0) {
        battleState.logs.push(`(-${action.damage} HP)${action.eff !== undefined && action.eff >= 2 ? ' ¡Muy eficaz!' : action.eff !== undefined && action.eff <= 0.5 ? ' No muy eficaz...' : ''}`)
        if (isMyAction) battleState.enemyHp[battleState.enemyActiveIdx] = action.newHp ?? 0
        else battleState.myHp[battleState.myActiveIdx] = action.newHp ?? 0
      }
      action.effectLog?.forEach((m: string) => battleState.logs.push(m))
    }
    await sleep(800)
  }
  
  // Post-turn checks
  const myHp = battleState.myHp[battleState.myActiveIdx] ?? 0
  const enHp = battleState.enemyHp[battleState.enemyActiveIdx] ?? 0

  if (myHp <= 0) {
    if (!battleState.myHp.some((h: number) => h > 0)) endBattleCallback(false, '¡Has sido derrotado!')
    else battleState.phase = 'faint_switch'
  } else if (enHp <= 0) {
    if (!battleState.enemyHp.some((h: number) => h > 0)) endBattleCallback(true, '¡Has ganado la batalla!')
    else battleState.phase = 'waiting'
  } else {
    battleState.phase = 'choosing'
    battleState.myPick = null
    battleState.enemyPick = null
  }
}
