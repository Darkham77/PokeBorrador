import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { MapLocation } from '@/types/pokemon/encounters'
import { requireMapRouteId } from '@/data/world/map-assets'
import type { AdventureNodeId } from '../../../test aventura/kantoGraph.ts'
import type { AdventureTriggerType, ActiveAdventureEvent } from './useAdventureEvents.ts'
import type { ItemId } from '@/data/inventory/items'

export function determineAvailableEventTypes(mapId: AdventureNodeId, mapData: MapLocation): AdventureTriggerType[] {
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

  return eventTypes
}

export function pickRandomAdventureType(
  eventTypes: AdventureTriggerType[],
  probabilityThreshold: number
): AdventureTriggerType {
  if (Math.random() > probabilityThreshold && eventTypes.length > 1) {
    const nonCombatTypes = eventTypes.filter(t => t !== 'combat')
    return nonCombatTypes[Math.floor(Math.random() * nonCombatTypes.length)]!
  }
  return 'combat'
}

export function buildAdventureEventTemplates(
  mapId: AdventureNodeId,
  mapData: MapLocation,
  targetMapId?: AdventureNodeId
) {
  const isCaveOrMountain = mapData.isMountain || mapId.includes('cave') || mapId.includes('tunnel') || mapId.includes('moon') || mapId.includes('road')
  const isWaterMap = mapId.includes('seafoam') || ['route19', 'route20', 'route21'].includes(mapId)
  const destinationName = mapData.name || mapId

  return {
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
}

export function generateWildAdventureEncounter(
  mapData: MapLocation,
  spawns: string[],
  typeFocus: string | null,
  shinyMultiplier: number
) {
  if (spawns.length === 0) return null

  let chosenSpawn = spawns[Math.floor(Math.random() * spawns.length)]!
  if (typeFocus) {
    const typeMatch = spawns.find(s => s.toLowerCase().includes(typeFocus))
    if (typeMatch) chosenSpawn = typeMatch
  }
  const pokemonName = chosenSpawn.charAt(0).toUpperCase() + chosenSpawn.slice(1)
  const minLv = mapData.lv?.[0] || 5
  const maxLv = mapData.lv?.[1] || 10
  const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv

  const generated = makePokemon(chosenSpawn, level, { shinyMultiplier })
  if (!generated) return null

  const wildPoke = generated as Pokemon
  const combatDesc = wildPoke.isShiny
    ? `✨ ¡Un ${pokemonName} VARIOPINTO (Shiny) salvaje apareció brillando en el sendero! (Tasa Shiny: x${shinyMultiplier.toFixed(1)})`
    : `¡Un ${pokemonName} salvaje apareció en el sendero y te desafía a un combate!`

  return { wildPoke, combatDesc }
}

export interface ObstacleEventConfig {
  inventoryStore: { addItem: (id: ItemId, qty: number) => void }
  injectedItems: { value: Set<ItemId> }
  travelLog: { value: string[] }
  triggerExtraLoot: (id: ItemId, qty: number) => void
  resumeTravelAfterEvent: () => void
}

export function resolveAdventureObstacleCut(
  config: ObstacleEventConfig,
  isManualExploration: boolean,
  onFinished: () => void
) {
  config.inventoryStore.addItem('berrybronze', 2)
  config.injectedItems.value.add('berrybronze')
  config.inventoryStore.addItem('berrysilver', 1)
  config.injectedItems.value.add('berrysilver')
  config.travelLog.value.push('✂️ ¡Cortas el arbusto con MO Corte y recolectas bayas del árbol!')
  config.travelLog.value.push('🫐 +2 Baya de Bronce, +1 Baya de Plata obtenidas en tu mochila de pruebas.')

  config.triggerExtraLoot('berrybronze', 1)

  if (isManualExploration) {
    onFinished()
    return
  }
  config.resumeTravelAfterEvent()
}

export function resolveAdventureObstacleStrength(
  config: ObstacleEventConfig,
  isManualExploration: boolean,
  onFinished: () => void
) {
  config.inventoryStore.addItem('nugget', 1)
  config.injectedItems.value.add('nugget')
  config.travelLog.value.push('💪 ¡Empujas la roca con MO Fuerza y descubres un cofre oculto!')
  config.travelLog.value.push('📦 +1 Pepita obtenida en tu mochila de pruebas.')

  config.triggerExtraLoot('nugget', 1)

  if (isManualExploration) {
    onFinished()
    return
  }
  config.resumeTravelAfterEvent()
}

export interface CombatEventConfig {
  gameStore: { state: { team?: Pokemon[] } }
  travelLog: { value: string[] }
  getTravelTween: () => gsap.core.Tween | null
  getMarkerTimeline: () => gsap.core.Timeline | null
  isPaused: { value: boolean }
  currentMapId: { value: AdventureNodeId }
  isTraveling: { value: boolean }
  battleStore: { startBattle: (p: Pokemon, options?: Record<string, unknown>) => void }
}

export function resolveAdventureCombatEvent(
  config: CombatEventConfig,
  evt: ActiveAdventureEvent
) {
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
}
