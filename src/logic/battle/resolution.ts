// fallow-ignore-file circular-dependencies
// [PureVue-Ignore-Length]
import { gsapSleep as sleep } from '@/logic/utils/gsapHelpers'
import { gameBus } from '@/logic/gameBus'
import { calculateBaseExp, processExpGain, calculateMoneyGain } from './battleRewards.ts'
import { getBattleRewardModifiers } from '@/logic/war/bonusEngine'
import { levelUpPokemon } from '@/logic/pokemonFactory'
import type { BattleContext } from '@/types/battleContext'
import type { Pokemon, PokemonMove } from '@/types/pokemon'
import type { BattleState } from '@/types/battle.ts'
import { useBreedingStore } from '@/stores/breeding'
import { useUIStore } from '@/stores/ui'

function registerRewardCombatant(active: BattleState) {
  if (!active) return
  if (!active._rewardCombatants) {
    active._rewardCombatants = []
  }
  const e = active.enemy || active._initialEnemy
  if (e && !active._rewardCombatants.some((p: Pokemon) => p.uid === e.uid)) {
    active._rewardCombatants.push(e)
  }
}

/**
 * Handles the fainting of a Pokémon.
 */
export async function processFaint(ctx: BattleContext, side: 'player' | 'enemy') {
  const active = ctx.activeBattle.value;
  if (!active || active.over || ['SEARCH_PHASE', 'REWARDS_PHASE'].includes(ctx.fsm.currentState.value)) return;

  const isPlayer = side === 'player'
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, isPlayer ? BATTLE_SUBSTATES.PLAYER_FAINT_SEQ : BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
  
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
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RENDER_BALL)
    if (ctx.animations?.handleFaintAnim) {
      await ctx.animations.handleFaintAnim({ side: 'player', isFaint: true })
    } else {
      await sleep(1300)
    }
    
    // Sincronizamos antes de vaciar el asiento para no perder la referencia
    syncTeamHP(ctx)
    if (active) active._lastActivePlayer = pokemon; // Guardamos referencia por si acaso
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.FADEOUT_BALL)
    if (ctx.animations?.playBallFadeOut) {
      await ctx.animations.playBallFadeOut('player')
    }
    active.player = null 
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CHECK_TEAM)
    const nextPoke = ctx.gs.state.team.find((p: Pokemon) => p && p.hp > 0)
    
    if (!nextPoke) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ALL_FAINTED)
      active.over = true
      ctx.addLog('¡No te quedan Pokémon sanos!', 'log-error', 'player')
      await sleep(1500)
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.DEFEAT_SCREEN)
      await terminateBattle(ctx, false)
    } else {
      const isWild = !active.isTrainer && !active.isGym && !active.isPvP
      const enemyHasHealthy = active.enemyTeam && active.enemyTeam.some((p: Pokemon) => p.hp > 0)
      const enemyFaintedAndBattleEnds = active.enemy && active.enemy.hp <= 0 && (isWild || !enemyHasHealthy)

      if (enemyFaintedAndBattleEnds) {
        ctx.faintedSides.value.delete('player')
        // En Double KO no forzamos cambio ni abrimos menú de cambio, ya que la batalla termina y terminateBattle reordenará el equipo
      } else {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.HAS_HEALTHY)
        ctx.addLog('¡Elige a tu próximo Pokémon!', 'log-info', 'player')
        ctx.faintedSides.value.delete('player')
        ctx.uiStore.isBattleSwitchForced = true
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SWITCH_MENU)
      }
    }
  } else if (pokemon) {
    const isTr = active.isTrainer || active.isGym || active.isPvP
    const enemyName = isTr ? pokemon.name : `¡${pokemon.name} salvaje`
    ctx.addLog(`${enemyName} fue derrotado!`, 'log-enemy', pokemon)
    
    // ENEMY_REPLACEMENT_SEQ Starts
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.TYPE_CHECK)

    if (!isTr) {
      // isWild: Defeat animation
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_DEFEAT)
      if (ctx.animations?.handleFaintAnim) {
        await ctx.animations.handleFaintAnim({ side: 'enemy' })
      } else {
        await sleep(1300)
      }
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ENEMY_FAINT)
    } else {
      // isTrainer / isNpc: Recall animation
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL)
      if (ctx.animations?.handleCatchRequest) {
        await ctx.animations.handleCatchRequest({ side: 'enemy', pokemon })
      } else {
        gameBus.emit('PLAY_WITHDRAW', { side: 'enemy' })
        await sleep(800)
      }
    }

    // CLEANUP_MEMORY
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CLEANUP_MEMORY)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)
    if (active) {
      registerRewardCombatant(active)
      syncTeamHP(ctx)
      if (isTr && ctx.animations?.playBallFadeOut) {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.FADEOUT_BALL)
        await ctx.animations.playBallFadeOut('enemy')
      }
      active.enemy = null
      if (!isTr || !active.enemyTeam || !active.enemyTeam.some(p => p.hp > 0)) {
        active._initialEnemy = null
      }
    }

    // CHECK_REMAINING
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CHECK_REMAINING)
    const nextEnemy = isTr && active.enemyTeam ? active.enemyTeam.find((p: Pokemon) => p.hp > 0) : null

    if (nextEnemy) {
      // STABILIZE_STAGE
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.STABILIZE_STAGE)
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EMPTY_WAIT)
      await sleep(200) // organic sleep
      
      const s = ctx.enemyStages.value
      ctx.enemyStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, 
        reflect: s.reflect || 0, lightScreen: s.lightScreen || 0, safeguard: s.safeguard || 0, mist: s.mist || 0, spikes: s.spikes || 0 }
      
      // AI_NEXT_PICK
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.AI_NEXT_PICK)
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SELECT_COUNTER)
      
      // NEXT_PICK_TYPE -> POKEMON_CALL
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.NEXT_PICK_TYPE)
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL)
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.OCCUPY_SEAT)
      
      active.enemy = nextEnemy
      ctx.faintedSides.value.delete('enemy')
      ctx.addLog(`¡Entrenador envía a ${nextEnemy.name}!`, 'log-enemy', 'enemy_trainer')
      
      if (ctx.animations?.handleReleaseRequest) {
        await ctx.animations.handleReleaseRequest({ side: 'enemy', pokemon: nextEnemy })
      } else {
        gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: nextEnemy })
      }
      return
    }

    // No remaining / isWild -> End battle
    if (active) {
      active.over = true;
      registerRewardCombatant(active)
      active.enemy = null;
      active._initialEnemy = null;
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
  
  const uiStore = useUIStore()
  uiStore.isBattleSwitchForced = false
  
  const persistenceMode = active.persistenceMode as string || 'PERSISTENT'
  const isSingle = persistenceMode === 'SINGLE' || active.isGym || active.isPvP

  syncAndPersist(ctx)

  // 1. Ejecutamos animaciones de salida en paralelo para el jugador y el enemigo si siguen activos
  if (fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE) {
    const playerExited = !isSingle
      ? Promise.resolve() // En combate persistente de búsqueda el jugador NO se retira del escenario
      : (active.player && active.player.hp > 0 && !fled && ctx.animations?.handleFaintAnim
        ? ctx.animations.handleFaintAnim({ side: 'player', pokemon: active.player })
        : Promise.resolve())

    let enemyExited: Promise<void> = Promise.resolve()
    if (active.enemy && active.enemy.hp > 0 && !fled && !active.isCapture) {
      if (win) {
        enemyExited = Promise.resolve()
      } else {
        const isTr = active.isTrainer || active.isGym || active.isPvP
        if (isTr) {
          enemyExited = ctx.animations?.handleCatchRequest
            ? ctx.animations.handleCatchRequest({ side: 'enemy', pokemon: active.enemy })
            : Promise.resolve()
        } else {
          gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'enemy', type: 'flee' })
          enemyExited = sleep(1000)
        }
      }
    }

    await Promise.all([playerExited, enemyExited])
  }

  // 2. Desvanecer la Poké Ball y vaciar el asiento del enemigo bajo ACTIVE_BATTLE
  if (fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.FADEOUT_BALL)
    if (active.isCapture && ctx.animations?.playBallFadeOut) {
      await ctx.animations.playBallFadeOut('enemy')
    }
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)
    if (active) {
      registerRewardCombatant(active)
      active.enemy = null
      active._initialEnemy = null
    }
  } else {
    if (active) {
      registerRewardCombatant(active)
      active.enemy = null
      active._initialEnemy = null
    }
  }

  // 3. Procesar recompensas (Transición a REWARDS_PHASE)
  if (win && !fled && !active.rewardsProcessed) {
    active.rewardsProcessed = true
    const isWild = !active.isTrainer && !active.isGym && !active.isPvP
    if (!isWild) {
      ctx.audio.victoryTrainer()
    }
    await calculateBattleRewards(ctx)
    try {
      const breedingStore = useBreedingStore()
      if (active.isGym) {
        breedingStore.reduceHatchTimers('gym')
      } else if (active.isCapture) {
        breedingStore.reduceHatchTimers('capture')
      } else {
        breedingStore.reduceHatchTimers('battle')
      }
    } catch (e) {
      console.error('Failed to reduce hatch timers:', e)
    }
  }

  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.CHECK_OUTCOME)

  if (!win && !fled) {
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
    await sleep(200)
    await ctx.gs.save(false)
    
    ctx.audio.defeat()
    
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.ENTRY_CHECK)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.DEFEAT_SCREEN)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.DEFEAT_WAIT)
    return
  }

  if (fled) {
    if (active) active._initialEnemy = null
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.WAIT_LOG_QUEUE_ONLY)
    await ctx.waitForLogs()
    
    const playerFled = active.playerFled || false
    if (isSingle || playerFled) {
      await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.ENTRY_CHECK)
      await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.EXECUTE_CLEANUP)
      await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.CLEAR_UI)
      await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.TRIGGER_CLOSE)
      await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.RESET_FLAGS)
      await ctx.completeBattleFlow('map')
    } else {
      await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
      await sleep(200)
      await ctx.completeBattleFlow('search')
    }
    return
  }
  
  await ctx.gs.save(false)
  await ctx.waitForLogs()
  
  // Esperar a que el jugador termine de aprender técnicas en el modal
  while (uiStore.learnQueue.length > 0 || uiStore.currentMoveToLearn) {
    await sleep(100)
  }
  
  syncTeamHP(ctx)

  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
  await sleep(200) // Pausa de limpieza orgánica reducida a 200ms

  // Reordenamiento animado: recall del incorrecto + release del correcto en paralelo
  const firstHealthy = ctx.gs.state.team.find((p: Pokemon) => p && p.hp > 0)
  const oldPlayer = active.player
  const needsSwap = firstHealthy && (!oldPlayer || oldPlayer.uid !== firstHealthy.uid)

  if (needsSwap && firstHealthy) {
    // Set exitingPlayer so BattleArenaView renders both combatants simultaneously
    if (oldPlayer && oldPlayer.hp > 0) ctx.exitingPlayer.value = oldPlayer
    active.player = firstHealthy
    active.playerTeamIndex = ctx.gs.state.team.findIndex((p: Pokemon) => p.uid === firstHealthy.uid)

    const withdrawPromise = oldPlayer && oldPlayer.hp > 0 && ctx.animations?.handleCatchRequest
      ? ctx.animations.handleCatchRequest({ side: 'player', pokemon: oldPlayer })
      : Promise.resolve()

    const sendOutPromise = ctx.animations?.handleReleaseRequest
      ? ctx.animations.handleReleaseRequest({ side: 'player', pokemon: firstHealthy })
      : Promise.resolve()

    await Promise.all([withdrawPromise, sendOutPromise])
    ctx.exitingPlayer.value = null
  } else if (firstHealthy && !oldPlayer) {
    // No old player (first battle start) — just the release animation
    active.player = firstHealthy
    active.playerTeamIndex = ctx.gs.state.team.findIndex((p: Pokemon) => p.uid === firstHealthy.uid)
    if (ctx.animations?.handleReleaseRequest) {
      await ctx.animations.handleReleaseRequest({ side: 'player', pokemon: firstHealthy })
    }
  }

  if (active) active._initialEnemy = null

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
async function calculateBattleRewards(ctx: BattleContext) {
  const active = ctx.activeBattle.value;
  if (!active) return;

  const combatants = active._rewardCombatants && active._rewardCombatants.length > 0 
    ? active._rewardCombatants 
    : (active.enemy || active._initialEnemy ? [active.enemy || active._initialEnemy] : []).filter(Boolean) as Pokemon[]
  
  if (combatants.length === 0) return;

  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  
  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.DISTRIBUTE_XP)
  
  const isTr = active.isTrainer || active.isGym || active.isPvP
  const locId = active.locationId

  // Update statistics
  if (!ctx.gs.state.stats) {
    ctx.gs.state.stats = {}
  }
  if (isTr) {
    ctx.gs.state.stats.trainersDefeated = (Number(ctx.gs.state.stats.trainersDefeated) || 0) + 1
  } else {
    ctx.gs.state.stats.wins = (Number(ctx.gs.state.stats.wins) || 0) + 1
  }

  // Faction points using the primary opponent
  const primaryEnemy = combatants[0]
  if (primaryEnemy?.isGuardian) await ctx.warStore.addPoints(locId, 'guardian', true)
  else await ctx.warStore.addPoints(locId, isTr ? 'trainer_win' : 'wild_win', true)
  
  if (active.isGym && active.gymId) {
    const gid = active.gymId
    const diff = active.difficulty || 'easy'
    
    // Registrar victoria global (Medalla)
    if (!ctx.gs.state.defeatedGyms.includes(gid)) {
      ctx.gs.state.defeatedGyms.push(gid); ctx.gs.state.badges++
      if (active.rewardTM) { 
        const tm = active.rewardTM
        ctx.gs.state.inventory[tm] = (ctx.gs.state.inventory[tm] || 0) + 1
        ctx.addLog(`¡Recibiste la ${tm}!`, 'log-info', tm) 
      }
      ctx.uiStore.notify(`¡Ganaste la medalla del Gimnasio ${gid}!`, '🏆')
    }

    // Registrar progreso específico por dificultad
    if (!ctx.gs.state.gymProgress[gid]) {
      ctx.gs.state.gymProgress[gid] = { easy: false, normal: false, hard: false, attempts: 0 }
    }
    const prog = ctx.gs.state.gymProgress[gid]
    if (prog) {
      const key = diff as 'easy' | 'normal' | 'hard'
      if (!prog[key]) {
        prog[key] = true
        ctx.addLog(`¡Superaste el gimnasio en dificultad ${diff.toUpperCase()}!`, 'log-success', '🏆')
        
        // Award Gym Difficulty-Specific rewards dynamically
        import('@/stores/gyms').then(({ useGymsStore }) => {
          const gymsStore = useGymsStore()
          const gym = gymsStore.gyms.find(g => g.id === gid)
          if (gym && gym.difficulties) {
            const diffData = gym.difficulties[key]
            if (diffData && diffData.levels) {
              const avgLevel = diffData.levels.reduce((a, b) => a + b, 0) / diffData.levels.length
              
              const mults: Record<string, number> = { easy: 1, normal: 2.2, hard: 4.5 }
              const mult = mults[key] || 1
              
              const expReward = Math.floor(avgLevel * 180 * mult)
              const moneyReward = Math.floor(avgLevel * 30 * mult)
              const tmReward = gym.rewardTM

              // 1. Award Money
              ctx.gs.state.money += moneyReward
              ctx.addLog(`¡Bono de Gimnasio: Recibiste ₽${moneyReward}!`, 'log-success', 'player')
              ctx.uiStore.notify(`¡Obtuviste ₽${moneyReward}!`, '💰')

              // 2. Award TM
              if (tmReward) {
                ctx.gs.state.inventory[tmReward] = (ctx.gs.state.inventory[tmReward] || 0) + 1
                ctx.addLog(`¡Bono de Gimnasio: Recibiste la ${tmReward}!`, 'log-success', tmReward)
                ctx.uiStore.notify(`¡Obtuviste ${tmReward}!`, '🎒')
              }

              // 3. Award EXP (distributed)
              const team = ctx.gs.state.team || []
              if (team.length > 0) {
                const expPerPoke = Math.floor(expReward / team.length)
                import('@/logic/pokemonFactory').then(({ getExpNeeded, levelUpPokemon }) => {
                  for (const p of team) {
                    if (p.level >= 100) continue
                    p.exp += expPerPoke
                    
                    let leveledUp = false
                    let tempLevel = p.level
                    let tempExpNeeded = p.expNeeded || getExpNeeded(tempLevel)
                    
                    while (p.exp >= tempExpNeeded && tempLevel < 100) {
                      p.exp -= tempExpNeeded
                      leveledUp = true
                      tempLevel++
                      tempExpNeeded = getExpNeeded(tempLevel)
                    }
                    
                    if (leveledUp) {
                      const diffLevels = tempLevel - p.level
                      p.level = tempLevel
                      p.expNeeded = tempLevel >= 100 ? Infinity : tempExpNeeded
                      for (let i = 0; i < diffLevels; i++) {
                        levelUpPokemon(p)
                      }
                      ctx.addLog(`¡Bono de Gimnasio: ${p.name} subió al nivel ${p.level}!`, 'log-success', p)
                    }
                    ctx.addLog(`¡Bono de Gimnasio: ${p.name} ganó ${expPerPoke} EXP!`, 'log-success', p)
                  }
                })
                ctx.uiStore.notify(`¡Tu equipo ganó ${expReward} EXP de bono!`, '✨')
              }
            }
          }
        })
      }
      prog.attempts++
    }
    
    await ctx.gs.save(false)
  }

  const warMods = getBattleRewardModifiers(active.locationId, ctx.gs.state.faction, ctx.warStore.mapDominance)
  const totalExpMult = warMods.expMult + ((ctx.eventStore.globalMultipliers?.exp || 1) - 1)
  const classMult = ctx.classStore.getModifier('expMult', { isTrainer: active.isTrainer })
  const participantsSet = new Set(active.participants)

  const expGainedMap = new Map<string, number>()
  const levelUpMap = new Map<string, { levelsGained: number; moves: PokemonMove[] }>()
  let totalMoneyGained = 0
  let totalCoinsGained = 0

  const isGymRematch = active.isGym && active.gymId && ctx.gs.state.defeatedGyms.includes(active.gymId)

  for (const e of combatants) {
    if (active.isCapture) await ctx.eventStore.submitCompetitionEntry(e, 'hourly_competition')

    const baseExp = calculateBaseExp(e)
    for (const p of ctx.gs.state.team) {
      const reward = processExpGain(p, baseExp, participantsSet, {
        isActive: p.uid === active.player?.uid,
        classMult,
        totalExpMult,
        participantsSet
      })
      if (!reward) continue
      
      expGainedMap.set(p.uid, (expGainedMap.get(p.uid) || 0) + reward.gained)
      
      if (reward.levelUp) {
        if (!levelUpMap.has(p.uid)) {
          levelUpMap.set(p.uid, { levelsGained: 0, moves: [] })
        }
        const lvlData = levelUpMap.get(p.uid)!
        lvlData.levelsGained += reward.levelsGained
        
        for (let i = 0; i < reward.levelsGained; i++) {
          const pendingMoves = levelUpPokemon(p)
          if (pendingMoves) {
            lvlData.moves.push(...pendingMoves)
          }
        }
      }
    }

    const moneyGained = calculateMoneyGain(e, { 
      bcMult: ctx.classStore.getModifier('bcMult', { isGym: active.isGym }), 
      totalMoneyMult: warMods.moneyMult + ((ctx.eventStore.globalMultipliers?.money || 1) - 1),
      isTrainer: active.isTrainer,
      isGym: active.isGym
    })
    
    totalMoneyGained += moneyGained

    if ((active.isTrainer || active.isGym) && !isGymRematch) {
      let coins = Math.floor(e.level * 2)
      const bcMult = ctx.classStore.getModifier('bcMult', { isGym: active.isGym })
      coins = Math.floor(coins * bcMult)
      const eventMult = ctx.eventStore.globalMultipliers?.bc || 1
      coins = Math.floor(coins * eventMult)
      totalCoinsGained += coins
    }
  }

  // Award consolidated rewards
  ctx.gs.state.money += totalMoneyGained
  ctx.addLog(`¡Ganaste ₽${totalMoneyGained} en total!`, 'log-info', 'player')

  if (totalCoinsGained > 0) {
    ctx.gs.state.battleCoins = (ctx.gs.state.battleCoins || 0) + totalCoinsGained
    ctx.addLog(`¡Obtuviste ${totalCoinsGained} Battle Coins en total!`, 'log-info', 'player')
  }

  // Print consolidated EXP and trigger Level Ups
  for (const p of ctx.gs.state.team) {
    const gained = expGainedMap.get(p.uid) || 0
    if (gained > 0) {
      ctx.addLog(`${p.name} ganó ${gained} EXP.`, 'log-player', p)
    }

    const lvlData = levelUpMap.get(p.uid)
    if (lvlData) {
      await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.CHECK_PENDING)
      ctx.addLog(`¡${p.name} subió al nivel ${p.level}!`, 'log-info', p)

      if (lvlData.moves.length > 0) {
        await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.SHOW_CHOICE)
        p.pendingMoves = lvlData.moves
        
        const uiStore = useUIStore()
        uiStore.addToLearnQueue(lvlData.moves.map(m => ({ pokemon: p, move: m })))
      }

      // Sincronizar evolución por nivel
      if (p.heldItem === 'everstone') {
        ctx.addLog(`${p.name} evitó evolucionar debido a la Piedra Eterna.`, 'log-info', p)
      } else {
        const { checkLevelUpEvolution } = await import('../evolutionLogic.ts')
        const targetId = checkLevelUpEvolution(p)
        if (targetId) {
          const uiStore = useUIStore()
          uiStore.startEvolution(p, targetId, '')
          // Esperar síncronamente mientras el modal de evolución esté abierto
          while (uiStore.isEvolutionOpen) {
            await sleep(100)
          }
        }
      }
    }
  }


  if (active.player) {
    const teamPoke = ctx.gs.state.team.find((tp: Pokemon) => tp && tp.uid === active.player?.uid)
    if (teamPoke) {
      active.player.level = teamPoke.level
      active.player.exp = teamPoke.exp
      active.player.expNeeded = teamPoke.expNeeded
      active.player.maxHp = teamPoke.maxHp
      active.player.hp = teamPoke.hp
      active.player.atk = teamPoke.atk
      active.player.def = teamPoke.def
      active.player.spa = teamPoke.spa
      active.player.spd = teamPoke.spd
      active.player.spe = teamPoke.spe
      active.player.moves = teamPoke.moves ? teamPoke.moves.map(m => m ? ({ ...m }) : null) : []
    }
  }
  // fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
}

