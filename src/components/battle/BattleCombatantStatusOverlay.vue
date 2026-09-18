<script setup lang="ts">
import { computed } from 'vue'
import type { BattleStages, BattleSeatSpecialState } from '@/types/battle/battle'
import VirtualEntity from './VirtualEntity.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { computeCombatantVolatiles } from './combatantVolatilesHelper.ts'
import { useCombatantVisualSprite, type CombatantVisualSpriteProps } from './useCombatantVisualSprite.ts'
import { resolveCombatantFeetPoints } from './helpers/combatantFeetHelper.ts'

const DEFAULT_FX_RADIUS_PX = 25
const FX_RADIUS_BOUND_MIN = 10
const FX_RADIUS_BOUND_MAX = 80
const DEFAULT_GROUND_LINE_FALLBACK_PERCENT = '75%'
const FX_RADIUS_MULTIPLIER = 1.25
const BASE_SIZE_SCALE_DIVISOR = 100
const STATUS_OVERLAY_SPARKLE_COUNT = 8
const PERCENT_MULTIPLIER = 100
const SPRITE_SIZE_WRAPPER_MULT = 2

interface Props extends CombatantVisualSpriteProps {
  position: { x: number; y: number }
  groundY?: string
  stages?: Partial<BattleStages>
  isHidden?: boolean
  isFainting?: boolean
  animState?: BattleSeatSpecialState | null
  suppressFx?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pokemon: null,
  groundY: DEFAULT_GROUND_LINE_FALLBACK_PERCENT,
  stages: () => ({}),
  isHidden: false,
  isFainting: false,
  animState: null,
  suppressFx: false
})

const {
  speciesSizeScale,
  displaySize,
  imageUrl,
  isAnimated,
  animatedMeta
} = useCombatantVisualSprite(props)

const feetPoints = computed(() =>
  resolveCombatantFeetPoints(imageUrl.value, isAnimated.value, animatedMeta.value)
)

const localGroundY = computed(() => props.groundY || DEFAULT_GROUND_LINE_FALLBACK_PERCENT)
const fxScale = computed(() => props.baseSize / BASE_SIZE_SCALE_DIVISOR)

const fxRadius = computed(() => {
  if (!animatedMeta.value || animatedMeta.value.bodyRadius === undefined) {
    return DEFAULT_FX_RADIUS_PX
  }
  return Math.max(
    FX_RADIUS_BOUND_MIN,
    Math.min(FX_RADIUS_BOUND_MAX, animatedMeta.value.bodyRadius * PERCENT_MULTIPLIER)
  )
})

const volatilesProps = computed(() =>
  computeCombatantVolatiles(props.pokemon, props.stages)
)

const isDefeated = computed(() => {
  if (!props.pokemon) return true
  return Boolean(props.pokemon.fainted || props.pokemon.hp <= 0)
})

const isDefeatAnimInProgress = computed(() => {
  return Boolean(props.isFainting || props.animState === 'catching')
})

const isSeatHidden = computed(() => {
  return props.animState === 'trapped' || props.animState === 'releasing'
})

const shouldRender = computed(() => {
  if (!props.pokemon) return false
  if (props.isHidden) return false
  if (props.suppressFx) return false
  if (isSeatHidden.value) return false
  if (isDefeated.value && !isDefeatAnimInProgress.value) return false
  return true
})
</script>

<template>
  <VirtualEntity
    v-if="shouldRender && pokemon"
    :id="`status-overlay-${side}`"
    :class="['combatant-status-overlay', `${side}-status-overlay`]"
    :x="position.x"
    :y="position.y"
    :w="baseSize"
    :h="baseSize"
    :z-index="'calc(var(--z-base) + 25)'"
  >
    <PVSpriteFX
      :poke-id="pokemon.uid || pokemon.id"
      :is-shiny="pokemon.isShiny"
      :is-guardian="pokemon.isGuardian"
      :status="pokemon.status || undefined"
      v-bind="volatilesProps"
      :vibrant="true"
      :sparkle-count="STATUS_OVERLAY_SPARKLE_COUNT"
      :radius="fxRadius * FX_RADIUS_MULTIPLIER"
      :sprite-scale="fxScale"
      :poke-scale="speciesSizeScale"
      :anim-state="animState || undefined"
      :overlay-only="true"
      :is-battle="true"
      :style="{
        width: (displaySize * SPRITE_SIZE_WRAPPER_MULT) + 'px',
        height: (displaySize * SPRITE_SIZE_WRAPPER_MULT) + 'px',
        position: 'absolute',
        left: '50%',
        top: localGroundY,
        transform: `translate(calc(-${feetPoints.feetX * PERCENT_MULTIPLIER}%), calc(-${feetPoints.feetY * PERCENT_MULTIPLIER}%))`
      }"
    />
  </VirtualEntity>
</template>

<style scoped lang="scss">
.combatant-status-overlay {
  pointer-events: none;
}
</style>
