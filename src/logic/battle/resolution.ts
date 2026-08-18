import { gsapSleep as sleep } from '@/logic/utils/gsapHelpers'
import { gameBus } from '@/logic/events/gameBus'
import type { BattleContext } from '@/types/battle/battleContext'
import type { BattleSide } from '@/types/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { useUIStore } from '@/stores/ui'
import { clearVolatileStatus } from './battleStatus.ts'
import { registerRewardCombatant } from './rewardsDistributor.ts'
import {
  handlePoliceResolution,
  animatePlayerAutoSwap,
  handleEnemyForceSwitchExecution
} from './helpers/battleResolutionHelpers.ts'
export { awardDebugExp } from './rewardsDistributor.ts'
export { syncAndPersist } from './battleStateSync.ts'

const FAINT_ANIMATION_FALLBACK_DELAY_MS = 1300;
const DEFEAT_SCREEN_DELAY_MS = 1500;
const ENEMY_FLEE_ANIMATION_DELAY_MS = 1000;
const TERMINATING_BATTLES = new WeakSet<object>()

function isCurrentBattle(ctx: BattleContext, battle: NonNullable<BattleContext['activeBattle']['value']>): boolean {
  return ctx.activeBattle.value === battle
}

/**
 * Handles the fainting of a Pokémon.
 */
export async function processFaint(ctx: BattleContext, side: BattleSide) {
  const active = ctx.activeBattle.value;
  if (!active || active.rewardsProcessed || ['SEARCH_PHASE', 'REWARDS_PHASE'].includes(ctx.fsm.currentState.value)) return;

  const isPlayer = side === 'player'
  if (isPlayer && active.player && active.player.hp > 0) return;
  if (!isPlayer && active.enemy && active.enemy.hp > 0) return;
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, isPlayer ? BATTLE_SUBSTATES.PLAYER_FAINT_SEQ : BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
  
  if (ctx.faintedSides.value.has(side)) return
  ctx.faintedSides.value.add(side)
  
  const pokemon = isPlayer ? active.player : active.enemy
  const opponent = isPlayer ? active.enemy : active.player
  
const DESTINY_BOND_SLEEP_DELAY_MS = 500;

  if (pokemon?.destinyBond && opponent && opponent.hp > 0) {
    ctx.addLog(`¡${pokemon.name} se llevó a ${opponent.name} con él!`, 'log-info', pokemon)
    opponent.hp = 0
    await sleep(DESTINY_BOND_SLEEP_DELAY_MS)
    await processFaint(ctx, isPlayer ? 'enemy' : 'player')
  }

  if (isPlayer) {
    const pokeName = pokemon?.name || active?._lastActivePlayer?.name || 'Tu Pokémon';
    ctx.addLog(`¡${pokeName} se ha debilitado!`, 'log-player', pokemon || undefined)
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RECALL_FLOW)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RENDER_BALL)
    if (ctx.animations?.handleFaintAnim) {
      await ctx.animations.handleFaintAnim({ side: 'player', isFaint: true })
    } else {
      await sleep(FAINT_ANIMATION_FALLBACK_DELAY_MS)
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
      await sleep(DEFEAT_SCREEN_DELAY_MS)
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
        // SWITCH_MENU is a player-input state. Leaving the turn lock active
        // here makes every official switch control non-interactive.
        ctx.isProcessing.value = false
        ctx.isIntroAnimating.value = false
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SWITCH_MENU)
      }
    }
  } else if (pokemon) {
    const { processEnemyFaintSequence } = await import('./battleFaintSequence.ts')
    await processEnemyFaintSequence(ctx, pokemon, { processFaint, terminateBattle })
  }
}

/**
 * Terminates the battle and processes results.
 */
