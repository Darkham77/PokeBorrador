import { gameBus } from '@/logic/gameBus'
import { calculateBaseExp, processExpGain, calculateMoneyGain } from './battleRewards'
import { getBattleRewardModifiers } from '@/logic/war/bonusEngine'
import { levelUpPokemon } from '@/logic/pokemonFactory'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { useEventStore } from '@/stores/events'

/**
 * Handles the fainting of a Pokémon.
 */
export async function processFaint(ctx, side) {
  const isPlayer = side === 'player'
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, isPlayer ? BATTLE_SUBSTATES.PLAYER_FAINT_SEQ : BATTLE_SUBSTATES.ENEMY_FAINT)
  
  if (ctx.faintedSides.value.has(side)) return
  ctx.faintedSides.value.add(side)
  
  const pokemon = isPlayer ? ctx.player.value : ctx.enemy.value
  const opponent = isPlayer ? ctx.enemy.value : ctx.player.value
  
  if (pokemon.destinyBond && opponent && opponent.hp > 0) {
    ctx.addLog(`¡${pokemon.name} se llevó a ${opponent.name} con él!`, 'log-info', pokemon)
    opponent.hp = 0
    await new Promise(r => setTimeout(r, 500))
    await processFaint(ctx, isPlayer ? 'enemy' : 'player')
  }

  if (isPlayer) {
    ctx.addLog(`¡${pokemon.name} se ha debilitado!`, 'log-player', pokemon)
    
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SPRITE_FAINT)
    gameBus.emit('PLAY_FAINT', { side: 'player' })
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_FAINT)
    
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL)
    gameBus.emit('PLAY_WITHDRAW', { side: 'player', isFaint: true })
    await new Promise(r => setTimeout(r, 800))
    ctx.activeBattle.value.player = null // Liberar asiento tras retiro
    
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CHECK_TEAM)
    const nextPoke = ctx.gs.state.team.find(p => p.hp > 0)
    
    if (!nextPoke) {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ALL_FAINTED)
      ctx.activeBattle.value.over = true
      ctx.addLog('¡No te quedan Pokémon sanos!', 'log-error', 'player')
      // Esperar a que la animación de faint/retiro termine antes del fade out
      await new Promise(r => setTimeout(r, 1500))
      await terminateBattle(ctx, false)
    } else {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.HAS_HEALTHY)
      ctx.addLog('¡Elige a tu próximo Pokémon!', 'log-info', 'player')
      ctx.faintedSides.value.delete('player')
      useUIStore().isBattleSwitchForced = true
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SWITCH_MENU)
    }
  } else {
    const isTr = ctx.activeBattle.value.isTrainer || ctx.activeBattle.value.isGym
    const enemyName = isTr ? pokemon.name : `¡${pokemon.name} salvaje`
    ctx.addLog(`${enemyName} fue derrotado!`, 'log-enemy', pokemon)
    
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_DEFEAT)
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.HIDE_ENEMY_COMBAT_HUD_KO)
    
    // Secuencia de Salto + Faint
    gameBus.emit('PLAY_SOUND', 'faint')
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SPRITE_JUMP)
    await new Promise(r => setTimeout(r, 600)) // Duración del salto
    
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SPRITE_FAINT)
    gameBus.emit('PLAY_FAINT', { side: 'enemy' })
    
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ENEMY_FAINT)
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_FAINT)
    
    if (isTr) {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL)
      gameBus.emit('PLAY_WITHDRAW', { side: 'enemy', isFaint: true })
      await new Promise(r => setTimeout(r, 800))
    } else {
      // Para salvajes, esperamos al wait del faint
      await new Promise(r => setTimeout(r, 1000))
    }

    if (isTr && ctx.activeBattle.value.enemyTeam) {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CHECK_REMAINING)
      const nextEnemy = ctx.activeBattle.value.enemyTeam.find(p => p.hp > 0)
      if (nextEnemy) {
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CLEANUP_MEMORY)
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.STABILIZE_STAGE)
        ctx.activeBattle.value.enemy = nextEnemy
        
        const s = ctx.enemyStages.value
        ctx.enemyStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, 
          reflect: s.reflect || 0, lightScreen: s.lightScreen || 0, safeguard: s.safeguard || 0, mist: s.mist || 0, spikes: s.spikes || 0 }
        
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.AI_NEXT_PICK)
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SELECT_COUNTER)
        ctx.addLog(`¡Entrenador envía a ${nextEnemy.name}!`, 'log-enemy', 'enemy_trainer')
        gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: nextEnemy })
        await new Promise(r => setTimeout(r, 800))
        return
      }
    }
    
    ctx.activeBattle.value.over = true 
    ctx.faintedSides.value.add('enemy')
    await terminateBattle(ctx, true)
  }
}

