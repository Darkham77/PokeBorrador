import { generateEncounter } from '@/logic/encounters'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { useEventStore } from '@/stores/events'
import { useWarStore } from '@/stores/war'
import type { BattleContext } from '@/types/battleContext'
import type { UIStore, MapStore, EventStore, WarStore } from '@/types/stores'
import { logger } from '../utils/logger.ts'
import type { Pokemon } from '@/types/pokemon'

/**
 * Handles the completion of a battle flow (either going to map or search loop).
 */
export async function handleBattleFlowCompletion(ctx: BattleContext, option = 'map') {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  const uiStore = useUIStore() as unknown as UIStore

  if (option === 'search' && ctx.activeBattle.value) {
    ctx.isProcessing.value = true
    
    // 1. Limpiar el enemigo anterior de inmediato para evitar flashes visuales en color
    ctx.activeBattle.value.enemy = null
    ctx.activeBattle.value._initialEnemy = null
    
    // Restablecer flags de minijuegos para la fase de búsqueda
    ctx.activeBattle.value.isFishing = false
    ctx.activeBattle.value.isArchaeology = false
    ctx.activeBattle.value.rewardsProcessed = false
    ctx.activeBattle.value.over = false
    ctx.activeBattle.value._rewardCombatants = []
    
    // FASE: INITIALIZING
    await fsm.transition(BATTLE_STATES.INITIALIZING)
    
    const locId = ctx.activeBattle.value.locationId
    
    // Generar el encuentro en segundo plano
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
    
    let isFishing = false
    let isArchaeology = false
    let generatedPoke: Pokemon | null = null
    if (encounter && (encounter.type === 'wild' || encounter.type === 'fishing' || encounter.type === 'archaeology' || encounter.type === 'guardian') && encounter.pokemon) {
      generatedPoke = encounter.pokemon
      isFishing = encounter.type === 'fishing'
      isArchaeology = encounter.type === 'archaeology'
    }

    if (generatedPoke) {
      ctx.activeBattle.value._initialEnemy = { ...generatedPoke }
      ctx.activeBattle.value.enemy = { ...generatedPoke }
    }

    // Si el encuentro generado es un minijuego, lo jugamos de inmediato
    if (isFishing || isArchaeology) {
      ctx.activeBattle.value.isFishing = isFishing
      ctx.activeBattle.value.isArchaeology = isArchaeology
      ctx.isProcessing.value = false
      await fsm.transition(BATTLE_STATES.INITIALIZING)
      await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MINIGAME_CHECK)
      return
    }

    await fsm.transition(BATTLE_STATES.INITIALIZING)
    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_COORDS, 100)

    // FASE: SEARCH_PHASE (Solo para salvajes normales)
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.PARALLEL_PREP)
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.BUSH_IDLE)
    
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
  const enemyPoke = ctx.activeBattle.value?.enemy
  if (!enemyPoke || !locId) {
    logger.warn('Battle', 'triggerNextEncounter: sin enemy o locationId.')
    return
  }
  
  await fsm.transition(BATTLE_STATES.INITIALIZING)
  const isMinigame = ctx.activeBattle.value?.isFishing || ctx.activeBattle.value?.isArchaeology
  if (isMinigame) {
    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MINIGAME_CHECK)
  }
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.ENCOUNTER_ANIM)
  
  await ctx._startBattle(enemyPoke, {
    locationId: locId,
    wasSearching: true,
    isDebug: !!ctx.debugLoopPokemon.value,
    isFishing: ctx.activeBattle.value?.isFishing,
    isArchaeology: ctx.activeBattle.value?.isArchaeology
  })
}

export async function startEncounter(ctx: BattleContext) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  const isMinigame = ctx.activeBattle.value?.isFishing || ctx.activeBattle.value?.isArchaeology
  const enemyPoke = ctx.activeBattle.value?.enemy || ctx.activeBattle.value?._initialEnemy
  const locId = ctx.activeBattle.value?.locationId || 'route1'

  if (isMinigame) {
    if (ctx.activeBattle.value && enemyPoke) {
      ctx.activeBattle.value.enemy = { ...enemyPoke }
      ctx.activeBattle.value._initialEnemy = { ...enemyPoke }
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
