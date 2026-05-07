import { gameBus } from '@/logic/gameBus'
import { calculateBaseExp, processExpGain, calculateMoneyGain } from './battleRewards'
import { getBattleRewardModifiers } from '@/logic/war/bonusEngine'
import { levelUpPokemon } from '@/logic/pokemonFactory'
import { useUIStore } from '@/stores/ui'
import type { BattleContext } from '@/types/battleContext'
import type { Pokemon } from '@/types/pokemon'

/**
 * Handles the fainting of a Pokémon.
 */
export async function processFaint(ctx: BattleContext, side: 'player' | 'enemy') {
  const isPlayer = side === 'player'
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, isPlayer ? BATTLE_SUBSTATES.PLAYER_FAINT_SEQ : BATTLE_SUBSTATES.ENEMY_FAINT as any)
  
  if (ctx.faintedSides.value.has(side)) return
  ctx.faintedSides.value.add(side)
  
  const pokemon = isPlayer ? ctx.activeBattle.value?.player : ctx.activeBattle.value?.enemy
  const opponent = isPlayer ? ctx.activeBattle.value?.enemy : ctx.activeBattle.value?.player
  
  if (pokemon?.destinyBond && opponent && opponent.hp > 0) {
    ctx.addLog(`¡${pokemon.name} se llevó a ${opponent.name} con él!`, 'log-info', pokemon)
    opponent.hp = 0
    await new Promise(r => setTimeout(r, 500))
    await processFaint(ctx, isPlayer ? 'enemy' : 'player')
  }

  if (isPlayer && pokemon) {
    ctx.addLog(`¡${pokemon.name} se ha debilitado!`, 'log-player', pokemon)
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ as any)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RECALL_FLOW as any)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL as any)
    gameBus.emit('PLAY_WITHDRAW', { side: 'player', isFaint: true })
    await new Promise(r => setTimeout(r, 800))
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT as any)
    if (ctx.activeBattle.value) ctx.activeBattle.value.player = null 
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CHECK_TEAM as any)
    const nextPoke = ctx.gs.state.team.find((p: Pokemon) => p.hp > 0)
    
    if (!nextPoke) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ALL_FAINTED as any)
      if (ctx.activeBattle.value) ctx.activeBattle.value.over = true
      ctx.addLog('¡No te quedan Pokémon sanos!', 'log-error', 'player')
      await new Promise(r => setTimeout(r, 1500))
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.DEFEAT_SCREEN as any)
      await terminateBattle(ctx, false)
    } else {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.HAS_HEALTHY as any)
      ctx.addLog('¡Elige a tu próximo Pokémon!', 'log-info', 'player')
      ctx.faintedSides.value.delete('player')
      (useUIStore() as any).isBattleSwitchForced = true
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SWITCH_MENU as any)
    }
  } else if (pokemon) {
    const isTr = ctx.activeBattle.value?.isTrainer || ctx.activeBattle.value?.isGym
    const enemyName = isTr ? pokemon.name : `¡${pokemon.name} salvaje`
    ctx.addLog(`${enemyName} fue derrotado!`, 'log-enemy', pokemon)
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_DEFEAT as any)
    
    gameBus.emit('PLAY_SOUND', 'faint')
    gameBus.emit('PLAY_FAINT', { side: 'enemy' })
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ENEMY_FAINT as any)
    
    await new Promise(r => setTimeout(r, 1000))
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT as any)
    if (ctx.activeBattle.value) ctx.activeBattle.value.enemy = null

    if (isTr && ctx.activeBattle.value?.enemyTeam) {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ as any)
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CLEANUP_MEMORY as any)
      
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CHECK_REMAINING as any)
      const nextEnemy = ctx.activeBattle.value.enemyTeam.find((p: Pokemon) => p.hp > 0)
      if (nextEnemy) {
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.STABILIZE_STAGE as any)
        
        const s = ctx.enemyStages.value
        ctx.enemyStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, 
          reflect: s.reflect || 0, lightScreen: s.lightScreen || 0, safeguard: s.safeguard || 0, mist: s.mist || 0, spikes: s.spikes || 0 }
        
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.AI_NEXT_PICK as any)
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SELECT_COUNTER as any)
        
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL as any)
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.OCCUPY_SEAT as any)
        ctx.activeBattle.value.enemy = nextEnemy
        ctx.addLog(`¡Entrenador envía a ${nextEnemy.name}!`, 'log-enemy', 'enemy_trainer')
        gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: nextEnemy })
        await new Promise(r => setTimeout(r, 800))
        return
      }
    }
    
    if (ctx.activeBattle.value) {
      ctx.activeBattle.value.over = true 
      ctx.activeBattle.value.enemy = null
    }
    ctx.faintedSides.value.add('enemy')
    await terminateBattle(ctx, true)
  }
}

/**
 * Terminates the battle and processes results.
 */
