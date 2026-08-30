import { ref } from 'vue'
import type { Ref } from 'vue'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import { MAPS_BY_ROUTE_ID } from '@/data/world/maps'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { MapLocation } from '@/types/pokemon/encounters'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle/battle'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { useShopStore } from '@/stores/inventory/shop'
import type { AdventureMinigameType } from '@/types/system/game'
import { useMapStore } from '@/stores/map'
import { isMapRouteId, requireMapRouteId } from '@/data/world/map-assets'
import type { AdventureNodeId } from '../../../test aventura/kantoGraph.ts'
import { requireNpcSpriteId, type NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog'
import type { ItemId } from '@/data/inventory/items'


import { TRAINER_TYPES } from '@/data/player/trainerTypes'
import { getRandomQuoteForTrainer } from '@/data/player/trainerPhrases'
import { getSpritesForArchetype } from '@/logic/utils/npcSpriteRouter'

export type AdventureTriggerType = 'combat' | 'obstacle_cut' | 'obstacle_strength' | 'obstacle_rock_smash' | 'fishing';

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
  startMinigame: (type: AdventureMinigameType) => void
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
  type: 'combat' | 'combat_won' | 'obstacle_cut' | 'obstacle_strength' | 'obstacle_rock_smash' | 'fishing'
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

  const triggerRandomEvent = async (targetMapId?: string) => {
    const travelTween = config.getTravelTween()
    const markerTimeline = config.getMarkerTimeline()

    if (travelTween) travelTween.pause()
    if (markerTimeline) markerTimeline.pause()
    config.isPaused.value = true

    const nextSegmentMapId = config.isTraveling.value && config.calculatedPath.value[config.currentSegmentIndex.value + 1]
      ? config.calculatedPath.value[config.currentSegmentIndex.value + 1]
      : config.currentMapId.value

    const mapId = (targetMapId || nextSegmentMapId || 'route1') as string
    const mapData = (MAPS_BY_ROUTE_ID as Record<string, MapLocation>)[mapId] as MapLocation | undefined // open-record

    if (!mapData) return

    const isCaveOrMountain = mapData.isMountain || mapId.includes('cave') || mapId.includes('tunnel') || mapId.includes('moon') || mapId.includes('road')
    const isWaterMap = mapId.includes('seafoam') || ['route19', 'route20', 'route21'].includes(mapId)
    const hasFishing = !!mapData.fishing

    const eventTypes: AdventureTriggerType[] = ['combat']

    if (isWaterMap) {
      eventTypes.push('fishing')
    } else if (isCaveOrMountain) {
      eventTypes.push('obstacle_rock_smash')
      eventTypes.push('obstacle_strength')
    } else {
      eventTypes.push('obstacle_cut')
      if (hasFishing) {
        eventTypes.push('fishing')
      }
    }

const ADVENTURE_EVENT_PROBABILITY_THRESHOLD = 0.70;

    let chosenType: AdventureTriggerType = 'combat'
    if (Math.random() > ADVENTURE_EVENT_PROBABILITY_THRESHOLD && eventTypes.length > 1) {
      const nonCombatTypes = eventTypes.filter(t => t !== 'combat')
      chosenType = nonCombatTypes[Math.floor(Math.random() * nonCombatTypes.length)]!
    }

    const destinationName = mapData.name || mapId

    const eventTemplates = {
      combat: {
        title: targetMapId ? `¡Emboscada al entrar a ${destinationName}!` : '¡Encuentro de Combate!',
        desc: isWaterMap
          ? 'Un entrenador en bañador surge del oleaje y te desafía a un combate acuático.'
          : (isCaveOrMountain ? 'Un montañero te desafía en la penumbra del sendero.' : 'Un entrenador rival sale de la hierba alta y te desafía.'),
        moRequired: undefined
      },
      obstacle_cut: {
        title: 'Obstáculo: Arbusto Espeso',
        desc: 'Un arbusto espinoso y denso corta el paso en la ruta.',
        moRequired: 'cut'
      },
      obstacle_strength: {
        title: 'Obstáculo: Gran Roca',
        desc: 'Una inmensa roca redonda bloquea el túnel, impidiendo continuar.',
        moRequired: 'strength'
      },
      obstacle_rock_smash: {
        title: 'Obstáculo: Roca Agrietada',
        desc: 'Una formación de rocas agrietadas bloquea el sendero empinado.',
        moRequired: 'rock_smash'
      },
      fishing: {
        title: 'Zona de Pesca Abundante',
        desc: isWaterMap
          ? 'El oleaje está tranquilo. Te detienes a lanzar la caña de pescar.'
          : 'Te detienes junto a un estanque en la ruta a probar suerte con la caña.',
        moRequired: undefined
      }
    }

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
        if (spawns.length > 0) {
          let chosenSpawn = spawns[Math.floor(Math.random() * spawns.length)]!
          if (config.activeTravelModifiers.value.typeFocus) {
            const typeMatch = spawns.find(s => s.toLowerCase().includes(config.activeTravelModifiers.value.typeFocus!))
            if (typeMatch) chosenSpawn = typeMatch
          }
          const pokemonName = chosenSpawn.charAt(0).toUpperCase() + chosenSpawn.slice(1)
          const minLv = mapData.lv?.[0] || 5
          const maxLv = mapData.lv?.[1] || 10
          const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv
          
          const generated = makePokemon(chosenSpawn, level, { shinyMultiplier: config.activeTravelModifiers.value.shinyChanceMod })
          if (generated) {
            wildPoke = generated as Pokemon
            if (wildPoke.isShiny) {
              combatDesc = `✨ ¡Un ${pokemonName} VARIOPINTO (Shiny) salvaje apareció brillando en el sendero! (Tasa Shiny: x${config.activeTravelModifiers.value.shinyChanceMod.toFixed(1)})`
            } else {
              combatDesc = `¡Un ${pokemonName} salvaje apareció en el sendero y te desafía a un combate!`
            }
          }
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

    if (evt.moRequired && !config.activeHMs.value.has(evt.moRequired)) {
      config.travelLog.value.push(`🚶 Ignorando obstáculo: No tienes la MO ${evt.moRequired.toUpperCase()}. Rodeas el obstáculo y continúas.`)
      if (isManualExploration) { activeEvent.value = null; return }
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
      config.inventoryStore.addItem('berrybronze', 2)
      config.injectedItems.value.add('berrybronze')
      config.inventoryStore.addItem('berrysilver', 1)
      config.injectedItems.value.add('berrysilver')
      config.travelLog.value.push('✂️ ¡Cortas el arbusto con MO Corte y recolectas bayas del árbol!')
      config.travelLog.value.push('🫐 +2 Baya de Bronce, +1 Baya de Plata obtenidas en tu mochila de pruebas.')
      
      config.triggerExtraLoot('berrybronze', 1)

      if (isManualExploration) { activeEvent.value = null; return }
      config.resumeTravelAfterEvent()
      return
    }

    if (evt.type === 'obstacle_strength') {
      config.inventoryStore.addItem('nugget', 1)
      config.injectedItems.value.add('nugget')
      config.travelLog.value.push('💪 ¡Empujas la roca con MO Fuerza y descubres un cofre oculto!')
      config.travelLog.value.push('📦 +1 Pepita obtenida en tu mochila de pruebas.')
      
      config.triggerExtraLoot('nugget', 1)

      if (isManualExploration) { activeEvent.value = null; return }
      config.resumeTravelAfterEvent()
      return
    }

    if (evt.type === 'combat') {
      const healthy = (config.gameStore.state.team || []).some((p: Pokemon) => p && p.hp > 0)
      if (!healthy) {
        config.travelLog.value.push('⚠️ No tienes Pokémon conscientes en tu equipo de pruebas para combatir.')
        return
      }

      const travelTween = config.getTravelTween()
      const markerTimeline = config.getMarkerTimeline()
      if (travelTween) travelTween.pause()
      if (markerTimeline) markerTimeline.pause()
      config.isPaused.value = true

      if (evt.isTrainer && evt.enemyTeam && evt.enemyTeam.length > 0 && evt.enemyTeam[0]) {
        config.travelLog.value.push(`💥 Iniciando combate contra el entrenador ${evt.trainerName}...`)
        config.battleStore.startBattle(evt.enemyTeam[0], {
          locationId: requireMapRouteId(config.currentMapId.value),
          wasSearching: !config.isTraveling.value,
          isTrainer: true,
          enemyTeam: evt.enemyTeam,
          trainerName: evt.trainerName,
          trainerSprite: evt.trainerSprite,
          trainerQuote: evt.quote,
          persistenceMode: config.isTraveling.value ? 'local' : undefined,
          cannotEscape: true
        })
      } else {
        let wild = evt.wildPokemon
        if (!wild) {
          wild = makePokemon('rattata', 5) as Pokemon
        }

        config.travelLog.value.push(`💥 Iniciando combate de pruebas contra ${wild?.name} (Nivel ${wild?.level})...`)
        config.battleStore.startBattle(wild!, { 
          locationId: requireMapRouteId(config.currentMapId.value), 
          wasSearching: !config.isTraveling.value,
          persistenceMode: config.isTraveling.value ? 'local' : undefined,
          cannotEscape: config.isTraveling.value
        })
      }
      return
    }
    
    if (isManualExploration) { 
      activeEvent.value = null
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
      const originName = (MAPS_BY_ROUTE_ID as Record<string, MapLocation>)[originNode]?.name || originNode // open-record
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
