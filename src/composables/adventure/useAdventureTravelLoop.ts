/**
 * src/composables/adventure/useAdventureTravelLoop.ts
 * 
 * GSAP Timeline and travel progression loop for adventure map simulations.
 */

import type { Ref } from 'vue'
import { gsap } from 'gsap'
import type { AdventureNodeId } from '../../../test aventura/kantoGraph.ts'
import { FIRE_RED_MAPS } from '@/data/world/maps'
import {
  CARD_W,
  CARD_H,
  isPokemonCenterNodeId
} from './helpers/adventureSimulationConstants.ts'
import type { useShopStore } from '@/stores/inventory/shop'
import type { ActiveAdventureEvent } from './useAdventureEvents.ts'

const ENCOUNTER_STEP_CHECK_THRESHOLD_PCT = 95
const BASE_WILD_ENCOUNTER_CHANCE = 0.15
const SWEET_SCENT_EXTRA_ENCOUNTER_CHANCE = 0.50

export interface UseAdventureTravelLoopParams {
  calculatedPath: Ref<AdventureNodeId[]>
  originMap: Ref<AdventureNodeId>
  destinationMap: Ref<AdventureNodeId>
  isTraveling: Ref<boolean>
  isPaused: Ref<boolean>
  travelProgress: Ref<number>
  currentSegmentIndex: Ref<number>
  lastStepPct: Ref<number>
  safeStepsRemaining: Ref<number>
  isArrivalEventPending: Ref<boolean>
  blockedConnections: Ref<Set<string>>
  activeSweetScent: Ref<boolean>
  isBikeActive: Ref<boolean>
  activeTeamPassives: Ref<{ speedBonus: number }>
  activeTravelModifiers: Ref<{ encounterRateMod: number }>
  travelLog: Ref<string[]>
  showMarker: Ref<boolean>
  markerX: Ref<number>
  markerY: Ref<number>
  isDragging: Ref<boolean>
  nodePositions: Ref<Record<string, { x: number; y: number }>>
  centerOnPoint: (x: number, y: number, duration?: number) => void
  jumpToPoint: (x: number, y: number) => void
  calculateRoute: () => void
  triggerRandomEvent: (destinationNodeId?: AdventureNodeId) => void
  activeEvent: Ref<ActiveAdventureEvent | null>
  showArchaeology: Ref<boolean>
  showFishing: Ref<boolean>
  minigamePokemon: Ref<unknown>
  shopStore: ReturnType<typeof useShopStore>
  syncCurrentMapFromAdventureNode: (nodeId: AdventureNodeId) => void
}