/**
 * Syncs team HP to GameStore.
 */
function syncTeamHP(ctx: BattleContext) {
  const active = ctx.activeBattle.value;
  if (!active) return;
  
  // Si tenemos un pokemon activo, lo sincronizamos.
  if (active.player) {
    const currentIdx = active.playerTeamIndex ?? ctx.gs.state.team.findIndex((p: Pokemon) => p && p.uid === active.player?.uid);
    if (currentIdx !== -1) {
      const teamPoke = ctx.gs.state.team[currentIdx];
      if (teamPoke) {
        teamPoke.hp = active.player.hp;
        teamPoke.status = active.player.status;
      }
    }
  } else if (active._lastActivePlayer) {
    // Si el asiento está vacío, intentamos sincronizar el último que estuvo (fainted)
    const last = active._lastActivePlayer as Pokemon;
    const currentIdx = ctx.gs.state.team.findIndex((p: Pokemon) => p && p.uid === last.uid);
    if (currentIdx !== -1) {
      const teamPoke = ctx.gs.state.team[currentIdx];
      if (teamPoke) {
        teamPoke.hp = last.hp;
        teamPoke.status = last.status;
      }
    }
  }

  // Sincronizar el HP/estado del enemigo activo con su equipo (Entrenador/Gimnasio/PvP)
  if (active.isTrainer || active.isGym || active.isPvP) {
    if (active.enemy && active.enemyTeam) {
      const enemyIdx = active.enemyTeam.findIndex((p: Pokemon) => p && p.uid === active.enemy?.uid);
      if (enemyIdx !== -1) {
        const teamPoke = active.enemyTeam[enemyIdx];
        if (teamPoke) {
          teamPoke.hp = active.enemy.hp;
          teamPoke.status = active.enemy.status;
        }
      }
      // Reasignar el array para forzar reactividad en el computed de Vue
      active.enemyTeam = [...active.enemyTeam];
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

/**
 * Simulates a standard experience reward in battle for testing purposes.
 */
export async function awardDebugExp(ctx: BattleContext) {
  const active = ctx.activeBattle.value
  if (!active || !active.player) return

  const p = active.player
  const teamPoke = ctx.gs.state.team.find((tp: Pokemon) => tp && tp.uid === p.uid)
  if (!teamPoke) return

  const needed = teamPoke.expNeeded - teamPoke.exp
  if (needed <= 0) return

  ctx.addLog(`DEBUG: Añadiendo ${needed} EXP para subir de nivel...`, 'log-info', p)

  const participantsSet = new Set([p.uid])
  const reward = processExpGain(teamPoke, needed, participantsSet, {
    isActive: true,
    classMult: 1,
    totalExpMult: 1,
    participantsSet
  })

  if (reward) {
    ctx.addLog(`${teamPoke.name} ganó ${reward.gained} EXP.`, 'log-player', teamPoke)
    
    if (reward.levelUp) {
      const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
      const fsm = ctx.fsm
      const prevState = fsm.currentState.value
      const prevSubState = fsm.currentSubState.value

      await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.CHECK_PENDING)
      
      const allPendingMoves: PokemonMove[] = []
      for (let i = 0; i < reward.levelsGained; i++) {
        const pendingMoves = levelUpPokemon(teamPoke)
        if (pendingMoves) {
          allPendingMoves.push(...pendingMoves)
        }
      }
      
      ctx.addLog(`¡${teamPoke.name} subió al nivel ${teamPoke.level}!`, 'log-info', teamPoke)

      // Sync active player copy stats
      p.level = teamPoke.level
      p.exp = teamPoke.exp
      p.expNeeded = teamPoke.expNeeded
      p.maxHp = teamPoke.maxHp
      p.hp = teamPoke.hp
      p.atk = teamPoke.atk
      p.def = teamPoke.def
      p.spa = teamPoke.spa
      p.spd = teamPoke.spd
      p.spe = teamPoke.spe
      p.moves = teamPoke.moves ? teamPoke.moves.map(m => m ? ({ ...m }) : null) : []

      if (allPendingMoves.length > 0) {
        await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.SHOW_CHOICE)
        teamPoke.pendingMoves = allPendingMoves
        
        const uiStore = useUIStore()
        uiStore.addToLearnQueue(allPendingMoves.map(m => ({ pokemon: teamPoke, move: m })))

        while (uiStore.learnQueue.length > 0 || uiStore.currentMoveToLearn) {
          await sleep(100)
        }
      }

      // Sincronizar evolución por nivel en debug
      if (teamPoke.heldItem === 'everstone') {
        ctx.addLog(`${teamPoke.name} evitó evolucionar debido a la Piedra Eterna.`, 'log-info', teamPoke)
      } else {
        const { checkLevelUpEvolution } = await import('../evolutionLogic.ts')
        const targetId = checkLevelUpEvolution(teamPoke)
        if (targetId) {
          const uiStore = useUIStore()
          uiStore.startEvolution(teamPoke, targetId, '')
          // Esperar síncronamente mientras el modal de evolución esté abierto
          while (uiStore.isEvolutionOpen) {
            await sleep(100)
          }
        }
      }

      // Sync active player copy stats (including newly learned/replaced moves & evolution stats)
      p.level = teamPoke.level
      p.exp = teamPoke.exp
      p.expNeeded = teamPoke.expNeeded
      p.maxHp = teamPoke.maxHp
      p.hp = teamPoke.hp
      p.atk = teamPoke.atk
      p.def = teamPoke.def
      p.spa = teamPoke.spa
      p.spd = teamPoke.spd
      p.spe = teamPoke.spe
      p.moves = teamPoke.moves ? teamPoke.moves.map(m => m ? ({ ...m }) : null) : []

      await fsm.transition(prevState, prevSubState)
    }
  }
}

