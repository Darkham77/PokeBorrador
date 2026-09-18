<script setup lang="ts">
import { computed } from 'vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type {
  SparkleData,
  BattleStages,
  BattleSide,
  BattleSeatSpecialState
} from '@/types/battle/battle'
import type { MoveCategory } from '@/data/battle/moves'
import type { ItemId } from '@/data/inventory/items'
import BattleCombatant from './BattleCombatant.vue'

const props = withDefaults(defineProps<{
  pokemon: Pokemon
  p2Pos: { x: number; y: number }
  p1Pos: { x: number; y: number }
  baseSize: number
  groundY: string
  shadowKey?: string | null
  animState?: BattleSeatSpecialState | null
  ballId?: ItemId
  isShaking?: boolean
  isBlinking?: boolean
  isHealing?: boolean
  isSilhouette?: boolean
  silhouetteOpacity?: number
  isAttacker?: boolean
  activeMove?: {
    side?: BattleSide
    cat?: MoveCategory
    name: string
    selfKO?: boolean
    recoil?: boolean | number
  } | null
  showGuides?: boolean
  isCaptureSuccess?: boolean
  isCriticalCapture?: boolean
  sparkles?: SparkleData[]
  isFainting?: boolean
  isEmerging?: boolean
  suppressFx?: boolean
  stages?: Partial<BattleStages>
  isHidden?: boolean
  hideStatusOverlay?: boolean
}>(), {
  shadowKey: null,
  animState: null,
  ballId: 'pokeball',
  isShaking: false,
  isBlinking: false,
  isHealing: false,
  isSilhouette: false,
  silhouetteOpacity: 1,
  isAttacker: false,
  activeMove: null,
  showGuides: false,
  isCaptureSuccess: false,
  isCriticalCapture: false,
  sparkles: () => [],
  isFainting: false,
  isEmerging: false,
  suppressFx: false,
  stages: () => ({}),
  isHidden: false,
  hideStatusOverlay: false
})

const activeMoveProp = computed(() => {
  if (!props.activeMove) return null
  return {
    side: props.activeMove.side || 'enemy',
    cat: props.activeMove.cat || 'physical',
    name: props.activeMove.name,
    selfKO: props.activeMove.selfKO,
    recoil: props.activeMove.recoil
  }
})

const enemyStyle = computed(() => ({
  opacity: props.isSilhouette ? (props.silhouetteOpacity ?? 1) : 1
}))
</script>

<template>
  <BattleCombatant
    side="enemy"
    :pokemon="pokemon"
    :position="p2Pos"
    :target-position="p1Pos"
    :base-size="baseSize"
    :ground-y="groundY"
    :shadow-key="shadowKey"
    :z-index="'calc(var(--z-map-spawns) + 2)'"
    :anim-state="animState"
    :ball-id="ballId"
    :is-shaking="isShaking"
    :is-blinking="isBlinking"
    :is-healing="isHealing"
    :is-silhouette="isSilhouette"
    :is-attacking="isAttacker"
    :active-move="activeMoveProp"
    :show-guides="showGuides"
    :is-capture-success="isCaptureSuccess"
    :is-critical-capture="isCriticalCapture"
    :sparkles="sparkles"
    :is-fainting="isFainting"
    :is-emerging="isEmerging"
    :suppress-fx="suppressFx"
    :stages="stages"
    :hidden="isHidden"
    :has-seat="true"
    :hide-status-overlay="hideStatusOverlay"
    :style="enemyStyle"
  />
</template>
