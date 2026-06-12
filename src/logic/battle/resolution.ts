// fallow-ignore-file circular-dependencies
import { gsapSleep as sleep } from '@/logic/utils/gsapHelpers'
import { gameBus } from '@/logic/gameBus'
import type { BattleContext } from '@/types/battleContext'
import type { Pokemon } from '@/types/pokemon'
import { useBreedingStore } from '@/stores/breeding'
import { useUIStore } from '@/stores/ui'
import { calculateBattleRewards, registerRewardCombatant } from './rewardsDistributor.ts'
export { awardDebugExp } from './rewardsDistributor.ts'

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

  if (!ctx.gs.state.stats) {
    ctx.gs.state.stats = {}
  }
  ctx.gs.state.stats.totalBattles = (Number(ctx.gs.state.stats.totalBattles) || 0) + 1
  
  const uiStore = useUIStore()
  uiStore.isBattleSwitchForced = false
  
  // Reset criminality if fighting police officer
  if (active.trainerName === 'Oficial de Policía') {
    if (ctx.gs.state.playerClass === 'rocket' && ctx.gs.state.classData) {
      ctx.gs.state.classData.criminality = 0
      uiStore.notify("Tu nivel de criminalidad ha vuelto a cero.", "🚔")
    }
  }
  
  const persistenceMode = active.persistenceMode as string || 'PERSISTENT'
  const isSingle = persistenceMode === 'SINGLE' || active.isGym || active.isPvP

  syncAndPersist(ctx)

  // 1. Ejecutamos animaciones de salida en paralelo para el jugador y el enemigo si siguen activos
  if (fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE) {
    const isTrainerOrGym = active.isTrainer || active.isGym || active.isPvP
    // El jugador NUNCA se retira de su asiento en una victoria — permanece visible
    // hasta que el usuario haga clic en "Volver al Mapa/Gimnasios".
    // Solo en derrota (!win && !fled) con un Pokémon vivo se ejecuta la animación de derrota.
    const playerExited: Promise<void> = Promise.resolve()

    let enemyExited: Promise<void> = Promise.resolve()
    if (active.enemy && active.enemy.hp > 0 && !fled && !active.isCapture) {
      if (isTrainerOrGym) {
        enemyExited = ctx.animations?.handleCatchRequest
          ? ctx.animations.handleCatchRequest({ side: 'enemy', pokemon: active.enemy })
          : Promise.resolve()
      } else {
        if (win) {
          enemyExited = ctx.animations?.handleFaintAnim
            ? ctx.animations.handleFaintAnim({ side: 'enemy', pokemon: active.enemy })
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

  if (active) active._initialEnemy = null

  if (isSingle) {
    // Para combates isSingle (Gym, PvP), NO se realiza reordenamiento animado.
    // El FSM queda en EMPTY_WAIT con el overlay visible ("VOLVER A GIMNASIOS" / "VOLVER AL MAPA").
    // El cierre lo dispara el usuario al hacer clic en el botón, que llama completeBattleFlow('map').
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.CHECK_PERSISTENCE)
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
    return
  }

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

  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.CHECK_PERSISTENCE)
  
  if (active.wasSearching !== false) {
    await ctx.completeBattleFlow('search')
  } else {
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
    await ctx.completeBattleFlow('map')
  }
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