export async function terminateBattle(ctx: BattleContext, win: boolean, fled = false) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  if (!ctx.activeBattle.value) {
    fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    return
  }

  ctx.activeBattle.value.over = true
  ctx.faintedSides.value.clear()
  
  if (win && !fled) await calculateBattleRewards(ctx)
  
  syncAndPersist(ctx)

  if (ctx.activeBattle.value) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT as any)
    ctx.activeBattle.value.enemy = null
    ctx.activeBattle.value._initialEnemy = null
  }

  fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.CHECK_OUTCOME as any)

  if (!win && !fled) {
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT as any)
    await new Promise(r => setTimeout(r, 1000))
    await ctx.gs.save(false)
    
    fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.ENTRY_CHECK as any)
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.DEFEAT_SCREEN as any)
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.DEFEAT_WAIT as any)
    return
  }

  if (fled) {
    fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.WAIT_LOG_QUEUE_ONLY as any)
    await ctx.waitForLogs()
    
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.ENTRY_CHECK as any)
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.EXECUTE_CLEANUP as any)
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.CLEAR_UI as any)
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.TRIGGER_CLOSE as any)
    fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.RESET_FLAGS as any)
    await ctx.completeBattleFlow('map')
    return
  }
  
  await ctx.gs.save(false)
  await ctx.waitForLogs()
  syncTeamHP(ctx)

  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT as any)
  await new Promise(r => setTimeout(r, 1000))

  const firstHealthy = ctx.gs.state.team.find((p: Pokemon) => p.hp > 0)
  const currentActive = ctx.activeBattle.value.player
  const needsReorder = firstHealthy && (!currentActive || firstHealthy.uid !== currentActive.uid)
  
  if (needsReorder) {
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.SWITCHING as any)
    if (currentActive && currentActive.hp > 0) {
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_RECALL as any)
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.RENDER_BALL as any)
      gameBus.emit('PLAY_WITHDRAW', { side: 'player' })
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.ENERGY_RECALL as any)
      await new Promise(r => setTimeout(r, 800))
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.VACATE_SEAT as any)
      if (ctx.activeBattle.value) ctx.activeBattle.value.player = null
    }

    if (ctx.activeBattle.value) {
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_CALL as any)
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.RENDER_BALL as any)
      
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.OCCUPY_SEAT as any)
      ctx.activeBattle.value.player = firstHealthy
      ctx.activeBattle.value.playerTeamIndex = ctx.gs.state.team.findIndex((p: Pokemon) => p.uid === firstHealthy.uid)

      gameBus.emit('PLAY_SEND_OUT', { side: 'player', pokemon: firstHealthy })
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.ENERGY_RELEASE as any)
      await new Promise(r => setTimeout(r, 800))
      
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_APPEAR as any)
      await new Promise(r => setTimeout(r, 400))
    }
  }
  
  const persistenceMode = ctx.activeBattle.value?.persistenceMode || 'PERSISTENT'
  const isSingle = persistenceMode === 'SINGLE' || ctx.activeBattle.value?.isTrainer
  
  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.CHECK_PERSISTENCE as any)
  
  if (!isSingle) {
    await ctx.completeBattleFlow('search')
  } else {
    fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT as any)
  }
}

/**
 * Calculates and distributes XP and money rewards.
 */
export async function calculateBattleRewards(ctx: BattleContext) {
  if (!ctx.activeBattle.value) return
  const e = ctx.activeBattle.value.enemy || ctx.activeBattle.value._initialEnemy
  if (!e) return

  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  
  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.DISTRIBUTE_XP as any)
  
  const isTr = ctx.activeBattle.value.isTrainer || ctx.activeBattle.value.isGym
  const locId = ctx.activeBattle.value.locationId
  const enemyRef = e

  if (enemyRef?.isGuardian) await ctx.warStore.addPoints(locId, 'guardian', true)
  else await ctx.warStore.addPoints(locId, isTr ? 'trainer_win' : 'wild_win', true)
  
  if (ctx.activeBattle.value.isCapture) await ctx.eventStore.submitCompetitionEntry(enemyRef as any, 'hourly_competition')
  
  if (ctx.activeBattle.value.isGym && ctx.activeBattle.value.gymId) {
    const gid = ctx.activeBattle.value.gymId
    if (!ctx.gs.state.defeatedGyms.includes(gid)) {
      ctx.gs.state.defeatedGyms.push(gid); ctx.gs.state.badges++
      if (ctx.activeBattle.value.rewardTM) { 
        const tm = ctx.activeBattle.value.rewardTM
        ctx.gs.state.inventory[tm] = (ctx.gs.state.inventory[tm] || 0) + 1
        ctx.addLog(`¡Recibiste la ${tm}!`, 'log-info', tm) 
      }
      (useUIStore() as any).notify(`¡Ganaste la medalla del Gimnasio ${gid}!`, '🏆')
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
      isActive: p.uid === ctx.activeBattle.value.player?.uid,
      classMult,
      totalExpMult,
      participantsSet
    })
    if (!reward) continue
    ctx.addLog(`${p.name} ganó ${reward.gained} EXP.`, 'log-player', p)
    
    if (reward.levelUp) {
      ctx.audio.levelUp()
      ctx.addLog(`¡${p.name} subió al nivel ${p.level}!`, 'log-info', p)
      
      await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.CHECK_PENDING as any)
      const pendingMoves = levelUpPokemon(p)
      
      if (pendingMoves && pendingMoves.length > 0) {
        await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.SHOW_CHOICE as any)
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
export function syncTeamHP(ctx: BattleContext) {
  if (!ctx.activeBattle.value) return;
  
  if (ctx.activeBattle.value.player) {
    const currentIdx = ctx.activeBattle.value.playerTeamIndex ?? ctx.gs.state.team.findIndex((p: Pokemon) => p.uid === ctx.activeBattle.value.player?.uid);
    if (currentIdx !== -1) {
      ctx.gs.state.team[currentIdx].hp = ctx.activeBattle.value.player.hp;
      ctx.gs.state.team[currentIdx].status = ctx.activeBattle.value.player.status;
    }
  }
}

/**
 * Persists battle state to GameStore.
 */
export function syncAndPersist(ctx: BattleContext) {
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

  ctx.gs.save(false)
}
