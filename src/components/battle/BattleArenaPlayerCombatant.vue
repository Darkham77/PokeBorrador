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
  p1Pos: { x: number; y: number }
  p2Pos: { x: number; y: number }
  baseSize: number
  groundY: string
  shadowKey?: string | null
  animState?: BattleSeatSpecialState | null
  ballId?: ItemId
  isShaking?: boolean
  isBlinking?: boolean
  isHealing?: boolean
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
  isAttacker: false,
  activeMove: null,
  showGuides: false,
  isCaptureSuccess: false,
  isCriticalCapture: false,
  sparkles: () => [],
  stages: () => ({}),
  isHidden: false,
  hideStatusOverlay: false
})

const activeMoveProp = computed(() => {
  if (!props.activeMove) return null
  return {
    side: props.activeMove.side || 'player',
    cat: props.activeMove.cat || 'physical',
    name: props.activeMove.name,
    selfKO: props.activeMove.selfKO,
    recoil: props.activeMove.recoil
  }
})
</script>

<template>
  <BattleCombatant
    side="player"
    :pokemon="pokemon"
    :position="p1Pos"
    :target-position="p2Pos"
    :base-size="baseSize"
    :ground-y="groundY"
    :shadow-key="shadowKey"
    :z-index="'calc(var(--z-map-spawns) + 4)'"
    :anim-state="animState"
    :ball-id="ballId"
    :is-shaking="isShaking"
    :is-blinking="isBlinking"
    :is-healing="isHealing"
    :is-attacking="isAttacker"
    :active-move="activeMoveProp"
    :show-guides="showGuides"
    :is-capture-success="isCaptureSuccess"
    :is-critical-capture="isCriticalCapture"
    :sparkles="sparkles"
    :stages="stages"
    :is-fainting="false"
    :hidden="isHidden"
    :has-seat="true"
    :hide-status-overlay="hideStatusOverlay"
  />
</template>
