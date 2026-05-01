<script setup>
import { computed } from 'vue'
import { useCombatShadowStore } from '@/stores/combatShadows'
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
const { SHADOW_WIDTH, SHADOW_HEIGHT } = WORLD_CONSTANTS

const props = defineProps({
  shadowId: { type: String, required: true }
})

const shadowStore = useCombatShadowStore()
const shadow = computed(() => shadowStore.activeShadows.get(props.shadowId))

/**
 * Generates the standard low-resolution pixel shadow.
 * Using a small canvas to ensure pixelation and retro feel.
 */
const generatePixelShadow = (w = SHADOW_WIDTH, h = SHADOW_HEIGHT) => {
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'Rgba(0, 0, 0, 0.35)'
  ctx.beginPath()
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  return canvas.toDataURL('image/png')
}

const shadowUrl = generatePixelShadow()

const shadowStyle = computed(() => {
  if (!shadow.value) return { opacity: 0 }
  
  const { feetX, entitySize, isFlying, visible } = shadow.value
  
  // Dimensions: Relative to entity size
  const widthPercent = parseFloat(shadow.value.width) || 70
  const widthPx = (widthPercent / 100) * entitySize
  const heightPx = entitySize * 0.08
  
  // Desfase horizontal relativo al centro (50%)
  // feetX va de 0 a 1. 0.5 es el centro.
  const offsetX = (feetX - 0.5) * entitySize

  return {
    backgroundImage: `url(${shadowUrl})`,
    left: `calc(50% + ${offsetX}px)`,
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    opacity: (visible && !isFlying) ? 1 : (visible && isFlying) ? 0.6 : 0,
    transform: `Translate(-50%, -50%) ${isFlying ? 'Scale(0.8)' : 'Scale(1)'}`
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
  image-rendering: pixelated;
  transform-origin: center center;
  transition: opacity 0.6s ease;
  will-change: opacity;
  pointer-events: none;
  z-index: -1; // Detrás del pokemon
}
</style>
