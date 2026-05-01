<script setup>
import { computed } from 'vue'
import { useCombatShadowStore } from '@/stores/combatShadows'
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
const { SHADOW_WIDTH, SHADOW_HEIGHT } = WORLD_CONSTANTS

const shadowStore = useCombatShadowStore()

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

/**
 * Calculates absolute coordinates and styles for a shadow.
 * All calculations are based on the 3000x3000px virtual world.
 */
const getShadowStyle = (shadow) => {
  const { entityX, entityY, entitySize, feetX, feetY, width, isFlying } = shadow
  
  // Horizontal Position: Center of the entity adjusted by feet offset
  const left = entityX + (feetX * entitySize)
  
  // Vertical Position: Base of the entity (top + detected feet offset)
  const top = entityY + (feetY * entitySize)
  
  // Dimensions: Relative to entity size
  const widthPercent = parseFloat(width) || 70
  const widthPx = (widthPercent / 100) * entitySize
  const heightPx = entitySize * 0.08 // Mantener una proporción chata (8% del tamaño de la entidad)
  
  return {
    backgroundImage: `url(${shadowUrl})`,
    left: `${left}px`,
    top: `${top}px`,
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    // Note: We use !important on opacity for transitions to override this base opacity if needed
    opacity: isFlying ? 0.6 : 1,
    transform: `Translate(-50%, -50%) ${isFlying ? 'Scale(0.8)' : 'Scale(1)'}`
  }
}

// Filtramos solo las sombras visibles para que TransitionGroup maneje las salidas
const shadowsArray = computed(() => {
  return Array.from(shadowStore.activeShadows.values()).filter(s => s.visible)
})

const onAfterLeave = (el) => {
  // El ID está en el atributo data-id que pondremos en el template
  const id = el.dataset.id
  if (id) {
    shadowStore.removeShadow(id)
  }
}
</script>

<template>
  <div class="combat-shadow-manager">
    <div
      v-for="shadow in shadowsArray"
      :key="shadow.id"
      class="pv-shadow-central"
      :style="getShadowStyle(shadow)"
    />
  </div>
</template>

<style scoped lang="scss">
.combat-shadow-manager {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5; 
  overflow: visible;
}

.pv-shadow-central {
  position: absolute;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  transform-origin: center center;
  /* Eliminamos transiciones de posición (left/top) para evitar el "corrimiento" visual */
  /* Solo permitimos opacidad para apariciones/desapariciones suaves */
  transition: opacity 0.4s ease;
  will-change: opacity;
  pointer-events: none;
  z-index: 1;
}
</style>
