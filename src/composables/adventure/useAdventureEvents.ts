import { ref } from 'vue'
import type { Ref } from 'vue'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import { MAPS_BY_ROUTE_ID } from '@/data/world/maps'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { MapLocation, AdventureEventType } from '@/types/pokemon/encounters'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle/battle'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { useShopStore } from '@/stores/inventory/shop'
import { useMapStore } from '@/stores/map'
import { isMapRouteId } from '@/data/world/map-assets'
import type { AdventureNodeId } from '../../../test aventura/kantoGraph.ts'
import { requireNpcSpriteId, type NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog'
import type { ItemId } from '@/data/inventory/items'
import type { BattleMinigame } from '@/types/battle/battle'


import { TRAINER_TYPES } from '@/data/player/trainerTypes'
import { getRandomQuoteForTrainer } from '@/data/player/trainerPhrases'
import { getSpritesForArchetype } from '@/logic/utils/npcSpriteRouter'

export const ADVENTURE_TRIGGER_TYPES = ['combat', 'obstacle_cut', 'obstacle_strength', 'obstacle_rock_smash', 'fishing'] as const;
export type AdventureTriggerType = (typeof ADVENTURE_TRIGGER_TYPES)[number];

const ADVENTURE_TRAINER_ENCOUNTER_PROBABILITY = 0.3

interface AdventureEventsConfig {
  isTraveling: Ref<boolean>
  isPaused: Ref<boolean>
  currentSegmentIndex: Ref<number>
  calculatedPath: Ref<AdventureNodeId[]>
  currentMapId: Ref<AdventureNodeId>
  originMap: Ref<AdventureNodeId>
  activeHMs: Ref<Set<string>>
  travelLog: Ref<string[]>
  injectedItems: Ref<Set<ItemId>>
  activeTravelModifiers: Ref<{ encounterRateMod: number; expMultiplier: number; moneyMultiplier: number; shinyChanceMod: number; typeFocus: string | null }>
  activeSweetScent: Ref<boolean>
  startMinigame: (type: BattleMinigame) => void
  triggerExtraLoot: (itemId: ItemId, defaultQtyValue?: number) => void
  resumeTravelAfterEvent: () => void
  cancelTravel: () => void
  hasHealthyTeam: Ref<boolean>
  mapLocationsById: Ref<Record<string, MapLocation>>
  getSpawnPoolForMap: (loc: MapLocation) => { generic: string[]; specific: string[]; rates: Record<string, number> }
  getTravelTween: () => gsap.core.Tween | null
  getMarkerTimeline: () => gsap.core.Timeline | null
  gameStore: ReturnType<typeof useGameStore>
  battleStore: ReturnType<typeof useBattleStore>
  inventoryStore: ReturnType<typeof useInventoryStore>
  shopStore: ReturnType<typeof useShopStore>
  mapStore: ReturnType<typeof useMapStore>
}

export interface ActiveAdventureEvent {
  type: AdventureEventType
  title: string
  desc: string
  moRequired?: string
  resolved: boolean
  wildPokemon?: Pokemon
  isTrainer?: boolean
  trainerName?: string
  trainerSprite?: NpcSpriteId
  enemyTeam?: Pokemon[]
  quote?: string
}

const ADVENTURE_EVENT_PROBABILITY_THRESHOLD = 0.70;

import {
  determineAvailableEventTypes,
  pickRandomAdventureType,
  buildAdventureEventTemplates,
  generateWildAdventureEncounter,
  resolveAdventureObstacleCut,
  resolveAdventureObstacleStrength,
  resolveAdventureCombatEvent
} from './adventureEventHelpers.ts'

export function useAdventureEvents(config: AdventureEventsConfig) {
  const activeEvent = ref<ActiveAdventureEvent | null>(null)

  const pendingEscapedCombatEvent = ref(false)

  async function generateTrainerEncounter(mapData: MapLocation) {
    const keys = Object.keys(TRAINER_TYPES) as Array<keyof typeof TRAINER_TYPES>
    const typeKey = keys[Math.floor(Math.random() * keys.length)] || 'caza_bichos'
    const t = TRAINER_TYPES[typeKey]
    
    const baseLv = mapData.lv?.[0] || 5
    const trainerLv = baseLv + 2
    const teamSize = Math.floor(Math.random() * 3) + 1
    
    // Pick a random sprite from the full archetype catalog (not just the hardcoded fallback)
    const archetypeSprites = getSpritesForArchetype(t.archetype)
    const selectedSprite = archetypeSprites[Math.floor(Math.random() * archetypeSprites.length)]
    if (!selectedSprite) {
      throw new Error(`[useAdventureEvents] No NPC sprite registered for trainer archetype: ${t.archetype}`)
    }
    const trainerSprite = requireNpcSpriteId(selectedSprite)

    const { buildTrainerTeam } = await import('@/logic/battle/trainerFactory')
    const enemyTeam = await buildTrainerTeam(t.pool, trainerLv, teamSize)
    const quote = getRandomQuoteForTrainer(typeKey)
    return {
      trainerName: t.name,
      trainerSprite,
      enemyTeam,
      quote
    }
  }

  const triggerRandomEvent = async (targetMapId?: AdventureNodeId) => {
    const travelTween = config.getTravelTween()
    const markerTimeline = config.getMarkerTimeline()

    if (travelTween) travelTween.pause()
    if (markerTimeline) markerTimeline.pause()
    config.isPaused.value = true

    const nextSegmentMapId = config.isTraveling.value && config.calculatedPath.value[config.currentSegmentIndex.value + 1]
      ? config.calculatedPath.value[config.currentSegmentIndex.value + 1]
      : config.currentMapId.value

    const mapId: AdventureNodeId = targetMapId || nextSegmentMapId || 'route1'
    const mapData = (MAPS_BY_ROUTE_ID as Record<string, MapLocation>)[mapId] as MapLocation | undefined // open-record: Generic key-value data dictionary container

    if (!mapData) return

    const eventTypes = determineAvailableEventTypes(mapId, mapData)
    const chosenType = pickRandomAdventureType(eventTypes, ADVENTURE_EVENT_PROBABILITY_THRESHOLD)
    const eventTemplates = buildAdventureEventTemplates(mapId, mapData, targetMapId)

    let combatDesc = eventTemplates.combat.desc
    let wildPoke: Pokemon | null = null
    let isTrainer = false
    let trainerName = ''
    let trainerSprite: NpcSpriteId | undefined
    let enemyTeam: Pokemon[] = []
    let trainerData: { trainerName: string; trainerSprite: NpcSpriteId; enemyTeam: Pokemon[]; quote: string } | null = null

    if (chosenType === 'combat') {
      if (Math.random() < ADVENTURE_TRAINER_ENCOUNTER_PROBABILITY) {
        isTrainer = true
        trainerData = await generateTrainerEncounter(mapData)
        trainerName = trainerData.trainerName
        trainerSprite = trainerData.trainerSprite
        enemyTeam = trainerData.enemyTeam
        combatDesc = `💥 ¡El entrenador ${trainerName} te desafía a un combate en el camino!`
      } else {
        const poolData = config.getSpawnPoolForMap(mapData)
        const spawns = [...poolData.generic, ...poolData.specific]
        const wildResult = generateWildAdventureEncounter(
          mapData,
          spawns,
          config.activeTravelModifiers.value.typeFocus,
          config.activeTravelModifiers.value.shinyChanceMod
        )
        if (wildResult) {
          wildPoke = wildResult.wildPoke
          combatDesc = wildResult.combatDesc
        }
      }
    }

    const template = eventTemplates[chosenType]
    activeEvent.value = {
      type: chosenType,
      title: template.title,
      desc: chosenType === 'combat' ? combatDesc : template.desc,
      moRequired: template.moRequired,
      resolved: false,
      wildPokemon: wildPoke || undefined,
      isTrainer,
      trainerName: isTrainer ? trainerName : undefined,
      trainerSprite: isTrainer ? trainerSprite : undefined,
      enemyTeam: isTrainer ? enemyTeam : undefined,
      quote: isTrainer && trainerData ? trainerData.quote : undefined
    }

    config.travelLog.value.push(`🛑 Evento: ${template.title}`)
  }

  const resolveEvent = () => {
    if (!activeEvent.value) return
    const evt = activeEvent.value
    const isManualExploration = !config.isTraveling.value
    const onFinished = () => { activeEvent.value = null }

    if (evt.moRequired && !config.activeHMs.value.has(evt.moRequired)) {
      config.travelLog.value.push(`🚶 Ignorando obstáculo: No tienes la MO ${evt.moRequired.toUpperCase()}. Rodeas el obstáculo y continúas.`)
      if (isManualExploration) { onFinished(); return }
      config.resumeTravelAfterEvent()
      return
    }

    if (evt.type === 'obstacle_rock_smash') {
      config.startMinigame('archaeology')
      return
    }

    if (evt.type === 'fishing') {
      config.startMinigame('fishing')
      return
    }

    if (evt.type === 'obstacle_cut') {
      resolveAdventureObstacleCut(config, isManualExploration, onFinished)
      return
    }

    if (evt.type === 'obstacle_strength') {
      resolveAdventureObstacleStrength(config, isManualExploration, onFinished)
      return
    }

    if (evt.type === 'combat') {
      resolveAdventureCombatEvent(config, evt)
      return
    }

    if (isManualExploration) {
      onFinished()
      return
    }
    config.resumeTravelAfterEvent()
  }

  const triggerExplore = async () => {
    if (config.isTraveling.value) return
    
    const mapData = config.mapLocationsById.value[config.originMap.value]
    if (!mapData) return

    if (!config.hasHealthyTeam.value) {
      config.travelLog.value.push('⚠️ No puedes explorar: Todos tus Pokémon están debilitados.')
      return
    }

    if (Math.random() < ADVENTURE_TRAINER_ENCOUNTER_PROBABILITY) {
      const trainerData = await generateTrainerEncounter(mapData)
      activeEvent.value = {
        type: 'combat',
        title: '¡Desafío de Entrenador!',
        desc: `El entrenador ${trainerData.trainerName} te ha visto explorar y te desafía.`,
        resolved: false,
        isTrainer: true,
        trainerName: trainerData.trainerName,
        trainerSprite: trainerData.trainerSprite,
        enemyTeam: trainerData.enemyTeam
      }
      config.travelLog.value.push(`🌿 ¡Comienza un combate contra el entrenador ${trainerData.trainerName}!`)
      return
    }

    const poolData = config.getSpawnPoolForMap(mapData)
    const spawns = [...poolData.generic, ...poolData.specific]
    
    if (spawns.length === 0) {
      config.travelLog.value.push(`🔍 Buscaste en ${mapData.name}, pero no parece haber Pokémon salvajes aquí.`)
      return
    }

    const randomSpawn = spawns[Math.floor(Math.random() * spawns.length)]!
    const name = randomSpawn.charAt(0).toUpperCase() + randomSpawn.slice(1)

    const minLv = mapData.lv?.[0] || 5
    const maxLv = mapData.lv?.[1] || 10
    const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv
    
    const wildPoke = makePokemon(randomSpawn, level) as Pokemon

    activeEvent.value = {
      type: 'combat',
      title: '¡Un Pokémon salvaje apareció!',
      desc: `Has encontrado un ${name} salvaje mientras explorabas la zona.`,
      resolved: false,
      wildPokemon: wildPoke
    }
    config.travelLog.value.push(`🌿 ¡Comienza un combate contra ${name} salvaje!`)
  }

  const resolveCombatRouteEvent = (message: string) => {
    if (activeEvent.value?.type !== 'combat') return

    pendingEscapedCombatEvent.value = false
    const team = config.gameStore.state.team || []
    const healthy = team.some((p: Pokemon) => p && p.hp > 0)
    if (!healthy) {
      config.travelLog.value.push('💀 ¡Todo tu equipo ha sido debilitado! Viaje cancelado.')
      config.cancelTravel()
      const originNode = config.originMap.value
      if (isMapRouteId(originNode)) config.mapStore.currentMap = originNode
      config.shopStore.healAllPokemon(0)
      const originName = (MAPS_BY_ROUTE_ID as Record<string, MapLocation>)[originNode]?.name || originNode // open-record: Generic key-value data dictionary container
      config.travelLog.value.push(`🏥 Regresaste de inmediato a ${originName}. Tu equipo ha sido curado.`)
      activeEvent.value = null
      return
    }

    config.travelLog.value.push(message)
    if (config.isTraveling.value) {
      config.resumeTravelAfterEvent()
    } else {
      activeEvent.value = null
    }
  }

  return {
    activeEvent,
    pendingEscapedCombatEvent,
    triggerRandomEvent,
    resolveEvent,
    triggerExplore,
    resolveCombatRouteEvent
  }
}
