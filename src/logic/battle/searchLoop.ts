
import { generateEncounter } from '@/logic/encounters'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { useEventStore } from '@/stores/events'
import { useWarStore } from '@/stores/war'
import type { BattleContext } from '@/types/battleContext'
import type { UIStore, MapStore, EventStore, WarStore } from '@/types/stores'
import { logger } from '../utils/logger.ts'

/**
 * Handles the completion of a battle flow (either going to map or search loop).
 */
export async function handleBattleFlowCompletion(ctx: BattleContext, option = 'map') {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  const uiStore = useUIStore() as unknown as UIStore

  if (option === 'search' && ctx.activeBattle.value) {
    ctx.isProcessing.value = true
    
    // Restablecer flags de minijuegos para la fase de búsqueda
    ctx.activeBattle.value.isFishing = false
    ctx.activeBattle.value.isArchaeology = false
    
    // FASE: INITIALIZING
    fsm.transition(BATTLE_STATES.INITIALIZING)
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.CHECK_SLOTS)
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PROMOTE_AND_REPOPULATE)
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PROMOTE)
    
    const locId = ctx.activeBattle.value.locationId
    
    // PROMOTE: Slot 2 -> Slot 1
    if (ctx.upcomingPokemon.value) {
      ctx.activeBattle.value._initialEnemy = { ...ctx.upcomingPokemon.value }
      
      // Consumimos el Slot 2 ya que pasa a ser el Slot 1 activo
      ctx.upcomingPokemon.value = null
      if (ctx.upcomingEncounterType) ctx.upcomingEncounterType.value = null
    }

    // GEN_NEW_S2: Generar próximo encuentro si no hay uno en el slot (Slot 2)
    if (!ctx.upcomingPokemon.value) {
      const mapStore = useMapStore() as unknown as MapStore
      const eventStore = useEventStore() as unknown as EventStore
      const warStore = useWarStore() as unknown as WarStore
      const encounterOptions = {
        activeEvents: mapStore.activeEvents,
        dominanceData: warStore.mapDominance,
        shinyMultiplier: eventStore.globalMultipliers?.shiny || 1,
        forceEncounter: true
      }
      const encounter = await generateEncounter(locId, ctx.gs.state, encounterOptions)
      if (encounter && (encounter.type === 'wild' || encounter.type === 'fishing' || encounter.type === 'archaeology' || encounter.type === 'guardian') && encounter.pokemon) {
        ctx.upcomingPokemon.value = encounter.pokemon
        if (ctx.upcomingEncounterType) {
          ctx.upcomingEncounterType.value = encounter.type as 'wild' | 'fishing' | 'archaeology' | 'guardian'
        }
      }
    }

    // Si el encuentro generado o existente en Slot 2 es un minijuego, lo promocionamos de inmediato para jugar
    const nextType = ctx.upcomingEncounterType?.value || 'wild'
    if (nextType === 'fishing' || nextType === 'archaeology') {
      ctx.activeBattle.value.isFishing = nextType === 'fishing'
      ctx.activeBattle.value.isArchaeology = nextType === 'archaeology'
      if (ctx.upcomingPokemon.value) {
        ctx.activeBattle.value._initialEnemy = ctx.upcomingPokemon.value
        ctx.activeBattle.value.enemy = ctx.upcomingPokemon.value
      }
      // Consumimos el Slot 2
      ctx.upcomingPokemon.value = null
      if (ctx.upcomingEncounterType) ctx.upcomingEncounterType.value = null
      
      ctx.isProcessing.value = false
      await fsm.transition(BATTLE_STATES.INITIALIZING)
      await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MINIGAME_CHECK)
      return
    }

    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.GEN_NEW_S2)
    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_COORDS, 100)

    // FASE: SEARCH_PHASE (Solo para salvajes normales)
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.PARALLEL_PREP)
    
    if (!ctx.activeBattle.value._initialEnemy && ctx.upcomingPokemon.value) {
      ctx.activeBattle.value._initialEnemy = { ...ctx.upcomingPokemon.value }
    }
    if (ctx.activeBattle.value._initialEnemy) {
      ctx.activeBattle.value.enemy = ctx.activeBattle.value._initialEnemy
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
export async function triggerNextEncounter(ctx: BattleContext) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  
  ctx.isProcessing.value = false
  const locId = ctx.activeBattle.value?.locationId
  if (!ctx.upcomingPokemon.value || !locId) {
    logger.warn('Battle', 'triggerNextEncounter: sin upcomingPokemon o locationId.')
    return
  }
  
  await fsm.transition(BATTLE_STATES.INITIALIZING)
  const nextType = ctx.upcomingEncounterType?.value || 'wild'
  if (nextType === 'fishing' || nextType === 'archaeology') {
    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MINIGAME_CHECK)
  }
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.ENCOUNTER_ANIM)
  
  const nextPoke = ctx.upcomingPokemon.value
  ctx.upcomingPokemon.value = null
  if (ctx.upcomingEncounterType) ctx.upcomingEncounterType.value = null
  await ctx._startBattle(nextPoke, {
    locationId: locId,
    wasSearching: true,
    isDebug: !!ctx.debugLoopPokemon.value,
    isFishing: nextType === 'fishing',
    isArchaeology: nextType === 'archaeology'
  })
}

export async function startEncounter(ctx: BattleContext) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  const nextType = ctx.upcomingEncounterType?.value
    || (ctx.activeBattle.value?.isFishing ? 'fishing' : '')
    || (ctx.activeBattle.value?.isArchaeology ? 'archaeology' : '')
    || 'wild'
  const nextPoke = ctx.upcomingPokemon.value
  const locId = ctx.activeBattle.value?.locationId || 'route1'

  if (nextType === 'fishing' || nextType === 'archaeology') {
    if (ctx.activeBattle.value) {
      ctx.activeBattle.value.isFishing = nextType === 'fishing'
      ctx.activeBattle.value.isArchaeology = nextType === 'archaeology'
      if (nextPoke) {
        ctx.activeBattle.value.enemy = { ...nextPoke }
        ctx.activeBattle.value._initialEnemy = { ...nextPoke }
      } else if (!ctx.activeBattle.value.enemy && ctx.activeBattle.value._initialEnemy) {
        ctx.activeBattle.value.enemy = { ...ctx.activeBattle.value._initialEnemy }
      }
    }
    await fsm.transition(BATTLE_STATES.INITIALIZING)
    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MINIGAME_CHECK)
    return
  }

  ctx.isIntroAnimating.value = true
  
  const isTr = ctx.activeBattle.value?.isTrainer || false
  const trName = ctx.activeBattle.value?.trainerName || ''
  const isGym = ctx.activeBattle.value?.isGym || false
  const gymId = ctx.activeBattle.value?.gymId || ''
  
  await ctx.initBattle(locId, isTr, trName, isGym, gymId, true);
  
  ctx.isIntroAnimating.value = false
}