export async function terminateBattle(ctx: BattleContext, winParam: boolean, fled = false) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  const active = ctx.activeBattle.value;

  if (!active) {
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    return
  }
  if (TERMINATING_BATTLES.has(active)) return

  TERMINATING_BATTLES.add(active)
  try {

  // If Showdown's protocol provided an explicit winnerResult, rely on it over local heuristics
  const win = active.winnerResult ? (active.winnerResult === 'player') : winParam;

  active.over = true
  ctx.faintedSides.value.clear()

  // Terminar el Web Worker de Showdown y limpiar clima global en el mapa
  import('./orchestrator.ts').then(({ showdownWorker }) => {
    if (showdownWorker) {
      showdownWorker.terminate();
      // Null out the reference to prevent dangling postMessage to terminated worker
      import('./showdownWorkerClient.ts').then(({ setShowdownWorker }) => setShowdownWorker(null));
    }
  });




  // Limpiar todos los estados volátiles del equipo al terminar la batalla
  if (ctx.gs.state.team) {
    ctx.gs.state.team.forEach((p: Pokemon | null) => {
      if (p) clearVolatileStatus(p)
    })
  }

  if (!ctx.gs.state.stats) {
    ctx.gs.state.stats = {}
  }
  ctx.gs.state.stats.totalBattles = (Number(ctx.gs.state.stats.totalBattles) || 0) + 1
  
  const uiStore = useUIStore()
  uiStore.isBattleSwitchForced = false
  
  await handlePoliceResolution(ctx, active, win, fled, uiStore)
  
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
          enemyExited = sleep(ENEMY_FLEE_ANIMATION_DELAY_MS)
        }
      }
    }

    await Promise.all([playerExited, enemyExited])
    if (!isCurrentBattle(ctx, active)) return
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
  if (!isCurrentBattle(ctx, active)) return
  const { processBattleRewardsPhase } = await import('./battleRewardsPhase.ts')
  await processBattleRewardsPhase(ctx, win, fled)
  if (!isCurrentBattle(ctx, active)) return

  if (!win && !fled) {
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
    await sleep(200)
    await ctx.gs.save(false)
    if (!isCurrentBattle(ctx, active)) return
    
    ctx.audio.play('defeat')
    
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.ENTRY_CHECK)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.DEFEAT_SCREEN)
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.DEFEAT_WAIT)
    return
  }

  if (fled) {
    if (active) active._initialEnemy = null
    ctx.clearLogs?.()
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.WAIT_LOG_QUEUE_ONLY)
    await ctx.waitForLogs()
    if (!isCurrentBattle(ctx, active)) return
    
    const playerFled = active.playerFled || false
    const wasSearching = active.wasSearching || false
    if (isSingle || playerFled || !wasSearching) {
      await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.ENTRY_CHECK)
      await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.EXECUTE_CLEANUP)
      await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.CLEAR_UI)
      await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.TRIGGER_CLOSE)
      await fsm.transition(BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.RESET_FLAGS)
      await ctx.completeBattleFlow('map')
    } else {
      await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
      await sleep(200)
      if (!isCurrentBattle(ctx, active)) return
      await ctx.completeBattleFlow('search')
    }
    return
  }
  
  await ctx.gs.save(false)
  await ctx.waitForLogs()
  if (!isCurrentBattle(ctx, active)) return
  
  // Esperar a que el jugador termine de aprender técnicas en el modal
  while (uiStore.learnQueue.length > 0 || uiStore.currentMoveToLearn) {
    await sleep(100)
    if (!isCurrentBattle(ctx, active)) return
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
  if (!isCurrentBattle(ctx, active)) return

  // Reordenamiento animado: recall del incorrecto + release del correcto en paralelo
  await animatePlayerAutoSwap(ctx, active, isCurrentBattle)
  if (!isCurrentBattle(ctx, active)) return

  interface LocalDebugObject {
    [key: string]: unknown;
    isScriptedReplayMode?: boolean;
    lastFinalState?: {
      p1: Array<{ uid: string; name: string; hp: number; maxHp: number; fainted: boolean }>;
      p2: Array<{ uid: string; name: string; hp: number; maxHp: number; fainted: boolean }>;
    };
  }

  interface WindowWithDebug extends Window {
    __VITE_DEBUG__?: LocalDebugObject;
  }

  const winObj = (typeof window !== 'undefined' ? window : undefined) as WindowWithDebug | undefined;
  if (winObj && winObj.__VITE_DEBUG__?.isScriptedReplayMode) {
    const p1 = (ctx.gs.state?.team ?? []).map((p: Pokemon) => ({
      uid: p.uid,
      name: p.name,
      hp: p.hp,
      maxHp: p.maxHp,
      fainted: p.hp <= 0
    }));
    const p2 = (active.enemyTeam ?? []).map((p: Pokemon) => ({
      uid: p.uid,
      name: p.name,
      hp: p.hp,
      maxHp: p.maxHp,
      fainted: p.hp <= 0
    }));
    winObj.__VITE_DEBUG__.lastFinalState = { p1, p2 };
  }

  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.CHECK_PERSISTENCE)
  if (!isCurrentBattle(ctx, active)) return
  
  if (active.wasSearching === true) {
    await ctx.completeBattleFlow('search')
  } else {
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
    await ctx.completeBattleFlow('map')
  }
  } finally {
    TERMINATING_BATTLES.delete(active)
  }
}



import { syncTeamHP, syncAndPersist } from './battleStateSync.ts'

/**
 * Intercepts fainted player active Pokemon or forceSwitch requests
 * to trigger faint animations or replacement menus, preventing simulator invalid choice crashes.
 */
export async function validateAndInterceptFaintedPlayer(ctx: BattleContext): Promise<boolean> {
  const active = ctx.activeBattle.value
  if (!active) return false

  const p = active.player
  if (!p) return false

  const { isRevivingForceSwitchRequest } = await import('./helpers/requestHelper.ts')
  const isP1Forced = active.playerRequest?.forceSwitch?.some((x: unknown) => !!x) && !isRevivingForceSwitchRequest(active.playerRequest);
  if (p.hp <= 0 || isP1Forced) {
    if (p.hp <= 0) {
      console.warn(`[validateAndIntercept] Player Pokemon ${p.name} is fainted. Triggering processFaint sequence.`);
      await processFaint(ctx, 'player');
    } else {
      console.warn(`[validateAndIntercept] forceSwitch requested for active player. Transiting to replacements menu.`);
      await handleForceSwitch(ctx, 'player');
    }
    return true
  }
  return false
}

/**
 * Handles forced switch request (e.g. from Dragon Tail or Whirlwind).
 */
export async function handleForceSwitch(ctx: BattleContext, side: BattleSide) {
  const active = ctx.activeBattle.value
  if (!active || active.over) return

  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  if (side === 'player') {
    const hasHealthyPlayer = ctx.gs.state.team.some((mon: Pokemon) => mon && mon.hp > 0);
    if (!hasHealthyPlayer) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ALL_FAINTED);
      active.over = true;
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.DEFEAT_SCREEN);
      await terminateBattle(ctx, false);
      return;
    }

    ctx.uiStore.isBattleSwitchForced = true
    const p = active.player
    if (p) {
      ctx.addLog(`¡${p.name} es forzado a retirarse!`, 'log-info', p)
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM)
      gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'player', type: 'forced-switch' })
      if (ctx.animations?.awaitTween) {
        await ctx.animations.awaitTween(`player-${p.uid}`)
      }
    }
    // The forced replacement menu is actionable as soon as the withdrawal
    // animation ends; it must not inherit the prior turn's UI lock.
    ctx.isProcessing.value = false
    ctx.isIntroAnimating.value = false
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SWITCH_MENU)
  } else {
    await handleEnemyForceSwitchExecution(ctx, active, processFaint)
  }
}
