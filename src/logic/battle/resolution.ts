import { gameBus } from '@/logic/events/gameBus'
import { gsapSleep } from '@/logic/utils/gsapHelpers'
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
import {
  handleCombatantsExitAnimations,
  handleBattleDefeatFlow,
  handleBattleFleeFlow
} from './battleTerminationOutcomes.ts'
export { awardDebugExp } from './rewardsDistributor.ts'
export { syncAndPersist } from './battleStateSync.ts'

const TERMINATING_BATTLES = new WeakSet<object>()
const DESTINY_BOND_SLEEP_DELAY_MS = 500

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

  if (pokemon?.destinyBond && opponent && opponent.hp > 0) {
    ctx.addLog(`¡${pokemon.name} se llevó a ${opponent.name} con él!`, 'log-info', pokemon)
    opponent.hp = 0
    await gsapSleep(DESTINY_BOND_SLEEP_DELAY_MS)
    await processFaint(ctx, isPlayer ? 'enemy' : 'player')
  }

  if (isPlayer) {
    const { processPlayerFaintSequence } = await import('./battleFaintSequence.ts')
    await processPlayerFaintSequence(ctx, pokemon || null, { terminateBattle })
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
  
  const persistenceMode = active.persistenceMode as string || 'PERSISTENT' // spanish-ok
  const isSingle = Boolean(persistenceMode === 'SINGLE' || active.isGym || active.isPvP)

  syncAndPersist(ctx)

  // 1. Ejecutamos animaciones de salida en paralelo para el jugador y el enemigo si siguen activos
  if (fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE) {
    await handleCombatantsExitAnimations(ctx, active, win, fled)
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

  const isTrainerEncounter = Boolean(active.isTrainer || active.isRival || active.trainerName || active.isGym)
  if (isTrainerEncounter && ctx.animations?.triggerTrainerExit) {
    await ctx.animations.triggerTrainerExit()
  }

  if (!win && !fled) {
    await handleBattleDefeatFlow(ctx, active)
    return
  }

  if (fled) {
    await handleBattleFleeFlow(ctx, active, isSingle)
    return
  }
  
  await ctx.gs.save(false)
  await ctx.waitForLogs()
  if (!isCurrentBattle(ctx, active)) return
  
  syncTeamHP(ctx)

  if (active) active._initialEnemy = null

  if (isSingle) {
    // Para combates isSingle (Gym, PvP), NO se realiza reordenamiento animado.
    // El FSM queda en EMPTY_WAIT con el overlay visible ("VOLVER A GIMNASIOS" / "VOLVER AL MAPA").
    // El cierre lo dispara el usuario al hacer clic en el botón, que llama completeBattleFlow('map').
    ctx.isProcessing.value = false
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.CHECK_PERSISTENCE)
    await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
    return
  }

  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
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
  
  const wasSearching = active.wasSearching === true || ctx.isSearching.value === true
  if (wasSearching) {
    const { useUIStore } = await import('@/stores/ui.ts')
    const uiStore = useUIStore()
    if (uiStore.autoBattle) {
      const { gsapSleep } = await import('@/logic/utils/gsapHelpers.ts')
      const { AUTO_BATTLE_REWARDS_DELAY_SEC } = await import('@/data/system/constants.ts')
      await gsapSleep(AUTO_BATTLE_REWARDS_DELAY_SEC)
      if (!isCurrentBattle(ctx, active)) return
    }
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
        await ctx.animations.awaitTween('escape-player')
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
