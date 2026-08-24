import type { BattleContext } from '@/types/battle/battleContext'
import type { BattleState, BattleStages, BattleLog } from '@/types/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { isMatchingUid } from './showdownUidMapper.ts'
import { initWorkerForBattle } from './orchestratorWorkerInitHelper.ts'
import { requireMapRouteId } from '@/data/world/map-assets'

/**
 * Restores a battle state from saved data.
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
    return
  }

  // 1. Trainer / Rival / Gym Battle Restoration
  if ((d.isTrainer || d.isGym) && d.enemyTeam && Array.isArray(d.enemyTeam) && d.enemyTeam.length > 0) {
    const desiredIndex = typeof d.playerTeamIndex === 'number' && d.playerTeamIndex >= 0 && d.playerTeamIndex < ctx.gs.state.team.length ? d.playerTeamIndex : -1
    const candidatePoke = desiredIndex !== -1 ? ctx.gs.state.team[desiredIndex] : null
    const playerPoke = (candidatePoke && candidatePoke.hp > 0 && !candidatePoke.onMission && !candidatePoke.onDefense)
      ? candidatePoke
      : ctx.gs.state.team.find((p: Pokemon) => p && p.hp > 0 && !p.onMission && !p.onDefense)

    const enemyTeamIndex = typeof d.enemyTeamIndex === 'number' && d.enemyTeamIndex >= 0 && d.enemyTeamIndex < d.enemyTeam.length
      ? d.enemyTeamIndex
      : (d.enemyTeam.findIndex((p: Pokemon) => p && p.hp > 0) !== -1 ? d.enemyTeam.findIndex((p: Pokemon) => p && p.hp > 0) : 0)
    const enemyPoke = d.enemy || d.enemyTeam[enemyTeamIndex] || d.enemyTeam[0]

    if (!playerPoke || !enemyPoke) {
      ctx.activeBattle.value = null
      ctx.gs.state.activeBattle = null
      await ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE)
      return
    }

    d.player = playerPoke
    d.enemy = enemyPoke
    d.playerTeam = ctx.gs.state.team
    const matchedIndex = ctx.gs.state.team.findIndex((p: Pokemon) => p && isMatchingUid(p.uid, playerPoke.uid))
    d.playerTeamIndex = matchedIndex !== -1 ? matchedIndex : (desiredIndex !== -1 ? desiredIndex : 0)
    d.enemyTeamIndex = enemyTeamIndex
    d.participants = Array.isArray(d.participants) && d.participants.length > 0 ? d.participants : [playerPoke.uid]
    d.turnCount = typeof d.turnCount === 'number' ? d.turnCount : 1
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
    d.isFishing = Boolean(d.isFishing)
    d.isArchaeology = Boolean(d.isArchaeology)
    d.isCave = Boolean(d.isCave)
    d.isIndoors = Boolean(d.isIndoors)
    d.isCrystalCave = Boolean(d.isCrystalCave)

    ctx.activeBattle.value = d as BattleState
    if (d.playerStages) ctx.playerStages.value = d.playerStages
    if (d.enemyStages) ctx.enemyStages.value = d.enemyStages
    if (d.battleLogs && Array.isArray(d.battleLogs)) {
      ctx.battleLogs.value = [...d.battleLogs]
    }

    // Re-inicializar el worker con el estado de los equipos restaurados
    await initWorkerForBattle(ctx, playerPoke, enemyPoke)
    await ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    return
  }

  // 2. Wild / Search Phase Restoration (Anti-Cheat: continue in SEARCH_PHASE with bushes)
  if (d.wasSearching || (!d.isTrainer && !d.isGym)) {
    const rawLoc = d.locationId || ctx.gs.state.map?.currentMap;
    if (!rawLoc) {
      throw new Error('[BattleRestore] Cannot restore search phase without a valid locationId or map.currentMap');
    }
    const locId = requireMapRouteId(rawLoc);
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
      isFishing: Boolean(d.isFishing),
      isArchaeology: Boolean(d.isArchaeology),
      isCave: Boolean(d.isCave),
      isIndoors: Boolean(d.isIndoors),
      isCrystalCave: Boolean(d.isCrystalCave),
      rewardsProcessed: false,
      _rewardCombatants: [],
      wasSearching: true,
    }
    const { handleBattleFlowCompletion } = await import('./searchLoop.ts')
    await handleBattleFlowCompletion(ctx, 'search')
    return
  }

  ctx.activeBattle.value = null
  ctx.gs.state.activeBattle = null
  await ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE)
}
