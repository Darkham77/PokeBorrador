import { gsapSleep as sleep } from '@/logic/utils/gsapHelpers'
import { gameBus } from '@/logic/gameBus'
import { calculateBaseExp, processExpGain, calculateMoneyGain } from './battleRewards.ts'
import { getBattleRewardModifiers } from '@/logic/war/bonusEngine'
import { levelUpPokemon } from '@/logic/pokemonFactory'
import type { BattleContext } from '@/types/battleContext'
import type { Pokemon } from '@/types/pokemon'

/**
 * Handles the fainting of a Pokémon.
 */
export async function processFaint(ctx: BattleContext, side: 'player' | 'enemy') {
  const active = ctx.activeBattle.value;
  if (!active) return;

  const isPlayer = side === 'player'
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, isPlayer ? BATTLE_SUBSTATES.PLAYER_FAINT_SEQ : BATTLE_SUBSTATES.ENEMY_FAINT)
  
  if (ctx.faintedSides.value.has(side)) return
  ctx.faintedSides.value.add(side)
  
  const pokemon = isPlayer ? active.player : active.enemy
  const opponent = isPlayer ? active.enemy : active.player
  
  if (pokemon?.destinyBond && opponent && opponent.hp > 0) {
    ctx.addLog(`¡${pokemon.name} se llevó a ${opponent.name} con él!`, 'log-info', pokemon)
    opponent.hp = 0
    await sleep(500)
    await processFaint(ctx, isPlayer ? 'enemy' : 'player')
  }

  if (isPlayer && pokemon) {
    ctx.addLog(`¡${pokemon.name} se ha debilitado!`, 'log-player', pokemon)
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RECALL_FLOW)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL)
    gameBus.emit('PLAY_WITHDRAW', { side: 'player', isFaint: true })
    await sleep(800)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)
    active.player = null 
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CHECK_TEAM)
    const nextPoke = ctx.gs.state.team.find((p: Pokemon) => p.hp > 0)
    
    if (!nextPoke) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ALL_FAINTED)
      active.over = true
      ctx.addLog('¡No te quedan Pokémon sanos!', 'log-error', 'player')
      await sleep(1500)
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.DEFEAT_SCREEN)
      await terminateBattle(ctx, false)
    } else {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.HAS_HEALTHY)
      ctx.addLog('¡Elige a tu próximo Pokémon!', 'log-info', 'player')
      ctx.faintedSides.value.delete('player')
      ctx.uiStore.isBattleSwitchForced = true
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SWITCH_MENU)
    }
  } else if (pokemon) {
    const isTr = active.isTrainer || active.isGym
    const enemyName = isTr ? pokemon.name : `¡${pokemon.name} salvaje`
    ctx.addLog(`${enemyName} fue derrotado!`, 'log-enemy', pokemon)
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_DEFEAT)
    
    gameBus.emit('PLAY_SOUND', 'faint')
    gameBus.emit('PLAY_FAINT', { side: 'enemy' })
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ENEMY_FAINT)
    
    await sleep(1000)
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)
    active.enemy = null

    if (isTr && active.enemyTeam) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CLEANUP_MEMORY)
      
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CHECK_REMAINING)
      const nextEnemy = active.enemyTeam.find((p: Pokemon) => p.hp > 0)
      if (nextEnemy) {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.STABILIZE_STAGE)
        
        const s = ctx.enemyStages.value
        ctx.enemyStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, 
          reflect: s.reflect || 0, lightScreen: s.lightScreen || 0, safeguard: s.safeguard || 0, mist: s.mist || 0, spikes: s.spikes || 0 }
        
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.AI_NEXT_PICK)
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SELECT_COUNTER)
        
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL)
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.OCCUPY_SEAT)
        active.enemy = nextEnemy
        ctx.addLog(`¡Entrenador envía a ${nextEnemy.name}!`, 'log-enemy', 'enemy_trainer')
        gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: nextEnemy })
        await sleep(800)
        return
      }
    }
    
    if (active) {
      active.over = true;
      active.enemy = null;
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
  const active = ctx.activeBattle.value;

  if (!active) {
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    return
  }

  active.over = true
  ctx.faintedSides.value.clear()
  
  if (win && !fled) await calculateBattleRewards(ctx)
  
  syncAndPersist(ctx)

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT);
  if (active) active.enemy = null;
  if (active) active._initialEnemy = null;

  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.CHECK_OUTCOME)

  if (!win && !fled) {
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
    await sleep(1000)
    await ctx.gs.save(false)
    
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.ENTRY_CHECK)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.DEFEAT_SCREEN)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.DEFEAT_WAIT)
    return
  }

  if (fled) {
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.WAIT_LOG_QUEUE_ONLY)
    await ctx.waitForLogs()
    
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.ENTRY_CHECK)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.EXECUTE_CLEANUP)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.CLEAR_UI)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.TRIGGER_CLOSE)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.RESET_FLAGS)
    await ctx.completeBattleFlow('map')
    return
  }
  
  await ctx.gs.save(false)
  await ctx.waitForLogs()
  syncTeamHP(ctx)

  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
  await sleep(1000)

  const firstHealthy = ctx.gs.state.team.find((p: Pokemon) => p.hp > 0)
  const currentActive = active.player
  const needsReorder = firstHealthy && (!currentActive || firstHealthy.uid !== currentActive.uid)
  
  if (needsReorder) {
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.SWITCHING)
    if (currentActive && currentActive.hp > 0) {
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_RECALL)
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.RENDER_BALL)
      gameBus.emit('PLAY_WITHDRAW', { side: 'player' })
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.ENERGY_RECALL)
      await sleep(800)
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.VACATE_SEAT)
      active.player = null
    }

    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_CALL)
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.RENDER_BALL)
    
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.OCCUPY_SEAT)
    active.player = firstHealthy
    active.playerTeamIndex = ctx.gs.state.team.findIndex((p: Pokemon) => p.uid === firstHealthy.uid)

    gameBus.emit('PLAY_SEND_OUT', { side: 'player', pokemon: firstHealthy })
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.ENERGY_RELEASE)
    await sleep(800)
    
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_APPEAR)
    await sleep(400)
  }
  
  const persistenceMode = active.persistenceMode as string || 'PERSISTENT'
  const isSingle = persistenceMode === 'SINGLE' || active.isTrainer
  
  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.CHECK_PERSISTENCE)
  
  if (!isSingle) {
    await ctx.completeBattleFlow('search')
  } else {
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
  }
}