/**
 * Terminates the battle and processes results.
 */
export async function terminateBattle(ctx, win, fled = false) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  if (!ctx.activeBattle.value) {
    fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    return
  }

  const battleData = { ...ctx.activeBattle.value }
  const enemyRef = battleData.enemy
  const locId = battleData.locationId
  
  ctx.activeBattle.value.over = true
  ctx.faintedSides.value.clear()
  
  if (win && !fled) calculateBattleRewards(ctx)
  
  syncAndPersist(ctx)

  if (ctx.activeBattle.value) {
    ctx.activeBattle.value.enemy = null
    ctx.activeBattle.value.player = null
  }

  fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.CHECK_OUTCOME)

  if (!win && !fled) {
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.VOID_STATE)
    await new Promise(r => setTimeout(r, 1000))
    await ctx.gs.save(false)
    
    fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.ENTRY_CHECK)
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.DEFEAT_SCREEN)
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.DEFEAT_WAIT)
    return
  }

  if (fled) {
    fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.WAIT_LOG_QUEUE_ONLY)
    await ctx.waitForLogs()
    
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.ENTRY_CHECK)
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.EXECUTE_CLEANUP)
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.CLEAR_UI)
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.TRIGGER_CLOSE)
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.RESET_FLAGS)
    await ctx.completeBattleFlow('map')
    return
  }

  if (win && !fled) {
    if (ctx.activeBattle.value && fsm.currentState.value !== BATTLE_STATES.REWARDS_PHASE) {
      await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.VOID_STATE)
      await new Promise(r => setTimeout(r, 1000))
      if (!ctx.activeBattle.value) return
    }
    fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.DISTRIBUTE_XP)

    const isTr = battleData.isTrainer || battleData.isGym
    const warStore = ctx.warStore
    const eventStore = ctx.eventStore

    if (enemyRef?.isGuardian) await warStore.addPoints(locId, 'guardian', true)
    else await warStore.addPoints(locId, isTr ? 'trainer_win' : 'wild_win', true)
    
    if (battleData.isCapture) await eventStore.submitCompetitionEntry(enemyRef, 'hourly_competition')
    
    if (battleData.isGym && battleData.gymId) {
      const gid = battleData.gymId
      if (!ctx.gs.state.defeatedGyms.includes(gid)) {
        ctx.gs.state.defeatedGyms.push(gid); ctx.gs.state.badges++
        if (ctx.activeBattle.value.rewardTM) { 
          ctx.gs.state.inventory[ctx.activeBattle.value.rewardTM] = (ctx.gs.state.inventory[ctx.activeBattle.value.rewardTM] || 0) + 1
          ctx.addLog(`¡Recibiste la ${ctx.activeBattle.value.rewardTM}!`, 'log-info', ctx.activeBattle.value.rewardTM) 
        }
        useUIStore().notify(`¡Ganaste la medalla del Gimnasio ${gid}!`, '🏆')
        await ctx.gs.save(false)
      }
    }
  }
  
  await ctx.gs.save(false)

  await ctx.waitForLogs()
  syncTeamHP(ctx)

  // Asegurar 1 segundo de "escenario vacío" tras el faint
  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.VOID_STATE)
  await new Promise(r => setTimeout(r, 1000))

  fsm.transition(BATTLE_STATES.POST_BATTLE_STABILIZATION)
  
  fsm.transition(BATTLE_STATES.POST_BATTLE_STABILIZATION, BATTLE_SUBSTATES.CHECK_TEAM)
  const firstHealthy = ctx.gs.state.team.find(p => p.hp > 0)
  const currentActive = ctx.player.value
  
  const needsReorder = firstHealthy && currentActive && firstHealthy.uid !== currentActive.uid
  
  if (needsReorder) {
    fsm.transition(BATTLE_STATES.POST_BATTLE_STABILIZATION, BATTLE_SUBSTATES.HAS_HEALTHY)
    fsm.transition(BATTLE_STATES.POST_BATTLE_STABILIZATION, BATTLE_SUBSTATES.REORDER_TEAM)
    if (currentActive.hp > 0) {
      gameBus.emit('PLAY_WITHDRAW', { side: 'player' })
      await new Promise(r => setTimeout(r, 800))
    }
    if (ctx.activeBattle.value) {
      ctx.activeBattle.value.player = firstHealthy
      ctx.activeBattle.value.playerTeamIndex = ctx.gs.state.team.findIndex(p => p.uid === firstHealthy.uid)
      gameBus.emit('PLAY_SEND_OUT', { side: 'player', pokemon: firstHealthy })
      await new Promise(r => setTimeout(r, 800))
    }
  }
  
  const persistenceMode = ctx.activeBattle.value?.persistenceMode || 'PERSISTENT'
  const isSingle = persistenceMode === 'SINGLE' || ctx.activeBattle.value?.isTrainer
  
  if (!isSingle) {
    await ctx.completeBattleFlow('search')
  } else {
    // Para combates únicos, nos quedamos en estabilización para mostrar botones de salida
    fsm.transition(BATTLE_STATES.POST_BATTLE_STABILIZATION, BATTLE_SUBSTATES.DEFEAT_WAIT)
  }
}

