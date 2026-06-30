import { buildRivalEncounter, buildTrainerEncounter } from '@/logic/battle/trainerSpawner'
import { generateEncounter } from '@/logic/encounters/encounters'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { useEventStore } from '@/stores/events'
import { useWarStore } from '@/stores/war'
import type { BattleContext } from '@/types/battle/battleContext'
import type { UIStore, MapStore, EventStore, WarStore } from '@/types/system/stores'
import type { MapLocation } from '@/types/pokemon/encounters'
import { logger } from '../utils/logger.ts'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { nextTick } from 'vue'

/**
 * Handles the completion of a battle flow (either going to map or search loop).
 */
export async function handleBattleFlowCompletion(ctx: BattleContext, option = 'map') {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  const uiStore = useUIStore() as unknown as UIStore

  if (option === 'search' && ctx.activeBattle.value) {
    ctx.isProcessing.value = true
    
    // 1. Limpiar el enemigo anterior y restaurar estados de animación
    ctx.activeBattle.value.enemy = null
    ctx.activeBattle.value._initialEnemy = null
    
    if (ctx.animations?.resetAll) {
      ctx.animations.resetAll()
    }
    
    // Restablecer flags de minijuegos para la fase de búsqueda
    ctx.activeBattle.value.isFishing = false
    ctx.activeBattle.value.isArchaeology = false
    ctx.activeBattle.value.rewardsProcessed = false
    ctx.activeBattle.value.over = false
    ctx.activeBattle.value.fled = false
    ctx.activeBattle.value.playerFled = false
    ctx.activeBattle.value._rewardCombatants = []
    
    // Restablecer flags de entrenador y gimnasio de inmediato
    ctx.activeBattle.value.isGym = false
    ctx.activeBattle.value.gymId = undefined
    ctx.activeBattle.value.difficulty = undefined
    ctx.activeBattle.value.rewardTM = undefined
    ctx.activeBattle.value.isTrainer = false
    ctx.activeBattle.value.enemyTeam = undefined
    ctx.activeBattle.value.trainerName = undefined
    ctx.activeBattle.value.trainerSprite = undefined
    ctx.activeBattle.value.trainerArchetype = undefined
    ctx.activeBattle.value.isRival = false
    ctx.activeBattle.value.cannotEscape = false
    
    await nextTick()
    
    // FASE: INITIALIZING
    await fsm.transition(BATTLE_STATES.INITIALIZING)
    
    const locId = ctx.activeBattle.value.locationId || ''
    
    // Generar el encuentro en segundo plano
    const mapStore = useMapStore() as unknown as MapStore
    const eventStore = useEventStore() as unknown as EventStore
    const warStore = useWarStore() as unknown as WarStore
    const win = (typeof window !== 'undefined' ? window : null) as unknown as Record<string, unknown>
    const debug = win?.__VITE_DEBUG__ as Record<string, unknown> | undefined
    const debugMults = (debug?.multipliers as Record<string, number> | undefined) || {}

    const encounterOptions = {
      activeEvents: mapStore.activeEvents,
      dominanceData: warStore.mapDominance,
      shinyMultiplier: (eventStore.globalMultipliers?.shiny || 1) * (debugMults.shiny || 1),
      eventTrainerBonus: (eventStore.globalMultipliers?.trainer || 1) * (debugMults.trainer || 1),
      eventFishingBonus: (eventStore.globalMultipliers?.fishing || 1) * (debugMults.fishing || 1),
      eventRivalBonus: (eventStore.globalMultipliers?.rival || 1) * (debugMults.rival || 1),
      weather: mapStore.currentWeather,
      cycle: mapStore.currentCycle
    }
    
    let encounter = null
    
    // Cazabichos: Aroma Atractivo (0.5% chance for Scyther/Pinsir spawn)
    if (ctx.gs.state.playerClass === 'cazabichos' && Math.random() < 0.005) {
      const { makePokemon } = await import('@/logic/pokemon/pokemonFactory')
      const { pokemonDataProvider } = await import('@/logic/providers/pokemonDataProvider')
      const mapsList = pokemonDataProvider.getMaps() as unknown as MapLocation[]
      const currentMapData = mapsList.find(m => m.id === (locId || ''))
      const minLv = currentMapData?.lv?.[0] || 5
      const maxLv = currentMapData?.lv?.[1] || minLv
      const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv
      const bugs = ['scyther', 'pinsir']
      const chosenBug = bugs[Math.floor(Math.random() * bugs.length)]
      const generatedBug = makePokemon(chosenBug || '', level)
      if (generatedBug) {
        encounter = { type: 'wild', pokemon: generatedBug }
        ctx.uiStore.notify(`¡Aroma Atractivo atrajo a un ${generatedBug.name} salvaje!`, '🐝')
      }
    }
    
    if (!encounter) {
      encounter = await generateEncounter(locId || '', ctx.gs.state, encounterOptions)
    }
    
    let isFishing = false
    let isArchaeology = false
    let generatedPoke: Pokemon | null = null

    if (encounter) {
      if (encounter.type === 'trainer') {
        const { name, sprite, quote, archetype, enemyTeam } = await buildTrainerEncounter(ctx.gs.state, locId || '')

        if (enemyTeam.length > 0 && enemyTeam[0]) {
          generatedPoke = enemyTeam[0]
          ctx.activeBattle.value.isTrainer = true
          ctx.activeBattle.value.enemyTeam = enemyTeam
          ctx.activeBattle.value.trainerName = name
          ctx.activeBattle.value.trainerSprite = sprite
          ctx.activeBattle.value.trainerArchetype = archetype
          ctx.activeBattle.value.quote = quote
          ctx.activeBattle.value.isRival = false
        }
      } else if (encounter.type === 'rival') {
        const { name, sprite, enemyTeam } = await buildRivalEncounter(ctx.gs.state.team)

        if (enemyTeam.length > 0 && enemyTeam[0]) {
          generatedPoke = enemyTeam[0]
          ctx.activeBattle.value.isTrainer = true
          ctx.activeBattle.value.enemyTeam = enemyTeam
          ctx.activeBattle.value.trainerName = name
          ctx.activeBattle.value.trainerSprite = sprite
          ctx.activeBattle.value.trainerArchetype = 'rival'
          ctx.activeBattle.value.isRival = true
        }
      } else {
        // Limpiar parámetros de entrenador y gimnasio
        ctx.activeBattle.value.isTrainer = false
        ctx.activeBattle.value.enemyTeam = undefined
        ctx.activeBattle.value.trainerName = undefined
        ctx.activeBattle.value.trainerSprite = undefined
        ctx.activeBattle.value.isRival = false
        ctx.activeBattle.value.isGym = false
        ctx.activeBattle.value.gymId = undefined
        ctx.activeBattle.value.difficulty = undefined
        ctx.activeBattle.value.rewardTM = undefined

        if (encounter.pokemon) {
          generatedPoke = encounter.pokemon
          if (encounter.type === 'guardian') {
            generatedPoke.isGuardian = true
          }
          isFishing = encounter.type === 'fishing'
          isArchaeology = encounter.type === 'archaeology'
        }
      }
    }

    if (generatedPoke) {
      ctx.activeBattle.value._initialEnemy = generatedPoke
      ctx.activeBattle.value.enemy = generatedPoke
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

    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.PREPARATION)
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.AUTO_BATTLE_CHECK)
    
    const isTrainer = ctx.activeBattle.value?.isTrainer || ctx.activeBattle.value?.isGym || false
    const uiStore = useUIStore() as unknown as UIStore
    const autoBattle = uiStore.autoBattle && !isTrainer

    if (!autoBattle) {
      await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.UPDATE_BUTTON)
    }
    
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.ENTRY_ANIM)
    if (isTrainer) {
      if (ctx.animations?.triggerTrainerEntry) {
        await ctx.animations.triggerTrainerEntry()
      }
    }
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.REORDER_TEAM)

    if (ctx.activeBattle.value?.trainerArchetype === 'policeman') {
      ctx.audio.play('siren')
    }

    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.COMBAT_OR_FLEE)
    ctx.isProcessing.value = false

    if (autoBattle) {
      await nextTick()
      await startEncounter(ctx)
    }
    
    return
  }

  const isGym = ctx.activeBattle.value?.isGym || false

  fsm.transition(BATTLE_STATES.EXIT_BATTLE)
  ctx.activeBattle.value = null
  ctx.isProcessing.value = false
  ctx.clearLogs() 

  if (option === 'map') {
    uiStore.activeTab = isGym ? 'gyms' : 'map'
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

  if (isMinigame) {
    if (ctx.activeBattle.value && enemyPoke) {
      ctx.activeBattle.value.enemy = enemyPoke
      ctx.activeBattle.value._initialEnemy = enemyPoke
    }
    await fsm.transition(BATTLE_STATES.INITIALIZING)
    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MINIGAME_CHECK)
    return
  }

  ctx.isIntroAnimating.value = true
  
  await ctx.initBattle();
  
  ctx.isIntroAnimating.value = false
}
