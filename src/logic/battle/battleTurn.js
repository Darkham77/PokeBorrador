// [PureVue-Ignore-Length]
import { calculateDamage, getEffectiveSpeed } from './battleEngine'
import { canAttack } from './battleFlow'
import { dispatchMoveEffect } from './actions/actionRegistry'
import { decideEnemyMove, shouldEnemySwitch, findBestSwitchIndex } from './ai/battleAI'
import { gameBus } from '@/logic/gameBus'
import { recalcPokemonStats } from '@/logic/pokemonFactory'

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
  
  if (store.persistBattle) store.persistBattle()
}

export async function runPlayerAction(store, moveIndex) {
  const p = store.activeBattle.player
  const e = store.activeBattle.enemy
  const move = p.moves[moveIndex]
  
  if (!canAttack(p, store.addLog)) return
  
  store.attackerSide = 'player'
  store.activeMove = { ...move, side: 'player' }
  move.pp--
  store.addLog(`¡${p.name} usó ${move.name}!`, 'log-player', p)
  // Sanity check for stats & level & moves
  if (!p.atk || !p.maxHp || move.power === undefined) recalcPokemonStats(p)
  if (!e.atk || !e.maxHp) recalcPokemonStats(e)
  
  if (!p.level) p.level = 5 // Fallback
  
  if (!p.atk || !e.def || (move.power === undefined && move.cat !== 'status')) {
    store.addLog(`[Error] Datos faltantes: Atk:${p.atk} Def:${e.def} Pwr:${move.power}`, 'log-error')
  }
  if (!store.activeBattle.participants.includes(p.uid)) {
    store.activeBattle.participants.push(p.uid)
  }

  try {
    const result = calculateDamage(p, e, move, { 
      atkStages: store.playerStages.atk, 
      defStages: store.enemyStages.def,
      weather: store.activeBattle.weather
    })

    if (result.isNoEffect) {
      store.addLog('¡No afecta!', 'log-enemy')
    } else {
      const damage = Math.floor(result.dmg || 0)
      
      // Update HP
      store.activeBattle.enemy.hp = Math.max(0, e.hp - damage)
      
      // Legacy style logs
      store.addLog(`¡${e.name} recibió ${damage} de daño!`, 'log-info', e)
      if (result.isCrit) store.addLog('¡Un golpe crítico!', 'log-player', p)
      if (result.isSuperEffective) store.addLog('¡Es muy eficaz!', 'log-player', p)
      if (result.isNotVeryEffective) store.addLog('No es muy eficaz...', 'log-player', p)
      
    if (move.category !== 'status') {
      await new Promise(r => setTimeout(r, 600))
    }
    store.attackerSide = null

    dispatchMoveEffect(move.effect, p, e, store.playerStages, store.enemyStages, store.addLog, store.activeBattle)
    }
  } catch (err) {
    console.error('[Battle] Error in runPlayerAction:', err)
    store.addLog('¡Error al ejecutar el ataque!', 'log-error')
  }

  if (e.hp <= 0) {
    const isTr = store.activeBattle.isTrainer || store.activeBattle.isGym
    const enemyName = isTr ? e.name : `¡${e.name} salvaje`
    store.addLog(`${enemyName} fue derrotado!`, 'log-enemy', e)
    gameBus.emit('PLAY_FAINT', { side: 'enemy' })
    
    // Si es entrenador, retirar con animación de energía y enviar al siguiente
    if (isTr && store.activeBattle.enemyTeam) {
      gameBus.emit('PLAY_WITHDRAW', { side: 'enemy' })
      
      const nextEnemy = store.activeBattle.enemyTeam.find(p => p.hp > 0)
      if (nextEnemy) {
      store.addLog(`¡Entrenador envía a ${nextEnemy.name}!`, 'log-enemy', nextEnemy)
      gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: nextEnemy })
      await new Promise(r => setTimeout(r, 800))
      return
      }
    }

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
      store.addLog(`¡${store.activeBattle.trainerName || 'El entrenador'} retira a ${e.name}!`, 'log-enemy', e)
      gameBus.emit('PLAY_WITHDRAW', { side: 'enemy' })
      await new Promise(r => setTimeout(r, 800))
      
      store.activeBattle.enemy = newPoke
      store.addLog(`¡Envía a ${newPoke.name}!`, 'log-enemy', newPoke)
      gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: newPoke })
      await new Promise(r => setTimeout(r, 800))
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

  // Sanity check for stats & moves
  if (!e.atk || !e.maxHp || enemyMove.power === undefined) recalcPokemonStats(e)
  if (!p.atk || !p.maxHp) recalcPokemonStats(p)
  if (!e.level) e.level = 5

  store.attackerSide = 'enemy'
  store.activeMove = { ...enemyMove, side: 'enemy' }
  store.addLog(`¡${e.name} usó ${enemyMove.name}!`, 'log-enemy', e)

  try {
    const eResult = calculateDamage(e, p, enemyMove, {
      atkStages: store.enemyStages.atk,
      defStages: store.playerStages.def,
      weather: store.activeBattle.weather
    })

    if (eResult.isNoEffect) {
      store.addLog('¡No afecta!', 'log-player')
    } else {
      const damage = Math.floor(eResult.dmg || 0)
      p.hp = Math.max(0, p.hp - damage)
      
      store.addLog(`¡${p.name} recibió ${damage} de daño!`, 'log-info', p)
      if (eResult.isCrit) store.addLog('¡Un golpe crítico!', 'log-enemy', e)
      if (eResult.isSuperEffective) store.addLog('¡Es muy eficaz!', 'log-enemy', e)
      if (eResult.isNotVeryEffective) store.addLog('No es muy eficaz...', 'log-enemy', e)
      
    if (enemyMove.category !== 'status') {
      await new Promise(r => setTimeout(r, 600))
    }
    store.attackerSide = null

    dispatchMoveEffect(enemyMove.effect, e, p, store.enemyStages, store.playerStages, store.addLog, store.activeBattle)
    }
  } catch (err) {
    console.error('[Battle] Error in runEnemyAction:', err)
    store.addLog('¡Error en el turno del oponente!', 'log-error')
  }

  if (p.hp <= 0) {
    store.addLog(`¡${e.name} enemigo se debilitó!`, 'log-enemy', e)
    gameBus.emit('PLAY_FAINT', { side: 'player' })
    await new Promise(r => setTimeout(r, 1000))
    
    // Si es entrenador, retirar con animación
    gameBus.emit('PLAY_WITHDRAW', { side: 'player' })
    await new Promise(r => setTimeout(r, 800))
    
    // Solo termina el combate si NO quedan Pokémon disponibles (excluyendo al que acaba de caer)
    const hasMore = store.gs.state.team.some(poke => poke.hp > 0 && poke.uid !== p.uid && !poke.onMission && !poke.onDefense)
    
    if (!hasMore) {
      console.log('[BATTLE] Jugador derrotado y sin más Pokémon. Terminando combate.')
      await store.endBattle(false)
    } else {
      store.addLog('¡Envía a otro Pokémon!', 'log-info', p)
      const uiStore = (await import('@/stores/ui')).useUIStore()
      uiStore.isBattleSwitchForced = true
    }
  }

  if (store.persistBattle) store.persistBattle()
}
