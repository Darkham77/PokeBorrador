import { gameBus } from '@/logic/gameBus'
import { calculateBaseExp, processExpGain, calculateMoneyGain } from './battleRewards'
import { getBattleRewardModifiers } from '@/logic/war/bonusEngine'
import { levelUpPokemon } from '@/logic/pokemonFactory'
import { useUIStore } from '@/stores/ui'

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
    await await setTimeout(500)
    await processFaint(ctx, isPlayer ? 'enemy' : 'player')
  }

  if (isPlayer) {
    ctx.addLog(`¡${pokemon.name} se ha debilitado!`, 'log-player', pokemon)
    
    // PLAYER_FAINT_SEQ (Manual 10. Player Faint Sequence)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
    
    // RECALL_FLOW (Manual 668)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RECALL_FLOW)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL)
    gameBus.emit('PLAY_WITHDRAW', { side: 'player', isFaint: true })
    await await setTimeout(800)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)
    ctx.activeBattle.value.player = null // Liberar asiento tras retiro
    
    // CHECK_TEAM (Manual 674)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CHECK_TEAM)
    const nextPoke = ctx.gs.state.team.find(p => p.hp > 0)
    
    if (!nextPoke) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ALL_FAINTED)
      ctx.activeBattle.value.over = true
      ctx.addLog('¡No te quedan Pokémon sanos!', 'log-error', 'player')
      // Esperar a que la animación de faint/retiro termine antes del fade out
      await await setTimeout(1500)
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.DEFEAT_SCREEN)
      await terminateBattle(ctx, false)
    } else {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.HAS_HEALTHY)
      ctx.addLog('¡Elige a tu próximo Pokémon!', 'log-info', 'player')
      ctx.faintedSides.value.delete('player')
      useUIStore().isBattleSwitchForced = true
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SWITCH_MENU)
    }
  } else {
    const isTr = ctx.activeBattle.value.isTrainer || ctx.activeBattle.value.isGym
    const enemyName = isTr ? pokemon.name : `¡${pokemon.name} salvaje`
    ctx.addLog(`${enemyName} fue derrotado!`, 'log-enemy', pokemon)
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_DEFEAT)
    
    // Secuencia de Salto + Faint (ahora bajo PLAY_ENEMY_FAINT según manual)
    gameBus.emit('PLAY_SOUND', 'faint')
    gameBus.emit('PLAY_FAINT', { side: 'enemy' })
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ENEMY_FAINT)
    
    // Espera proporcional a la animación (1.0s según manual)
    await await setTimeout(1000)
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)
    ctx.activeBattle.value.enemy = null

    if (isTr && ctx.activeBattle.value.enemyTeam) {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CLEANUP_MEMORY)
      
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CHECK_REMAINING)
      const nextEnemy = ctx.activeBattle.value.enemyTeam.find(p => p.hp > 0)
      if (nextEnemy) {
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.STABILIZE_STAGE)
        
        const s = ctx.enemyStages.value
        ctx.enemyStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, 
          reflect: s.reflect || 0, lightScreen: s.lightScreen || 0, safeguard: s.safeguard || 0, mist: s.mist || 0, spikes: s.spikes || 0 }
        
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.AI_NEXT_PICK)
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SELECT_COUNTER)
        
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL)
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.OCCUPY_SEAT)
        ctx.activeBattle.value.enemy = nextEnemy
        ctx.addLog(`¡Entrenador envía a ${nextEnemy.name}!`, 'log-enemy', 'enemy_trainer')
        gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: nextEnemy })
        await await setTimeout(800)
        return
      }
    }
    
    ctx.activeBattle.value.over = true 
    ctx.activeBattle.value.enemy = null
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
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)
    ctx.activeBattle.value.enemy = null
    ctx.activeBattle.value._initialEnemy = null
  }

  fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.CHECK_OUTCOME)

  if (!win && !fled) {
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
    await await setTimeout(1000)
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
    await calculateBattleRewards(ctx)
  }
  
  await ctx.gs.save(false)
  await ctx.waitForLogs()
  syncTeamHP(ctx)

  // Asegurar 1 segundo de "escenario vacío" tras el faint
  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
  await await setTimeout(1000)

  // REORDER_TEAM (Manual 7. Reorder Team / Switch)
  // Siempre intentamos sincronizar al primer miembro sano al final del combate
  const firstHealthy = ctx.gs.state.team.find(p => p.hp > 0)
  const currentActive = ctx.player.value
  const needsReorder = firstHealthy && (!currentActive || firstHealthy.uid !== currentActive.uid)
  
  if (needsReorder) {
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.SWITCHING)
    if (currentActive && currentActive.hp > 0) {
      // RECALL_FLOW
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_RECALL)
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.RENDER_BALL)
      gameBus.emit('PLAY_WITHDRAW', { side: 'player' })
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.ENERGY_RECALL)
      await await setTimeout(800)
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.VACATE_SEAT)
      ctx.activeBattle.value.player = null
    }

    if (ctx.activeBattle.value) {
      // CALL_FLOW
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_CALL)
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.RENDER_BALL)
      
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.OCCUPY_SEAT)
      ctx.activeBattle.value.player = firstHealthy
      ctx.activeBattle.value.playerTeamIndex = ctx.gs.state.team.findIndex(p => p.uid === firstHealthy.uid)

      gameBus.emit('PLAY_SEND_OUT', { side: 'player', pokemon: firstHealthy })
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.ENERGY_RELEASE)
      await await setTimeout(800)
      
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_APPEAR)
      await await setTimeout(400)
    }
  }
  
  const persistenceMode = ctx.activeBattle.value?.persistenceMode || 'PERSISTENT'
  const isSingle = persistenceMode === 'SINGLE' || ctx.activeBattle.value?.isTrainer
  
  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.CHECK_PERSISTENCE)
  
  if (!isSingle) {
    await ctx.completeBattleFlow('search')
  } else {
    // Para combates únicos, nos quedamos en REWARDS_PHASE con sub-estado final para mostrar botones
    fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
  }
}

