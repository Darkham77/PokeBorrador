<script setup lang="ts">
/**
 * PVAuraFX.vue
 * Gestiona las auras de pantalla (Reflejo/Pantalla Luz/Velo Sagrado).
 * Las chispas Shiny ahora se renderizan via PVStatusFX como efecto secundario.
 */
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { Z_LAYERS } from '@/logic/constants/visuals'

const props = defineProps({
  hasReflect: { type: Boolean, required: true },
  hasLightScreen: { type: Boolean, required: true },
  hasSafeguard: { type: Boolean, required: true },
})

const rootRef = ref<HTMLElement | null>(null)

const GSAP_SCREEN_AURA_DURATION_SEC = 2
const SCALE_MIN_AURA = 0.95
const SCALE_MAX_AURA = 1.05

const initScreenAuraFX = () => {
  const container = rootRef.value?.closest('.pv-fx-wrapper')
  if (!container) return
  const screens = container.querySelectorAll('.pv-fx-screen-overlay')
  screens.forEach(el => {
    gsap.killTweensOf(el)
    gsap.fromTo(el, 
      { scale: SCALE_MIN_AURA, opacity: 0.4 }, 
      { scale: SCALE_MAX_AURA, opacity: 0.7, duration: GSAP_SCREEN_AURA_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }
    )
  })
}

watch([() => props.hasReflect, () => props.hasLightScreen, () => props.hasSafeguard], () => {
  nextTick(() => initScreenAuraFX())
}, { immediate: true })

onUnmounted(() => {
  gsap.killTweensOf('.pv-fx-screen-overlay')
})
</script>

<template>
  <div
    ref="rootRef"
    class="pv-aura-fx-layer"
  >
    <!-- PANTALLAS TÁCTICAS -->
    <div
      v-if="hasReflect"
      class="pv-fx-screen-overlay reflect"
    />
    <div
      v-if="hasLightScreen"
      class="pv-fx-screen-overlay light-screen"
    />
    <div
      v-if="hasSafeguard"
      class="pv-fx-aura-overlay safeguard"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.pv-aura-fx-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: calc(v-bind('Z_LAYERS.MAP_SPAWNS') + 4);
}

.pv-fx-screen-overlay {
  position: absolute;
  inset: -10%;
  pointer-events: none;
  border-radius: 50%;
  opacity: 0.6;
  mix-blend-mode: color-dodge;
  
  &.reflect {
    background: Radial-Gradient(circle, Transparent 40%, #ff8c00 100%);
    border: 2px solid #ff8c00;
  }
  
  &.light-screen {
    background: Radial-Gradient(circle, Transparent 40%, #ffd700 100%);
    border: 2px solid #ffd700;
  }
}

.pv-fx-aura-overlay {
  position: absolute;
  inset: -5%;
  pointer-events: none;
  border-radius: 40%;
  opacity: 0.4;
  
  &.safeguard {
    background: Radial-Gradient(circle, #50fa7b 0%, Transparent 70%);
    mix-blend-mode: screen;
  }
}
</style>
