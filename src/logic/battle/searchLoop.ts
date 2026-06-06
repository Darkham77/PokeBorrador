import { generateEncounter } from '@/logic/encounters'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { getRandomQuoteForTrainer } from '@/data/trainerPhrases.ts'
import { useEventStore } from '@/stores/events'
import { useWarStore } from '@/stores/war'
import type { BattleContext } from '@/types/battleContext'
import type { UIStore, MapStore, EventStore, WarStore } from '@/types/stores'
import type { MapLocation } from '@/types/encounters'
import { logger } from '../utils/logger.ts'
import type { Pokemon } from '@/types/pokemon'
import { nextTick } from 'vue'
import { getSpritesForArchetype } from '@/logic/utils/npcSpriteRouter'

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
    ctx.activeBattle.value.isRival = false
    
    await nextTick()
    
    // FASE: INITIALIZING
    await fsm.transition(BATTLE_STATES.INITIALIZING)
    
    const locId = ctx.activeBattle.value.locationId
    
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
      eventRivalBonus: (eventStore.globalMultipliers?.rival || 1) * (debugMults.rival || 1)
    }
    const encounter = await generateEncounter(locId, ctx.gs.state, encounterOptions)
    
    let isFishing = false
    let isArchaeology = false
    let generatedPoke: Pokemon | null = null

    if (encounter) {
      if (encounter.type === 'trainer') {
        ctx.gs.state.trainerChance = 5
        
        const { buildTrainerTeam } = await import('./trainerFactory')
        const { pokemonDataProvider } = await import('@/logic/providers/pokemonDataProvider')

        const isMaxCriminality = (ctx.gs.state.playerClass === 'rocket' && (ctx.gs.state.classData?.criminality ?? 0) >= 100)
        const mapsList = pokemonDataProvider.getMaps() as unknown as MapLocation[]
        const currentMapData = mapsList.find(m => m.id === locId)
        const baseLv = currentMapData?.lv?.[0] || 5

        let tName = 'Entrenador'
        let tSprite = 'youngster'
        const enemyTeam: Pokemon[] = []

        let tQuote = '¡Prepárate para combatir! ¡No te lo pondré fácil!'
        if (isMaxCriminality) {
          tName = 'Oficial de Policía'
          tSprite = 'tamer'
          tQuote = getRandomQuoteForTrainer('police')
          const criminality = ctx.gs.state.classData?.criminality || 100
          const excess = Math.max(0, criminality - 100)
          const bonusLv = Math.floor(excess / 50)
          const trainerLv = baseLv + 5 + bonusLv
          const teamSize = Math.floor(Math.random() * 2) + 3
          const policePool = ['growlithe', 'arcanine', 'machoke', 'magneton', 'pidgeot']

          const team = await buildTrainerTeam(policePool, trainerLv, teamSize)
          enemyTeam.push(...team)
        } else {
          const TRAINER_TYPES = {
            'caza_bichos': { name: 'Caza Bichos', sprite: 'cazabichos', pool: ['caterpie', 'metapod', 'weedle', 'kakuna', 'paras', 'venonat'] },
            'ornitologo': { name: 'Ornitólogo', sprite: 'birdkeeper', pool: ['pidgey', 'spearow', 'doduo'] },
            'cientifico': { name: 'Científico', sprite: 'scientist', pool: ['magnemite', 'voltorb', 'ditto', 'grimer'] },
            'luchador': { name: 'Luchador', sprite: 'blackbelt', pool: ['mankey', 'machop'] },
            'pescador': { name: 'Pescador', sprite: 'swimmer', pool: ['magikarp', 'goldeen', 'poliwag'] },
            'nadador': { name: 'Nadador', sprite: 'swimmer', pool: ['psyduck', 'tentacool', 'staryu', 'horsea'] },
            'domador': { name: 'Domador', sprite: 'tamer', pool: ['growlithe', 'vulpix', 'ponyta', 'ekans'] },
            'medium': { name: 'Médium', sprite: 'psychic', pool: ['abra', 'drowzee'] },
            'motorista': { name: 'Motorista', sprite: 'biker', pool: ['koffing', 'grimer', 'rattata'] },
            'montanero': { name: 'Montañero', sprite: 'hiker', pool: ['geodude', 'sandshrew', 'rhyhorn'] },
            'rocket': { name: 'Recluta Rocket', sprite: 'rocketgrunt', pool: ['koffing', 'ekans', 'zubat', 'rattata', 'meowth', 'drowzee', 'machop', 'grimer'] },
            'criador': { name: 'Criador Pokémon', sprite: 'pokemonbreeder', pool: ['eevee', 'pidgey', 'oddish', 'bellsprout', 'growlithe', 'poliwag', 'caterpie', 'weedle'] },
            'aristocrata': { name: 'Aristócrata', sprite: 'gentleman', pool: ['meowth', 'growlithe', 'eevee', 'clefairy', 'jigglypuff', 'vulpix'] },
            'ranger': { name: 'Ranger Pokémon', sprite: 'pokemonranger', pool: ['nidoran_f', 'nidoran_m', 'oddish', 'bellsprout', 'paras', 'tangela', 'exeggcute'] },
            'pokefan': { name: 'Pokéfan', sprite: 'pokefan', pool: ['pikachu', 'jigglypuff', 'clefairy', 'meowth', 'eevee', 'psyduck'] },
            'artista': { name: 'Artista', sprite: 'artist', pool: ['bellsprout', 'vulpix', 'oddish', 'jigglypuff', 'clefairy'] },
            'trainers': { name: 'Entrenador Élite', sprite: 'youngster-masters', pool: ['dragonite', 'charizard', 'alakazam', 'machamp', 'gengar', 'lapras'] }
          } as const
          const keys = Object.keys(TRAINER_TYPES) as Array<keyof typeof TRAINER_TYPES>
          const typeKey = keys[Math.floor(Math.random() * keys.length)] || 'caza_bichos'
          const t = TRAINER_TYPES[typeKey]
          tName = t.name
          const availableSprites = getSpritesForArchetype(typeKey)
          const chosenSprite = availableSprites[Math.floor(Math.random() * availableSprites.length)]
          if (!chosenSprite) {
            throw new Error(`[searchLoop] Failed to find sprites for archetype: ${typeKey}`)
          }
          tSprite = chosenSprite
          tQuote = getRandomQuoteForTrainer(typeKey)
          const trainerLv = baseLv + 2
          const teamSize = Math.floor(Math.random() * 3) + 1

          const { buildTrainerTeam } = await import('./trainerFactory')
          const team = await buildTrainerTeam(t.pool, trainerLv, teamSize)
          enemyTeam.push(...team)
        }

        if (enemyTeam.length > 0 && enemyTeam[0]) {
          generatedPoke = enemyTeam[0]
          ctx.activeBattle.value.isTrainer = true
          ctx.activeBattle.value.enemyTeam = enemyTeam
          ctx.activeBattle.value.trainerName = tName
          ctx.activeBattle.value.trainerSprite = tSprite
          ctx.activeBattle.value.quote = tQuote
          ctx.activeBattle.value.isRival = false
        }
      } else if (encounter.type === 'rival') {
        const { getEvolvedForm } = await import('@/logic/evolutionLogic')
        const { makePokemon } = await import('@/logic/pokemonFactory')

        const trainerNameVal = 'Rival Azul'
        const trainerSpriteVal = 'blue'
        
        const teamSize = Math.max(3, ctx.gs.state.team.length || 1)
        const avgLevel = ctx.gs.state.team.reduce((sum, p) => sum + p.level, 0) / (ctx.gs.state.team.length || 1)
        const rivalLevel = Math.floor(avgLevel) + 2

        const rivalPoolBase = ['pidgeot', 'alakazam', 'gyarados', 'arcanine', 'exeggutor', 'charizard']
        const shuffledPool = [...rivalPoolBase].sort(() => Math.random() - 0.5).slice(0, teamSize)

        const enemyTeam: Pokemon[] = shuffledPool.map(id => {
          const species = getEvolvedForm(id, rivalLevel)
          const p = makePokemon(species, rivalLevel) as Pokemon
          if (p) (p as Pokemon & { _revealed?: boolean })._revealed = true
          return p
        }).filter((p): p is Pokemon => !!p)

        if (enemyTeam.length > 0 && enemyTeam[0]) {
          generatedPoke = enemyTeam[0]
          ctx.activeBattle.value.isTrainer = true
          ctx.activeBattle.value.enemyTeam = enemyTeam
          ctx.activeBattle.value.trainerName = trainerNameVal
          ctx.activeBattle.value.trainerSprite = trainerSpriteVal
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
    
    if (!autoBattle) {
      await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.COMBAT_OR_FLEE)
      ctx.isProcessing.value = false
    } else {
      await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.COMBAT_OR_FLEE)
      ctx.isProcessing.value = false
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
