import { sleep } from '@/logic/utils/timeUtils'
import { gameBus } from '@/logic/events/gameBus'
import { clearVolatileStatus } from '../battleStatus.ts'
import { handleEntryAbilities } from '../battleFlow.ts'
import { runEnemyAction } from '../battleTurn.ts'
import type { BattleContext } from '@/types/battle/battleContext'

export async function executeSwitch(ctx: BattleContext, teamIndex: number, isForced = false) {
  const { gs, activeBattle, fsm, BATTLE_STATES, BATTLE_SUBSTATES, addLog, exitingPlayer, animations, playerStages, enemyStages, persistBattle, handleFaint } = ctx

  await fsm.transition(BATTLE_STATES.REORDER_TEAM)
  await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.FIND_HEALTHY)
  
  const newPoke = gs.state.team[teamIndex]
  if (!newPoke || newPoke.hp <= 0) return
  
  await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.CHECK_ACTIVE_SEAT)
  if (!activeBattle.value) return
  const oldPoke = activeBattle.value.player
  
  if (oldPoke && oldPoke.uid === newPoke.uid) {
    return
  }

  if (oldPoke && oldPoke.hp > 0) {
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.SWITCHING)
    addLog(`¡Bien hecho, ${oldPoke.name}! ¡Regresa!`, 'log-info', 'player')
    addLog(`¡Envía a ${newPoke.name}!`, 'log-info', newPoke)
    
    exitingPlayer.value = oldPoke
    activeBattle.value.player = newPoke
    activeBattle.value.playerTeamIndex = teamIndex
    clearVolatileStatus(oldPoke)

    if (!activeBattle.value.participants.includes(newPoke.uid)) {
      activeBattle.value.participants.push(newPoke.uid)
    }

    const withdrawPromise = animations?.handleCatchRequest
      ? animations.handleCatchRequest({ side: 'player', pokemon: oldPoke })
      : Promise.resolve()

    const sendOutPromise = animations?.handleReleaseRequest
      ? animations.handleReleaseRequest({ side: 'player', pokemon: newPoke })
      : Promise.resolve()

    await Promise.all([withdrawPromise, sendOutPromise])
    exitingPlayer.value = null
  } else {
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_CALL)
    activeBattle.value.player = newPoke
    activeBattle.value.playerTeamIndex = teamIndex
    
    if (animations?.handleReleaseRequest) {
      await animations.handleReleaseRequest({ side: 'player', pokemon: newPoke })
    } else {
      await sleep(800)
    }
  }
  
  if (!activeBattle.value.participants.includes(newPoke.uid)) {
    activeBattle.value.participants.push(newPoke.uid)
  }
  
  const s = playerStages.value
  playerStages.value = { 
    ...s,
    atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0
  }
  
  addLog(`¡Adelante, ${newPoke.name}!`, 'log-player', newPoke)
  await sleep(400)

  if (playerStages.value.spikes > 0 && newPoke.type !== 'flying' && newPoke.type2 !== 'flying' && newPoke.ability !== 'Levitación') {
    const dmg = Math.floor(newPoke.maxHp * (playerStages.value.spikes / 8))
    newPoke.hp = Math.max(0, newPoke.hp - dmg)
    addLog(`¡${newPoke.name} recibió daño por las púas!`, 'log-info', newPoke)
    gameBus.emit('PLAY_SOUND', 'statusDamage')
  }
  
  if (activeBattle.value && activeBattle.value.enemy) {
    handleEntryAbilities(newPoke, activeBattle.value.enemy, playerStages.value, enemyStages.value, addLog, activeBattle.value.weather?.type)
  }
  persistBattle()
  
  if (typeof isForced !== 'undefined' && !isForced) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)
    await runEnemyAction(ctx)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)

    if (activeBattle.value?.player && activeBattle.value.player.hp <= 0) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
      await handleFaint('player')
      return
    }
    if (activeBattle.value?.enemy && activeBattle.value.enemy.hp <= 0) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
      await handleFaint('enemy')
      return
    }
  } else {
    // Si es un cambio forzado (por debilitación), debemos asegurar que la FSM
    // vuelva al estado de combate activo antes de transicionar a WAIT_INPUT
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE)
  }
  
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
}