export function useAdventureTravelLoop(params: UseAdventureTravelLoopParams) {
  const {
    calculatedPath,
    originMap,
    destinationMap,
    isTraveling,
    isPaused,
    travelProgress,
    currentSegmentIndex,
    lastStepPct,
    safeStepsRemaining,
    isArrivalEventPending,
    blockedConnections,
    activeSweetScent,
    isBikeActive,
    activeTeamPassives,
    activeTravelModifiers,
    travelLog,
    showMarker,
    markerX,
    markerY,
    isDragging,
    nodePositions,
    centerOnPoint,
    jumpToPoint,
    calculateRoute,
    triggerRandomEvent,
    activeEvent,
    showArchaeology,
    showFishing,
    minigamePokemon,
    shopStore,
    syncCurrentMapFromAdventureNode
  } = params

  let travelTween: gsap.core.Tween | null = null
  let markerTimeline: gsap.core.Timeline | null = null

  const getTravelTween = () => travelTween
  const getMarkerTimeline = () => markerTimeline

  function checkStepEncounter(currentSegmentPct: number) {
    const currentStepVal = Math.floor(currentSegmentPct / 5) * 5
    if (currentStepVal <= lastStepPct.value || currentStepVal >= ENCOUNTER_STEP_CHECK_THRESHOLD_PCT) {
      return
    }

    lastStepPct.value = currentStepVal
    if (safeStepsRemaining.value > 0) {
      safeStepsRemaining.value--
      return
    }

    let chance = BASE_WILD_ENCOUNTER_CHANCE
    if (activeTravelModifiers.value.encounterRateMod !== 0) {
      chance *= (1 + (activeTravelModifiers.value.encounterRateMod / 100))
    }
    if (activeSweetScent.value) {
      chance += SWEET_SCENT_EXTRA_ENCOUNTER_CHANCE
    }
    if (Math.random() < chance) {
      safeStepsRemaining.value = 5
      triggerRandomEvent()
    }
  }

  function advanceToNextSegment() {
    const path = calculatedPath.value
    const nextSegIdx = currentSegmentIndex.value + 1
    if (nextSegIdx < path.length) {
      const nextNodeId = path[nextSegIdx]!
      const nodeName = FIRE_RED_MAPS.find(m => m.id === nextNodeId)?.name || nextNodeId
      travelLog.value.push(`Entrando a: ${nodeName}`)

      if (isPokemonCenterNodeId(nextNodeId)) {
        shopStore.healAllPokemon(0)
        travelLog.value.push(`🏥 ¡Centro Pokémon visitado en ${nodeName}! Tu equipo de pruebas ha sido completamente curado.`)
      }

      currentSegmentIndex.value = nextSegIdx
      originMap.value = nextNodeId
      syncCurrentMapFromAdventureNode(nextNodeId)
    }

    lastStepPct.value = 0
    isArrivalEventPending.value = false

    if (currentSegmentIndex.value === path.length - 1) {
      finishTravelAtNode(destinationMap.value)
      travelLog.value.push('🎉 ¡Llegaste a tu destino con éxito!')
      return
    }

    resumeTweens()
  }

  function resumeTweens() {
    isPaused.value = false
    travelTween?.resume()
    markerTimeline?.resume()
  }

  const startTravel = () => {
    calculateRoute()
    if (calculatedPath.value.length === 0) return

    activeSweetScent.value = false
    isTraveling.value = true
    isPaused.value = false
    travelProgress.value = 0
    currentSegmentIndex.value = 0
    lastStepPct.value = 0
    safeStepsRemaining.value = 0
    isArrivalEventPending.value = false
    blockedConnections.value = new Set()
    activeEvent.value = null
    showArchaeology.value = false
    showFishing.value = false
    minigamePokemon.value = null
    showMarker.value = true

    const originPos = nodePositions.value[originMap.value]
    if (originPos) {
      markerX.value = originPos.x + CARD_W / 2
      markerY.value = originPos.y + CARD_H / 2
      centerOnPoint(markerX.value, markerY.value, 0.5)
    }

    if (isPokemonCenterNodeId(originMap.value)) {
      shopStore.healAllPokemon(0)
      travelLog.value.push(`🏥 Centro Pokémon inicial: Tu equipo de pruebas ha sido completamente curado.`)
    }

    const baseSpeedMultiplier = 1 + activeTeamPassives.value.speedBonus
    const baseTimePerMap = Math.max(1, (isBikeActive.value ? 2 : 4) / baseSpeedMultiplier)
    const totalDuration = (calculatedPath.value.length - 1 || 1) * baseTimePerMap
    const stateObj = { val: 0 }

    travelLog.value.push(`Iniciando viaje de ${calculatedPath.value.length} tramos...`)

    if (markerTimeline) {
      markerTimeline.kill()
    }
    markerTimeline = gsap.timeline()
    const path = calculatedPath.value
    const segTime = baseTimePerMap
    const markerState = { mx: markerX.value, my: markerY.value }

    for (let i = 1; i < path.length; i++) {
      const targetPos = nodePositions.value[path[i]!]
      if (targetPos) {
        const targetCX = targetPos.x + CARD_W / 2
        const targetCY = targetPos.y + CARD_H / 2
        markerTimeline.to(
          markerState,
          {
            mx: targetCX,
            my: targetCY,
            duration: segTime,
            ease: 'power1.inOut',
            onUpdate() {
              markerX.value = markerState.mx
              markerY.value = markerState.my
              if (!isDragging.value) {
                jumpToPoint(markerState.mx, markerState.my)
              }
            },
          }
        )
      }
    }

    travelTween = gsap.to(stateObj, {
      val: 100,
      duration: totalDuration,
      ease: 'none',
      onUpdate: () => {
        const currentPct = Math.round(stateObj.val)
        travelProgress.value = currentPct
        const segmentProgress = 100 / (calculatedPath.value.length - 1 || 1)
        const nextTransitionVal = (currentSegmentIndex.value + 1) * segmentProgress

        if (stateObj.val >= nextTransitionVal && !isArrivalEventPending.value) {
          isArrivalEventPending.value = true
          const nextNodeId = calculatedPath.value[currentSegmentIndex.value + 1]!
          triggerRandomEvent(nextNodeId)
          return
        }

        if (isArrivalEventPending.value) return

        const segmentVal = stateObj.val - (currentSegmentIndex.value * segmentProgress)
        const currentSegmentPct = (segmentVal / segmentProgress) * 100
        checkStepEncounter(currentSegmentPct)
      }
    })
  }

  const finishTravelAtNode = (nodeId: AdventureNodeId) => {
    if (travelTween) { travelTween.kill(); travelTween = null }
    if (markerTimeline) { markerTimeline.kill(); markerTimeline = null }

    activeEvent.value = null
    isTraveling.value = false
    isPaused.value = false
    showMarker.value = false
    isArrivalEventPending.value = false

    const pos = nodePositions.value[nodeId]
    if (pos) {
      markerX.value = pos.x + CARD_W / 2
      markerY.value = pos.y + CARD_H / 2
      centerOnPoint(markerX.value, markerY.value, 0.6)
    }

    originMap.value = nodeId
    syncCurrentMapFromAdventureNode(nodeId)
    const nodeName = FIRE_RED_MAPS.find(m => m.id === nodeId)?.name || nodeId
    travelLog.value.push(`📍 Ubicación actual: ${nodeName}. El selector de origen ha sido actualizado.`)
    calculateRoute()
  }

  const resumeTravelAfterEvent = () => {
    if (!activeEvent.value) return
    travelLog.value.push(`✅ Evento resuelto: ${activeEvent.value.title}`)
    activeEvent.value = null

    if (!isTraveling.value || !travelTween) return

    if (isArrivalEventPending.value) {
      advanceToNextSegment()
    } else {
      resumeTweens()
    }
  }

  const cancelTravel = () => {
    const currentNodeId = calculatedPath.value[currentSegmentIndex.value] || originMap.value
    if (travelTween) { travelTween.kill(); travelTween = null }
    if (markerTimeline) { markerTimeline.kill(); markerTimeline = null }
    isTraveling.value = false
    isPaused.value = false
    travelProgress.value = 0
    activeEvent.value = null
    showMarker.value = false
    showArchaeology.value = false
    showFishing.value = false
    originMap.value = currentNodeId
    syncCurrentMapFromAdventureNode(currentNodeId)
    travelLog.value.push('❌ Viaje cancelado por el usuario.')
    travelLog.value.push(`📍 Ubicación actual: ${FIRE_RED_MAPS.find(m => m.id === currentNodeId)?.name || currentNodeId}.`)
    calculateRoute()
  }

  return {
    getTravelTween,
    getMarkerTimeline,
    startTravel,
    finishTravelAtNode,
    resumeTravelAfterEvent,
    cancelTravel
  }
}
