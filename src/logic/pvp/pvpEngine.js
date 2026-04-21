import { calculateDamage } from '@/logic/battle/battleEngine'
import { getStatMultiplier, getAccuracyMultiplier } from '@/logic/pokemon/statEngine'
import { applyMoveEffect } from '@/logic/battle/battleMoves'
import { MOVE_DATA } from '@/data/moves'
import { phaserBridge } from '@/logic/phaserBridge'

/**
 * Resolves a turn in a Live PvP battle. (Host only)
 */
export function resolvePvPTurn(battleState) {
  if (!battleState.isHost || battleState.phase === 'resolving') return
  battleState.phase = 'resolving'
  
  const hostPoke = battleState.myTeam[battleState.myActiveIdx]
  const clientPoke = battleState.enemyTeam[battleState.enemyActiveIdx]
  
  const hostPick = battleState.myPick
  const clientPick = battleState.enemyPick

  // 1. Determine priority and order
  let firstIsHost = true
  if (hostPick.type === 'switch' && clientPick.type !== 'switch') {
    firstIsHost = true
  } else if (clientPick.type === 'switch' && hostPick.type !== 'switch') {
    firstIsHost = false
  } else if (hostPick.type === 'move' && clientPick.type === 'move') {
    const hMove = hostPoke.moves[hostPick.moveIndex]
    const cMove = clientPoke.moves[clientPick.moveIndex]
    const hPrio = MOVE_DATA[hMove?.name]?.priority || 0
    const cPrio = MOVE_DATA[cMove?.name]?.priority || 0

    if (hPrio !== cPrio) {
      firstIsHost = hPrio > cPrio
    } else {
      const hSpe = Math.floor(hostPoke.spe * getStatMultiplier(battleState.myStages.spe))
      const cSpe = Math.floor(clientPoke.spe * getStatMultiplier(battleState.enemyStages.spe))
      firstIsHost = hSpe > cSpe || (hSpe === cSpe && Math.random() < 0.5)
    }
  }

  // 2. Helper to calculate a single action
  const calcAction = (actorIsHost) => {
    const effectLog = []
    const attacker = actorIsHost ? hostPoke : clientPoke
    const defender = actorIsHost ? clientPoke : hostPoke
    const atkS = actorIsHost ? battleState.myStages : battleState.enemyStages
    const defS = actorIsHost ? battleState.enemyStages : battleState.myStages
    const pick = actorIsHost ? hostPick : clientPick

    if (pick.type === 'switch') {
      return { type: 'switch', newIdx: pick.switchIndex, actorIsHost, effectLog }
    }

    const move = attacker.moves[pick.moveIndex]
    const moveName = move?.name || '???'
    const md = MOVE_DATA[moveName] || { power: 40, type: 'normal', cat: 'physical', acc: 100 }

    if (attacker.status === 'sleep') {
      if (attacker.sleepTurns > 0) {
        attacker.sleepTurns--
        return { type: 'move', moveName, actorIsHost, statusBlocked: 'sleep', effectLog }
      }
      attacker.status = null
      effectLog.push(`¡${attacker.name} se despertó!`)
    }

    if (attacker.status === 'paralyze' && Math.random() < 0.25) {
      return { type: 'move', moveName, actorIsHost, statusBlocked: 'paralyze', effectLog }
    }

    if (md.acc && Math.random() * 100 > md.acc * getAccuracyMultiplier(atkS.acc || 0)) {
      return { type: 'move', moveName, actorIsHost, missed: true, effectLog }
    }

    if (md.cat === 'status') {
      applyMoveEffect(md.effect, attacker, defender, atkS, defS, (m) => effectLog.push(m))
      return { type: 'move', moveName, actorIsHost, isStatus: true, effectLog }
    }

    const { dmg, eff } = calculateDamage(attacker, defender, md, { atkStages: atkS[md.cat === 'physical' ? 'atk' : 'spa'], defStages: defS[md.cat === 'physical' ? 'def' : 'spd'] })
    const targetHpArr = actorIsHost ? battleState.enemyHp : battleState.myHp
    const targetIdx = actorIsHost ? battleState.enemyActiveIdx : battleState.myActiveIdx
    const newHp = Math.max(0, targetHpArr[targetIdx] - dmg)
    
    if (md.effect && md.effect !== 'none' && dmg > 0) {
      applyMoveEffect(md.effect, attacker, defender, atkS, defS, (m) => effectLog.push(m))
    }

    return { type: 'move', moveName, actorIsHost, damage: dmg, eff, newHp, effectLog }
  }

  // 3. Execute actions
  const firstAction = calcAction(firstIsHost)
  if (firstAction.newHp !== undefined) {
    if (firstIsHost) battleState.enemyHp[battleState.enemyActiveIdx] = firstAction.newHp
    else battleState.myHp[battleState.myActiveIdx] = firstAction.newHp
  }

  let secondAction = null
  const defenderHp = firstIsHost ? battleState.enemyHp[battleState.enemyActiveIdx] : battleState.myHp[battleState.myActiveIdx]
  if (defenderHp > 0 && firstAction.type !== 'switch') {
    secondAction = calcAction(!firstIsHost)
  }

  const result = {
    firstIsHost, first: firstAction, second: secondAction,
    hostActiveIdx: battleState.myActiveIdx, clientActiveIdx: battleState.enemyActiveIdx,
    hostHp: battleState.myHp, clientHp: battleState.enemyHp,
    hostStages: battleState.myStages, clientStages: battleState.enemyStages
  }
  
  battleState.ch.send({ type: 'broadcast', event: 'pvp_turn_result', payload: result })
  return result
}

