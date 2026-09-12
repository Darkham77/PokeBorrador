import { cloneReactive } from '@/logic/utils/cloneUtils.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { BattleState, BattleStages, BattleLog } from '@/types/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { isMatchingUid } from './showdownUidMapper.ts'
import { initWorkerForBattle } from './orchestratorWorkerInitHelper.ts'
import { requireMapRouteId } from '@/data/world/map-assets'
import { isBattleMinigame } from './battleMinigames.ts'

/**
 * Restores a battle state from saved data upon page refresh (F5).
 * Faithfully resumes the active combat at the exact turn, HP, and log history.
 */
export async function restoreBattleState(ctx: BattleContext, battleData: unknown) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  if (!battleData) {
    ctx.activeBattle.value = null
    await ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    return
  }
  const d = battleData as Partial<BattleState & { playerStages: BattleStages; enemyStages: BattleStages; battleLogs: BattleLog[] }>
  
  if (d.over) {
    ctx.activeBattle.value = null
    ctx.gs.state.activeBattle = null
    await ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    await ctx.gs.save?.(false)
    return
  }

  // 1. Identify active player Pokemon
  const sourceTeam = (d.isPvP && Array.isArray(d.playerTeam) && d.playerTeam.length > 0)
    ? d.playerTeam
    : ctx.gs.state.team
  const desiredIndex = typeof d.playerTeamIndex === 'number' && d.playerTeamIndex >= 0 && d.playerTeamIndex < sourceTeam.length ? d.playerTeamIndex : -1
  const candidatePoke = desiredIndex !== -1 ? sourceTeam[desiredIndex] : null
  const playerPoke = (candidatePoke && candidatePoke.hp > 0 && !candidatePoke.onMission && !candidatePoke.onDefense)
    ? candidatePoke
    : sourceTeam.find((p: Pokemon) => p && p.hp > 0 && !p.onMission && !p.onDefense)

  // 2. Minigames (Fishing / Archaeology) are never restored to prevent reset cheating — return directly to search loop
  if (isBattleMinigame(d)) {
    await resumeSearchMode(ctx, d)
    return
  }

  // 3. Search phase (bush mode) — resume searching without launching active combat
  const isSearchPhase = Boolean(
    (d as { inSearchPhase?: boolean }).inSearchPhase === true ||
    (d as { fsmState?: string }).fsmState === 'SEARCH_PHASE' ||
    (d.wasSearching && !d.isTrainer && !d.isGym && !d.isPvP && (!d.turnCount || d.turnCount === 0) && !d.battleHistory?.length)
  );
  if (isSearchPhase) {
    await resumeSearchMode(ctx, d)
    return
  }

  if (!playerPoke) {
    ctx.activeBattle.value = null
    ctx.gs.state.activeBattle = null
    await ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    await ctx.gs.save?.(false)
    return
  }

  // 4. Identify active enemy Pokemon & check if enemy team is completely fainted
  let enemyTeamIndex = 0
  let enemyPoke: Pokemon | null = null

  if (d.enemyTeam && Array.isArray(d.enemyTeam) && d.enemyTeam.length > 0) {
    const hasAliveEnemy = d.enemyTeam.some((p: Pokemon) => p && p.hp > 0 && !p.fainted)
    if (!hasAliveEnemy) {
      ctx.activeBattle.value = null
      ctx.gs.state.activeBattle = null
      await ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE)
      await ctx.gs.save?.(false)
      return
    }

    const desiredEnemyIndex = typeof d.enemyTeamIndex === 'number' && d.enemyTeamIndex >= 0 && d.enemyTeamIndex < d.enemyTeam.length
      ? d.enemyTeamIndex
      : -1
    const candidateEnemy = desiredEnemyIndex !== -1 ? d.enemyTeam[desiredEnemyIndex] : null
    if (candidateEnemy && candidateEnemy.hp > 0 && !candidateEnemy.fainted) {
      enemyTeamIndex = desiredEnemyIndex
      enemyPoke = candidateEnemy
    } else {
      const aliveIdx = d.enemyTeam.findIndex((p: Pokemon) => p && p.hp > 0 && !p.fainted)
      enemyTeamIndex = aliveIdx !== -1 ? aliveIdx : 0
      enemyPoke = d.enemyTeam[enemyTeamIndex] || null
    }
  } else {
    // Single / Wild enemy
    const candidateEnemy = d.enemy || d._initialEnemy || null
    if (candidateEnemy && candidateEnemy.hp > 0 && !candidateEnemy.fainted) {
      enemyPoke = candidateEnemy
      enemyTeamIndex = 0
    }
  }

  if (!enemyPoke || enemyPoke.hp <= 0 || enemyPoke.fainted) {
    if (d.wasSearching) {
      await resumeSearchMode(ctx, d)
      return
    }
    ctx.activeBattle.value = null
    ctx.gs.state.activeBattle = null
    await ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    await ctx.gs.save?.(false)
    return
  }

  // 5. If an active battle with combatants was in progress, restore it faithfully
  const isActualCombatInProgress = Boolean(
    !isSearchPhase &&
    ((d.turnCount && d.turnCount > 0) || d.isTrainer || d.isGym || d.isPvP || (!d.wasSearching && enemyPoke))
  );

  if (playerPoke && enemyPoke && isActualCombatInProgress) {
    d.player = playerPoke
    d.enemy = enemyPoke
    if (!d._initialEnemy) {
      d._initialEnemy = cloneReactive(enemyPoke)
    }
    d.playerTeam = sourceTeam
    const matchedIndex = sourceTeam.findIndex((p: Pokemon) => p && isMatchingUid(p.uid, playerPoke.uid))
    d.playerTeamIndex = matchedIndex !== -1 ? matchedIndex : (desiredIndex !== -1 ? desiredIndex : 0)
    d.enemyTeamIndex = enemyTeamIndex
    d.participants = Array.isArray(d.participants) && d.participants.length > 0 ? d.participants : [playerPoke.uid]
    d.turnCount = typeof d.turnCount === 'number' ? d.turnCount : 1
    d.over = false
    d.escapeAttempts = typeof d.escapeAttempts === 'number' ? d.escapeAttempts : 0
    d.cannotEscape = Boolean(d.cannotEscape)
    d.weather = d.weather || { type: 'clear', visual: 'clear', turns: -1 }
    d.initialMapWeather = d.initialMapWeather || null
    d.terrain = d.terrain || null
    d.fieldConditions = d.fieldConditions || {}
    d.playerSideConditions = d.playerSideConditions || {}
    d.enemySideConditions = d.enemySideConditions || {}
    d.pendingSlotEffects = Array.isArray(d.pendingSlotEffects) ? d.pendingSlotEffects : []
    d.enemyInventory = d.enemyInventory ? { ...d.enemyInventory } : {}
    d.stolenResources = d.stolenResources || { money: 0, items: {} }
    d.wasSearching = Boolean(d.wasSearching)
    d.isRival = Boolean(d.isRival || d.trainerArchetype === 'rival')
    d.minigame = d.minigame ?? null
    d.isCave = Boolean(d.isCave)
    d.isIndoors = Boolean(d.isIndoors)
    d.isCrystalCave = Boolean(d.isCrystalCave)

    ctx.activeBattle.value = d as BattleState
    if (d.playerStages) ctx.playerStages.value = d.playerStages
    if (d.enemyStages) ctx.enemyStages.value = d.enemyStages
    if (d.battleLogs && Array.isArray(d.battleLogs)) {
      ctx.battleLogs.value = [...d.battleLogs]
    }

    // Re-initialize Showdown Worker with the restored teams and active Pokemon
    await initWorkerForBattle(ctx, playerPoke, enemyPoke)
    await ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    ctx.isProcessing.value = false

    if (d.isPvP) {
      const { useLivePvPStore } = await import('@/stores/livePvP')
      useLivePvPStore().reconnectBattle(d)
    }
    return
  }

  // 5. If in search mode without an active enemy yet, continue in SEARCH_PHASE
  if (d.wasSearching) {
    await resumeSearchMode(ctx, d)
    return
  }

  ctx.activeBattle.value = null
  ctx.gs.state.activeBattle = null
  await ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE)
  await ctx.gs.save?.(false)
}

async function resumeSearchMode(ctx: BattleContext, d: Partial<BattleState>): Promise<void> {
  const rawLoc = d.locationId || ctx.gs.state.map?.currentMap
  if (!rawLoc) {
    throw new Error('[BattleRestore] Cannot restore search phase without a valid locationId or map.currentMap')
  }
  const locId = requireMapRouteId(rawLoc)
  ctx.activeBattle.value = {
    player: null,
    enemy: null,
    playerTeamIndex: 0,
    enemyTeamIndex: 0,
    participants: [],
    locationId: locId,
    weather: { type: 'clear', visual: 'clear', turns: -1 },
    turnCount: 0,
    escapeAttempts: 0,
    over: false,
    fled: false,
    isTrainer: false,
    isGym: false,
    minigame: null,
    isCave: Boolean(d.isCave),
    isIndoors: Boolean(d.isIndoors),
    isCrystalCave: Boolean(d.isCrystalCave),
    rewardsProcessed: false,
    _rewardCombatants: [],
    wasSearching: true,
  }
  const { handleBattleFlowCompletion } = await import('./searchLoop.ts')
  await handleBattleFlowCompletion(ctx, 'search')
}