/**
 * Calculates and distributes XP and money rewards.
 */
export function calculateBattleRewards(ctx) {
  const e = ctx.activeBattle.value.enemy || ctx.activeBattle.value._initialEnemy
  if (!e) return

  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  
  const baseExp = calculateBaseExp(e)
  const warMods = getBattleRewardModifiers(ctx.activeBattle.value.locationId, ctx.gs.state.faction, ctx.warStore.mapDominance)
  const totalExpMult = warMods.expMult + ((ctx.eventStore.globalMultipliers?.exp || 1) - 1)
  const classMult = ctx.classStore.getModifier('expMult', { isTrainer: ctx.activeBattle.value.isTrainer })
  const participantsSet = new Set(ctx.activeBattle.value.participants)

  ctx.gs.state.team.forEach(p => {
    const reward = processExpGain(p, baseExp, participantsSet, {
      isActive: p.uid === ctx.activeBattle.value.player.uid,
      classMult,
      totalExpMult,
      participantsSet
    })
    if (!reward) return
    ctx.addLog(`${p.name} ganó ${reward.gained} EXP.`, 'log-player', p)
    
    if (reward.levelUp) {
      const audio = ctx.audio
      audio.levelUp()
      ctx.addLog(`¡${p.name} subió al nivel ${p.level}!`, 'log-info', p)
      
      fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.CHECK_PENDING)
      const pendingMoves = levelUpPokemon(p)
      
      if (pendingMoves && pendingMoves.length > 0) {
        fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.SHOW_CHOICE)
        p.pendingMoves = pendingMoves
      }
    }
  })

  const moneyGained = calculateMoneyGain(e, { 
    bcMult: ctx.classStore.getModifier('bcMult', { isGym: ctx.activeBattle.value.isGym }), 
    totalMoneyMult: warMods.moneyMult + ((ctx.eventStore.globalMultipliers?.money || 1) - 1) 
  })
  
  ctx.gs.state.money += moneyGained
  if (moneyGained > 0) ctx.audio.money()
  ctx.addLog(`¡Ganaste ₽${moneyGained}!`, 'log-info', 'player')
}

/**
 * Syncs team HP to GameStore.
 */
export function syncTeamHP(ctx) {
  if (!ctx.activeBattle.value) return;
  
  if (ctx.activeBattle.value.player) {
    const currentIdx = ctx.activeBattle.value.playerTeamIndex ?? ctx.gs.state.team.findIndex(p => p.uid === ctx.activeBattle.value.player.uid);
    if (currentIdx !== -1) {
      ctx.gs.state.team[currentIdx].hp = ctx.activeBattle.value.player.hp;
      ctx.gs.state.team[currentIdx].status = ctx.activeBattle.value.player.status;
    }
  }
}

/**
 * Persists battle state to GameStore.
 */
export function syncAndPersist(ctx) {
  if (!ctx.activeBattle.value || ctx.activeBattle.value.over) {
    ctx.gs.state.activeBattle = null
    return
  }
  ctx.gs.state.activeBattle = {
    ...ctx.activeBattle.value,
    playerStages: ctx.playerStages.value,
    enemyStages: ctx.enemyStages.value,
    battleLogs: ctx.battleLogs.value.slice(-10)
  }
  ctx.gs.save(false)
}
