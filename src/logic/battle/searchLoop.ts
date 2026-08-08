import { buildRivalEncounter, buildTrainerEncounter } from '@/logic/battle/trainerSpawner'
import { useUIStore } from '@/stores/ui'
import type { BattleContext } from '@/types/battle/battleContext'
import { generateSearchLoopEncounter } from './searchLoopEncounterHelper.ts'
import { logger } from '../utils/logger.ts'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { nextTick } from 'vue'
import { requireMapRouteId } from '@/data/world/map-assets'
import { requireNpcSpriteId } from '@/data/pokemon/npcSpriteCatalog'

/**
 * Handles the completion of a battle flow (either going to map or search loop).
 */
export async function handleBattleFlowCompletion(ctx: BattleContext, option = 'map') {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  const uiStore = useUIStore()

  if (option === 'map' && !ctx.activeBattle.value) {
    return
  }

  if (option === 'search' && !ctx.activeBattle.value) {
    const defaultLoc = requireMapRouteId(ctx.gs.state.locationId || 'route1')
    ctx.activeBattle.value = {
      locationId: defaultLoc,
      wasSearching: true,
      over: false,
      fled: false,
      playerFled: false,
      isTrainer: false,
      isGym: false,
      isFishing: false,
      isArchaeology: false,
      rewardsProcessed: false,
      _rewardCombatants: []
    }
  }

  if (ctx.activeBattle.value) {
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
    
    const locId = requireMapRouteId(ctx.activeBattle.value.locationId || '')
    
    const encounter = await generateSearchLoopEncounter(ctx, locId)
    
    let isFishing = false
    let isArchaeology = false
    let generatedPoke: Pokemon | null = null

    if (encounter) {
      if (encounter.type === 'trainer') {
        const { name, sprite, quote, archetype, enemyTeam } = await buildTrainerEncounter(ctx.gs.state, locId)

        if (enemyTeam.length > 0 && enemyTeam[0]) {
          generatedPoke = enemyTeam[0]
          ctx.activeBattle.value.isTrainer = true
          ctx.activeBattle.value.enemyTeam = enemyTeam
          ctx.activeBattle.value.trainerName = name
          ctx.activeBattle.value.trainerSprite = requireNpcSpriteId(sprite)
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
          ctx.activeBattle.value.trainerSprite = requireNpcSpriteId(sprite)
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
      if (!ctx.activeBattle.value.enemyTeam || ctx.activeBattle.value.enemyTeam.length === 0) {
        ctx.activeBattle.value.enemyTeam = [generatedPoke]
      }
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
    const uiStore = useUIStore()
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

  await fsm.transition(BATTLE_STATES.EXIT_BATTLE)
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

  if (fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE || fsm.currentState.value === BATTLE_STATES.REWARDS_PHASE) {
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE)
  }

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
