
import { generateEncounter } from '@/logic/encounters'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { useEventStore } from '@/stores/events'

/**
 * Handles the completion of a battle flow (either going to map or search loop).
 */
export async function handleBattleFlowCompletion(ctx: any, option = 'map') {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  const uiStore = useUIStore() as any

  if (option === 'search' && ctx.activeBattle.value) {
    ctx.isProcessing.value = true
    
    // FASE: INITIALIZING
    fsm.transition(BATTLE_STATES.INITIALIZING)
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.CHECK_SLOTS)
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PROMOTE_AND_REPOPULATE)
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PROMOTE)
    
    const locId = ctx.activeBattle.value.locationId
    
    // PROMOTE: Slot 2 -> Slot 1
    if (ctx.upcomingPokemon.value) {
      ctx.activeBattle.value._initialEnemy = { ...ctx.upcomingPokemon.value }
    }
    // GEN_NEW_S2: Generar próximo encuentro si no hay uno en el slot
    if (!ctx.upcomingPokemon.value) {
      const encounterOptions = {
        activeEvents: (useMapStore() as any).activeEvents,
        dominanceData: (useMapStore() as any).mapWinners,
        shinyMultiplier: (useEventStore() as any).globalMultipliers?.shiny || 1,
        forceEncounter: true
      }
      const encounter = (await generateEncounter(locId, ctx.gs.state, encounterOptions)) as any
      if (encounter && encounter.type === 'wild') {
        ctx.upcomingPokemon.value = { ...encounter.pokemon }
      }
    }
    
    if (ctx.upcomingPokemon.value) {
      ctx.activeBattle.value._initialEnemy = { ...ctx.upcomingPokemon.value }
    }

    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.GEN_NEW_S2)

    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_COORDS, 100)

    // FASE: SEARCH_PHASE
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.PARALLEL_PREP)
    
    if (ctx.upcomingPokemon.value) {
      ctx.activeBattle.value.enemy = { ...ctx.upcomingPokemon.value }
    }
    
    ctx.isProcessing.value = false
    return
  }

  fsm.transition(BATTLE_STATES.EXIT_BATTLE)
  ctx.activeBattle.value = null
  ctx.isProcessing.value = false
  ctx.clearLogs() 

  if (option === 'map') {
    uiStore.activeTab = 'map'
  }
}

/**
 * Triggers an encounter from the search loop.
 */
export async function triggerNextEncounter(ctx: any) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  
  ctx.isProcessing.value = false
  const locId = ctx.activeBattle.value?.locationId
  if (!ctx.upcomingPokemon.value || !locId) {
    console.warn('[Battle] triggerNextEncounter: sin upcomingPokemon o locationId.')
    return
  }
  
  await fsm.transition(BATTLE_STATES.INITIALIZING)
  if (ctx.activeBattle.value?.isFishing) {
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MINIGAME_CHECK)
  }
  fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.ENCOUNTER_ANIM)
  
  const nextPoke = ctx.upcomingPokemon.value
  ctx.upcomingPokemon.value = null
  await ctx._startBattle(nextPoke, {
    locationId: locId,
    wasSearching: true,
    battleOptions: { isDebug: !!ctx.debugLoopPokemon.value }
  })
}

/**
 * Transition from SEARCH_PHASE to ACTIVE_BATTLE.
 */
export async function startEncounter(ctx: any) {
  ctx.isIntroAnimating.value = true
  
  const locId = ctx.activeBattle.value?.locationId
  const isTr = ctx.activeBattle.value?.isTrainer
  const trName = ctx.activeBattle.value?.trainerName
  const isGym = ctx.activeBattle.value?.isGym
  const gymId = ctx.activeBattle.value?.gymId
  
  await ctx.initBattle(locId, isTr, trName, isGym, gymId, true);
  
  ctx.isIntroAnimating.value = false
}
