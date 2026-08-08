<script setup lang="ts">
import { computed } from 'vue'
import { useCombatShadowStore } from '@/stores/battle/combatShadows'
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'

interface Props {
  shadowId: string
  spriteSize?: number
}

const props = defineProps<Props>()

const { SHADOW_WIDTH, SHADOW_HEIGHT } = WORLD_CONSTANTS
const shadowStore = useCombatShadowStore()
const shadow = computed(() => shadowStore.activeShadows.get(props.shadowId))

import { generatePixelShadow } from '@/logic/combat/shadowHelpers'

const shadowUrl = generatePixelShadow(SHADOW_WIDTH, SHADOW_HEIGHT)

const DEFAULT_SHADOW_WIDTH_PERCENT = 70
const SHADOW_HEIGHT_RATIO = 0.08
const FLYING_SHADOW_OPACITY = 0.6
const CENTER_FEET_X_OFFSET = 0.5
const FLYING_SHADOW_Y_OFFSET_PX = 15
const FLYING_SHADOW_SCALE = 0.8

const SHADOW_TRANSLATE_PERCENT = -50

const shadowStyle = computed(() => {
  if (!shadow.value) return { opacity: 0 }
  
  const { feetX, entitySize, isFlying, visible } = shadow.value
  const size = props.spriteSize || entitySize
  
  // Dimensions: Relative to the active sprite size
  const widthPercent = parseFloat(shadow.value.width) || DEFAULT_SHADOW_WIDTH_PERCENT
  const widthPx = (widthPercent / 100) * size
  const heightPx = size * SHADOW_HEIGHT_RATIO
  
  // Desfase horizontal relativo al centro (50%)
  const offsetX = (feetX - CENTER_FEET_X_OFFSET) * size

const SHADOW_LEFT_CENTER_PERCENT = 50

  return {
    backgroundImage: `url(${shadowUrl})`,
    left: `calc(${SHADOW_LEFT_CENTER_PERCENT}% + ${offsetX}px)`,
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    opacity: (visible && !isFlying) ? 1 : (visible && isFlying) ? FLYING_SHADOW_OPACITY : 0,
    transform: `translate(${SHADOW_TRANSLATE_PERCENT}%, ${SHADOW_TRANSLATE_PERCENT}%) ${isFlying ? `translateY(${FLYING_SHADOW_Y_OFFSET_PX}px) scale(${FLYING_SHADOW_SCALE})` : 'scale(1)'}`
  }
})
</script>

<template>
  <div 
    v-if="shadow"
    class="pv-combat-shadow"
    :style="shadowStyle"
  />
</template>

<style scoped lang="scss">
.pv-combat-shadow {
  position: absolute;
  top: var(--shadow-y, 90%);
  background-size: 100% 100%;
  background-repeat: no-repeat;
  image-rendering: -webkit-optimize-contrast !important;
  #{"image-rendering"}: crisp-edges !important;
  image-rendering: pixelated !important;
  -ms-interpolation-mode: nearest-neighbor !important;
  transform-origin: center center;
  
  will-change: opacity;
  pointer-events: none;
  z-index: calc(var(--z-base) - 1); // Detrás del pokemon
}
</style>