/**
 * Calculates and distributes XP and money rewards.
 */
export async function calculateBattleRewards(ctx: BattleContext) {
  const active = ctx.activeBattle.value;
  if (!active) return;
  const e = active.enemy || active._initialEnemy
  if (!e) return

  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  
  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.DISTRIBUTE_XP)
  
  const isTr = active.isTrainer || active.isGym
  const locId = active.locationId
  const enemyRef = e

  if (enemyRef?.isGuardian) await ctx.warStore.addPoints(locId, 'guardian', true)
  else await ctx.warStore.addPoints(locId, isTr ? 'trainer_win' : 'wild_win', true)
  
  if (active.isCapture) await ctx.eventStore.submitCompetitionEntry(enemyRef, 'hourly_competition')
  
  if (active.isGym && active.gymId) {
    const gid = active.gymId
    if (!ctx.gs.state.defeatedGyms.includes(gid)) {
      ctx.gs.state.defeatedGyms.push(gid); ctx.gs.state.badges++
      if (active.rewardTM) { 
        const tm = active.rewardTM
        ctx.gs.state.inventory[tm] = (ctx.gs.state.inventory[tm] || 0) + 1
        ctx.addLog(`¡Recibiste la ${tm}!`, 'log-info', tm) 
      }
      ctx.uiStore.notify(`¡Ganaste la medalla del Gimnasio ${gid}!`, '🏆')
      await ctx.gs.save(false)
    }
  }

  const baseExp = calculateBaseExp(e)
  const warMods = getBattleRewardModifiers(active.locationId, ctx.gs.state.faction, ctx.warStore.mapDominance)
  const totalExpMult = warMods.expMult + ((ctx.eventStore.globalMultipliers?.exp || 1) - 1)
  const classMult = ctx.classStore.getModifier('expMult', { isTrainer: active.isTrainer })
  const participantsSet = new Set(active.participants)

  for (const p of ctx.gs.state.team) {
    const reward = processExpGain(p, baseExp, participantsSet, {
      isActive: p.uid === active.player?.uid,
      classMult,
      totalExpMult,
      participantsSet
    })
    if (!reward) continue
    ctx.addLog(`${p.name} ganó ${reward.gained} EXP.`, 'log-player', p)
    
    if (reward.levelUp) {
      ctx.audio.levelUp()
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
    bcMult: ctx.classStore.getModifier('bcMult', { isGym: active.isGym }), 
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
  const active = ctx.activeBattle.value;
  if (!active) return;
  
  if (active.player) {
    const currentIdx = active.playerTeamIndex ?? ctx.gs.state.team.findIndex((p: Pokemon) => p.uid === active.player?.uid);
    if (currentIdx !== -1) {
      const teamPoke = ctx.gs.state.team[currentIdx];
      if (teamPoke) {
        teamPoke.hp = active.player.hp;
        teamPoke.status = active.player.status;
      }
    }
  }
}

/**
 * Persists battle state to GameStore.
 */
export function syncAndPersist(ctx: BattleContext) {
  const active = ctx.activeBattle.value;
  if (!active || active.over) {
    ctx.gs.state.activeBattle = null
    return
  }
  ctx.gs.state.activeBattle = {
    ...active,
    playerStages: ctx.playerStages.value,
    enemyStages: ctx.enemyStages.value,
    battleLogs: ctx.battleLogs.value.slice(-10)
  }
  ctx.gs.save(false)
}
