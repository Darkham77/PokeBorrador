import { buildRivalEncounter, buildTrainerEncounter } from '@/logic/battle/trainerSpawner'
import { useUIStore } from '@/stores/ui'
import type { BattleContext } from '@/types/battle/battleContext'
import { generateSearchLoopEncounter } from './searchLoopEncounterHelper.ts'
import { logger } from '../utils/logger.ts'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { nextTick } from 'vue'
import { requireMapRouteId } from '@/data/world/map-assets'
import { requireNpcSpriteId } from '@/data/pokemon/npcSpriteCatalog'
import { emitBattleFlowCompleted } from '@/logic/events/battleUiEvents'
import { isBattleMinigame, setBattleMinigame, resetBattleMinigameFlags, type BattleMinigame } from './battleMinigames.ts'

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

  const isGym = ctx.activeBattle.value?.isGym ?? false

  if (option === 'map') {
    ctx.isProcessing.value = true
    await fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    ctx.activeBattle.value = null
    ctx.gs.state.activeBattle = null
    ctx.isProcessing.value = false
    ctx.clearLogs()
    uiStore.activeTab = isGym ? 'gyms' : 'map'
    emitBattleFlowCompleted('map')
    await ctx.gs.save?.(false)
    return
  }

  if (option === 'search') {
    const rawLoc = ctx.activeBattle.value?.locationId || ctx.gs.state.map?.currentMap
    if (!rawLoc) {
      throw new Error('[Battle] locationId or gameStore.state.map.currentMap is required for search loop')
    }
    const defaultLoc = requireMapRouteId(rawLoc)

    if (!ctx.activeBattle.value) {
      ctx.activeBattle.value = {
        player: null,
        enemy: null,
        playerTeamIndex: 0,
        enemyTeamIndex: 0,
        participants: [],
        locationId: defaultLoc,
        weather: { type: 'clear', turns: -1 },
        turnCount: 0,
        escapeAttempts: 0,
        over: false,
        fled: false,
        isTrainer: false,
        isGym: false,
        minigame: null,
        rewardsProcessed: false,
        _rewardCombatants: [],
        wasSearching: true
      }
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
    resetBattleMinigameFlags(ctx.activeBattle.value)
    ctx.activeBattle.value.rewardsProcessed = false
    ctx.activeBattle.value.over = false
    ctx.activeBattle.value.fled = false
    ctx.activeBattle.value.playerFled = false
    ctx.activeBattle.value._rewardCombatants = []
    ctx.activeBattle.value.wasSearching = true
    
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
    
    if (!ctx.activeBattle.value?.locationId) {
      throw new Error('[Battle] Active battle locationId is missing for search encounter');
    }
    const locId = requireMapRouteId(ctx.activeBattle.value.locationId);
    
    const encounter = await generateSearchLoopEncounter(ctx, locId)
    
    let generatedPoke: Pokemon | null = null
    let minigame: BattleMinigame | null = null

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
          if (encounter.type === 'fishing' || encounter.type === 'archaeology') {
            minigame = encounter.type
          }
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
    if (minigame) {
      setBattleMinigame(ctx.activeBattle.value, minigame)
      ctx.isProcessing.value = false
      await fsm.transition(BATTLE_STATES.INITIALIZING)
      await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MINIGAME_CHECK)
      return
    }

    await fsm.transition(BATTLE_STATES.INITIALIZING)
    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_COORDS)

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
    if (ctx.persistBattle) ctx.persistBattle()
    emitBattleFlowCompleted('search')

    if (autoBattle) {
      await nextTick()
      await startEncounter(ctx)
    }
    
    return
  }

  await fsm.transition(BATTLE_STATES.EXIT_BATTLE)
  ctx.activeBattle.value = null
  ctx.gs.state.activeBattle = null
  ctx.isProcessing.value = false
  ctx.clearLogs() 

  if (option === 'map') {
    uiStore.activeTab = isGym ? 'gyms' : 'map'
    emitBattleFlowCompleted('map')
    await ctx.gs.save?.(false)
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
  const isMinigame = isBattleMinigame(ctx.activeBattle.value)
  if (isMinigame) {
    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MINIGAME_CHECK)
  }
  
  await ctx._startBattle(enemyPoke, {
    locationId: locId,
    wasSearching: true,
    isDebug: !!ctx.debugLoopPokemon.value,
    minigame: ctx.activeBattle.value?.minigame ?? null
  })
}

export async function startEncounter(ctx: BattleContext) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  const isSearchConfirmation = fsm.currentState.value === BATTLE_STATES.SEARCH_PHASE &&
    fsm.currentSubState.value === BATTLE_SUBSTATES.COMBAT_OR_FLEE
  const isMinigameCompletion = fsm.currentState.value === BATTLE_STATES.INITIALIZING &&
    fsm.currentSubState.value === BATTLE_SUBSTATES.MINIGAME_CHECK

  if (!isSearchConfirmation && !isMinigameCompletion) {
    throw new Error(`[Battle] startEncounter requires SEARCH_PHASE/COMBAT_OR_FLEE or INITIALIZING/MINIGAME_CHECK; received ${fsm.currentState.value}/${fsm.currentSubState.value ?? 'none'}.`)
  }

  if (ctx.isProcessing.value) {
    return
  }

  ctx.isProcessing.value = true
  try {
    const isMinigame = isBattleMinigame(ctx.activeBattle.value)
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

    const initialPlayer = ctx.activeBattle.value?.player || ctx.gs.state.team.find((p: Pokemon) => p && p.hp > 0) || ctx.gs.state.team[0] || null
    const initialEnemy = enemyPoke || (ctx.activeBattle.value?.enemyTeam && ctx.activeBattle.value.enemyTeam[0]) || null

    ctx.isIntroAnimating.value = true
    await ctx.initBattle({
      initialPlayer,
      initialEnemy,
      wasSearching: true
    })
    ctx.isIntroAnimating.value = false
  } finally {
    ctx.isProcessing.value = false
  }
}