/**
 * Calculates and distributes XP and money rewards.
 */
export async function calculateBattleRewards(ctx) {
  const e = ctx.activeBattle.value.enemy || ctx.activeBattle.value._initialEnemy
  if (!e) return

  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  
  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.DISTRIBUTE_XP)
  
  const isTr = ctx.activeBattle.value.isTrainer || ctx.activeBattle.value.isGym
  const locId = ctx.activeBattle.value.locationId
  const enemyRef = e

  if (enemyRef?.isGuardian) await ctx.warStore.addPoints(locId, 'guardian', true)
  else await ctx.warStore.addPoints(locId, isTr ? 'trainer_win' : 'wild_win', true)
  
  if (ctx.activeBattle.value.isCapture) await ctx.eventStore.submitCompetitionEntry(enemyRef, 'hourly_competition')
  
  if (ctx.activeBattle.value.isGym && ctx.activeBattle.value.gymId) {
    const gid = ctx.activeBattle.value.gymId
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

  const baseExp = calculateBaseExp(e)
  const warMods = getBattleRewardModifiers(ctx.activeBattle.value.locationId, ctx.gs.state.faction, ctx.warStore.mapDominance)
  const totalExpMult = warMods.expMult + ((ctx.eventStore.globalMultipliers?.exp || 1) - 1)
  const classMult = ctx.classStore.getModifier('expMult', { isTrainer: ctx.activeBattle.value.isTrainer })
  const participantsSet = new Set(ctx.activeBattle.value.participants)

  for (const p of ctx.gs.state.team) {
    const reward = processExpGain(p, baseExp, participantsSet, {
      isActive: p.uid === ctx.activeBattle.value.player.uid,
      classMult,
      totalExpMult,
      participantsSet
    })
    if (!reward) continue
    ctx.addLog(`${p.name} ganó ${reward.gained} EXP.`, 'log-player', p)
    
    if (reward.levelUp) {
      const audio = ctx.audio
      audio.levelUp()
      ctx.addLog(`¡${p.name} subió al nivel ${p.level}!`, 'log-info', p)
      
      await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.CHECK_PENDING)
      const pendingMoves = levelUpPokemon(p)
      
      if (pendingMoves && pendingMoves.length > 0) {
        await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.SHOW_CHOICE)
        p.pendingMoves = pendingMoves
      }
    }
  }

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
