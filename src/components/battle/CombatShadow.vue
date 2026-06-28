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

const shadowStyle = computed(() => {
  if (!shadow.value) return { opacity: 0 }
  
  const { feetX, entitySize, isFlying, visible } = shadow.value
  const size = props.spriteSize || entitySize
  
  // Dimensions: Relative to the active sprite size
  const widthPercent = parseFloat(shadow.value.width) || 70
  const widthPx = (widthPercent / 100) * size
  const heightPx = size * 0.08
  
  // Desfase horizontal relativo al centro (50%)
  const offsetX = (feetX - 0.5) * size

  return {
    backgroundImage: `url(${shadowUrl})`,
    left: `calc(50% + ${offsetX}px)`,
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    opacity: (visible && !isFlying) ? 1 : (visible && isFlying) ? 0.6 : 0,
    transform: `translate(-50%, -50%) ${isFlying ? 'translateY(15px) scale(0.8)' : 'scale(1)'}`
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