export async function applyPvPTurnResult(battleState, result, endBattleCallback) {
  battleState.phase = 'animating'
  const isHost = battleState.isHost
  const actions = [result.first, result.second].filter(Boolean)

  for (const action of actions) {
    if (battleState.phase === 'over') break
    const isMyAction = isHost ? action.actorIsHost : !action.actorIsHost
    
    if (action.type === 'switch') {
      const team = isMyAction ? battleState.myTeam : battleState.enemyTeam
      battleState.logs.push(`¡${isMyAction ? 'Vas a cambiar a' : 'El rival cambió a'} ${team[action.newIdx].name}!`)
      phaserBridge.sendCommand('BattleScene', 'PLAY_WITHDRAW', { side: isMyAction ? 'player' : 'enemy' })
      await new Promise(r => setTimeout(r, 600))
      if (isMyAction) battleState.myActiveIdx = action.newIdx
      else battleState.enemyActiveIdx = action.newIdx
      phaserBridge.sendCommand('BattleScene', 'PLAY_SEND_OUT', { side: isMyAction ? 'player' : 'enemy', pokemon: team[action.newIdx] })
    } else {
      battleState.logs.push(`¡${isMyAction ? 'Tu' : 'El'} ${action.actorName || 'Pokémon'} usó ${action.moveName}!`)
      phaserBridge.sendCommand('BattleScene', 'PLAY_MOVE', { side: isMyAction ? 'player' : 'enemy', type: MOVE_DATA[action.moveName]?.type || 'normal' })
      if (action.statusBlocked) battleState.logs.push(`¡No pudo moverse por ${action.statusBlocked}!`)
      else if (action.missed) battleState.logs.push('¡Falló!')
      else if (action.damage > 0) {
        battleState.logs.push(`(-${action.damage} HP)${action.eff >= 2 ? ' ¡Muy eficaz!' : action.eff <= 0.5 ? ' No muy eficaz...' : ''}`)
        phaserBridge.sendCommand('BattleScene', 'PLAY_DAMAGE', { side: isMyAction ? 'enemy' : 'player' })
        if (isMyAction) battleState.enemyHp[battleState.enemyActiveIdx] = action.newHp
        else battleState.myHp[battleState.myActiveIdx] = action.newHp
      }
      action.effectLog?.forEach(m => battleState.logs.push(m))
    }
    await new Promise(r => setTimeout(r, 1200))
  }
  
  // Post-turn checks
  const myHp = battleState.myHp[battleState.myActiveIdx]
  const enHp = battleState.enemyHp[battleState.enemyActiveIdx]

  if (myHp <= 0) {
    if (!battleState.myHp.some(h => h > 0)) endBattleCallback(false, '¡Has sido derrotado!')
    else battleState.phase = 'faint_switch'
  } else if (enHp <= 0) {
    if (!battleState.enemyHp.some(h => h > 0)) endBattleCallback(true, '¡Has ganado la batalla!')
    else battleState.phase = 'waiting'
  } else {
    battleState.phase = 'choosing'
    battleState.myPick = null
    battleState.enemyPick = null
  }
}
