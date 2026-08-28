import { toRaw } from 'vue'
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
  const desiredIndex = typeof d.playerTeamIndex === 'number' && d.playerTeamIndex >= 0 && d.playerTeamIndex < ctx.gs.state.team.length ? d.playerTeamIndex : -1
  const candidatePoke = desiredIndex !== -1 ? ctx.gs.state.team[desiredIndex] : null
  const playerPoke = (candidatePoke && candidatePoke.hp > 0 && !candidatePoke.onMission && !candidatePoke.onDefense)
    ? candidatePoke
    : ctx.gs.state.team.find((p: Pokemon) => p && p.hp > 0 && !p.onMission && !p.onDefense)

  // 2. Identify active enemy Pokemon
  const enemyTeamIndex = typeof d.enemyTeamIndex === 'number' && d.enemyTeamIndex >= 0 && (d.enemyTeam ? d.enemyTeamIndex < d.enemyTeam.length : true)
    ? d.enemyTeamIndex
    : (d.enemyTeam && d.enemyTeam.findIndex((p: Pokemon) => p && p.hp > 0) !== -1 ? d.enemyTeam.findIndex((p: Pokemon) => p && p.hp > 0) : 0)
  
  // 3. Minigames (Fishing / Archaeology) are never restored to prevent reset cheating — return directly to search loop
  if (isBattleMinigame(d)) {
    await resumeSearchMode(ctx, d)
    return
  }

  // 4. If an active battle with combatants was in progress, restore it faithfully
  const enemyPoke = d.enemy || d._initialEnemy || (d.enemyTeam && (d.enemyTeam[enemyTeamIndex] || d.enemyTeam[0])) || null
  const isSearchPhase = Boolean(
    (d as { inSearchPhase?: boolean }).inSearchPhase === true ||
    (d as { fsmState?: string }).fsmState === 'SEARCH_PHASE' ||
    (d.wasSearching && !d.isTrainer && !d.isGym && (!d.turnCount || d.turnCount === 0) && !d.battleHistory?.length)
  );
  const isActualCombatInProgress = Boolean(
    !isSearchPhase &&
    ((d.turnCount && d.turnCount > 0) || d.isTrainer || d.isGym || (!d.wasSearching && enemyPoke))
  );

  if (playerPoke && enemyPoke && isActualCombatInProgress) {
    d.player = playerPoke
    d.enemy = enemyPoke
    if (!d._initialEnemy) {
      try {
        d._initialEnemy = structuredClone(toRaw(enemyPoke))
      } catch {
        d._initialEnemy = JSON.parse(JSON.stringify(enemyPoke)) as Pokemon
      }
    }
    d.playerTeam = ctx.gs.state.team
    const matchedIndex = ctx.gs.state.team.findIndex((p: Pokemon) => p && isMatchingUid(p.uid, playerPoke.uid))
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
    d.enemyInventory = d.enemyInventory || {}
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
