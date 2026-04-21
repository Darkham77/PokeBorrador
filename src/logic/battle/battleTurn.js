import { calculateDamage, getEffectiveSpeed } from './battleEngine'
import { canAttack } from './battleFlow'
import { dispatchMoveEffect } from './actions/actionRegistry'
import { decideEnemyMove, shouldEnemySwitch, findBestSwitchIndex } from './ai/battleAI'
import { phaserBridge } from '@/logic/phaserBridge'

/**
 * Handles the turn logic for a single move execution.
 */
export async function executeTurn(store, moveIndex) {
  const p = store.activeBattle.player
  const e = store.activeBattle.enemy
  const move = p.moves[moveIndex]

  if (move.pp <= 0) {
    store.addLog(`¡No queda PP para ${move.name}!`, 'log-info')
    return
  }

  // Determine Turn Order
  const pSpe = getEffectiveSpeed(p, store.playerStages, { getStatMultiplier: (s) => 1 + (0.5 * s) })
  const eSpe = getEffectiveSpeed(e, store.enemyStages, { getStatMultiplier: (s) => 1 + (0.5 * s) })
  
  const playerFirst = pSpe >= eSpe

  if (playerFirst) {
    await runPlayerAction(store, moveIndex)
    if (e.hp > 0 && !store.activeBattle.over) {
      await new Promise(r => setTimeout(r, 800))
      await runEnemyAction(store)
    }
  } else {
    await runEnemyAction(store)
    if (p.hp > 0 && !store.activeBattle.over) {
      await new Promise(r => setTimeout(r, 800))
      await runPlayerAction(store, moveIndex)
    }
  }
}

export async function runPlayerAction(store, moveIndex) {
  const p = store.activeBattle.player
  const e = store.activeBattle.enemy
  const move = p.moves[moveIndex]
  
  if (!canAttack(p, store.addLog)) return

  move.pp--
  store.addLog(`¡${p.name} usó ${move.name}!`, 'log-player')
  store.participants.add(p.uid)

  const result = calculateDamage(p, e, move, { 
    atkStages: store.playerStages.atk, 
    defStages: store.enemyStages.def,
    weather: store.activeBattle.weather
  })

  if (result.isNoEffect) {
    store.addLog('¡No afecta!', 'log-enemy')
  } else {
    e.hp = Math.max(0, e.hp - result.dmg)
    if (result.isCrit) store.addLog('¡Un golpe crítico!', 'log-player')
    if (result.isSuperEffective) store.addLog('¡Es muy eficaz!', 'log-player')
    if (result.isNotVeryEffective) store.addLog('No es muy eficaz...', 'log-player')
    
    phaserBridge.sendCommand('BattleScene', 'PLAY_MOVE', { side: 'player', type: move.type })
    await new Promise(r => setTimeout(r, 400))
    phaserBridge.sendCommand('BattleScene', 'PLAY_DAMAGE', { side: 'enemy' })

    dispatchMoveEffect(move.effect, p, e, store.playerStages, store.enemyStages, store.addLog, store.activeBattle)
  }

  if (e.hp <= 0) {
    store.addLog(`¡${e.name} salvaje fue derrotado!`, 'log-enemy')
    phaserBridge.sendCommand('BattleScene', 'PLAY_FAINT', { side: 'enemy' })
    await store.endBattle(true)
  }
}

export async function runEnemyAction(store) {
  const p = store.activeBattle.player
  const e = store.activeBattle.enemy
  if (e.hp <= 0) return

  if (!canAttack(e, store.addLog)) return

  const isWild = !store.activeBattle.isTrainer && !store.activeBattle.isGym
  
  if (!isWild && shouldEnemySwitch(e, p, store.activeBattle.enemyTeam)) {
    const bestIdx = findBestSwitchIndex(store.activeBattle.enemyTeam, p, e.uid)
    if (bestIdx !== -1) {
      const newPoke = store.activeBattle.enemyTeam[bestIdx]
      store.addLog(`¡${store.activeBattle.trainerName || 'El entrenador'} retira a ${e.name}!`, 'log-enemy')
      await new Promise(r => setTimeout(r, 600))
      store.activeBattle.enemy = newPoke
      newPoke._revealed = true
      store.addLog(`¡Envía a ${newPoke.name}!`, 'log-enemy')
      phaserBridge.sendCommand('BattleScene', 'PLAY_SEND_OUT', { side: 'enemy', pokemon: newPoke })
      return
    }
  }

  if ((store.activeBattle.isGym) && e.hp < (e.maxHp * 0.25) && !store.activeBattle.enemyUsedItem) {
    store.activeBattle.enemyUsedItem = true
    const heal = Math.floor(e.maxHp * 0.5)
    e.hp = Math.min(e.maxHp, e.hp + heal)
    store.addLog(`¡El Líder usó una Hiper Poción!`, 'log-enemy')
    store.addLog(`¡${e.name} recuperó salud!`, 'log-info')
    return
  }

  const enemyMove = decideEnemyMove(e, p, store.playerStages, isWild)
  if (!enemyMove) {
    store.addLog(`¡${e.name} no tiene más PP y usa Forcejeo!`, 'log-enemy')
    return
  }

  store.addLog(`¡${e.name} usó ${enemyMove.name}!`, 'log-enemy')

  const eResult = calculateDamage(e, p, enemyMove, {
    atkStages: store.enemyStages.atk,
    defStages: store.playerStages.def,
    weather: store.activeBattle.weather
  })

  if (eResult.isNoEffect) {
    store.addLog('¡No afecta!', 'log-player')
  } else {
    p.hp = Math.max(0, p.hp - eResult.dmg)
    if (eResult.isCrit) store.addLog('¡Un golpe crítico!', 'log-enemy')
    if (eResult.isSuperEffective) store.addLog('¡Es muy eficaz!', 'log-enemy')
    if (eResult.isNotVeryEffective) store.addLog('No es muy eficaz...', 'log-enemy')
    
    phaserBridge.sendCommand('BattleScene', 'PLAY_MOVE', { side: 'enemy', type: enemyMove.type })
    await new Promise(r => setTimeout(r, 400))
    phaserBridge.sendCommand('BattleScene', 'PLAY_DAMAGE', { side: 'player' })

    dispatchMoveEffect(enemyMove.effect, e, p, store.enemyStages, store.playerStages, store.addLog, store.activeBattle)
  }

  if (p.hp <= 0) {
    store.addLog(`¡${p.name} cayó debilitado!`, 'log-player')
    phaserBridge.sendCommand('BattleScene', 'PLAY_FAINT', { side: 'player' })
    await store.endBattle(false)
  }
}
