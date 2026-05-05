import { generateEncounter } from '@/logic/encounters'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { useEventStore } from '@/stores/events'

/**
 * Handles the completion of a battle flow (either going to map or search loop).
 */
export async function handleBattleFlowCompletion(ctx, option = 'map') {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  const uiStore = useUIStore()

  if (option === 'search' && ctx.activeBattle.value) {
    ctx.isProcessing.value = true
    
    // FASE: INITIALIZING
    fsm.transition(BATTLE_STATES.INITIALIZING)
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.CHECK_SLOTS)
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PROMOTE_AND_REPOPULATE)
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PROMOTE)
    
    const locId = ctx.activeBattle.value.locationId
    const hasBinoculars = ctx.debugBinoculars.value
    
    // PROMOTE: Slot 2 -> Slot 1 (Ya manejado implícitamente por la lógica de slots, pero aquí lo formalizamos)
    // GEN_NEW_S2: Generar próximo encuentro si no hay uno en el slot
    if (!ctx.upcomingPokemon.value) {
      const encounterOptions = {
        activeEvents: useMapStore().activeEvents,
        dominanceData: useMapStore().mapWinners,
        shinyMultiplier: useEventStore().globalMultipliers?.shiny || 1,
        forceEncounter: true
      }
      const encounter = await generateEncounter(locId, ctx.gs.state, encounterOptions)
      if (encounter && encounter.type === 'wild') {
        ctx.upcomingPokemon.value = { ...encounter.pokemon }
      }
    }
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.GEN_NEW_S2)

    // VACATE_ALL_SEATS: Clean Stage Protocol (Converges here)
    // This ensures no previous combatant sprites are visible before the new search transition
    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.VACATE_ALL_SEATS)
    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_COORDS, 100)

    // FASE: SEARCH_PHASE (Fase Visual)
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE)
    fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.GRASS_SYNC)
    fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.ENTRY_ANIM)
    fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.WILD_ENTRY)

    const isFlying = ctx.upcomingPokemon.value?.type === 'flying' || ctx.upcomingPokemon.value?.type2 === 'flying' || ctx.upcomingPokemon.value?.ability === 'Levitación'
    fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.AESTHETIC_CHECK)
    
    if (isFlying) {
      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.SKIP_BUSHES)
      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.HIDDEN)
      
      if (ctx.activeBattle.value && ctx.upcomingPokemon.value) {
        ctx.activeBattle.value.enemy = { ...ctx.upcomingPokemon.value }
      }
    } else {
      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.BUSH_FLOW)
      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.BUSH_SETUP)
      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.GRADUAL_BUSHES)
      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.BUSH_VISIBLE)

      // Activar enemigo justo antes del fade de arbustos para el salto
      if (ctx.activeBattle.value && ctx.upcomingPokemon.value) {
        ctx.activeBattle.value.enemy = { ...ctx.upcomingPokemon.value }
      }

      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.BUSH_FADE)
    }

    fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.SILHOUETTE_MODE)
    if (hasBinoculars) {
      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.FULL_COLOR)
    } else {
      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.SOLID_SILHOUETTE)
    }
    
    fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.BUSH_IDLE)
    
    if (ctx.activeBattle.value?.isFishing) {
      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.MINIGAME_CHECK)
      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.JUMP_COLOR_F)
      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.JUMP_SHADOW_F)
      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.REVEAL_COLORS_F)
    } else if (Math.random() < 0) {
      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.VANISH_LOOP)
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
export async function triggerNextEncounter(ctx) {
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
export async function startEncounter(ctx) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  
  ctx.isIntroAnimating.value = true
  
  // 1. Minigame Check
  if (ctx.activeBattle.value?.isFishing) {
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.MINIGAME_CHECK)
  }
  
  // 1.5 Preload Coords (Shadow/Anchor sync)
  await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.PRELOAD_COORDS, 100)
  
  // 2. Encounter Anim (Jump)
  await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.ENCOUNTER_ANIM, 800)
  
  // 3. To Active Battle
  fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SHOW_ALL_MISSING_COMBAT_HUDS)
  ctx.isIntroAnimating.value = false
}
