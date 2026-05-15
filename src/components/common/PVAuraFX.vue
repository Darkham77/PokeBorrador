<script setup lang="ts">
/**
 * PVAuraFX.vue
 * Gestiona los brillos Shiny y las auras de pantalla (Reflejo/Pantalla Luz).
 * MIGRACIÓN 1:1 DESDE PVSPRITEFX.VUE
 */
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useParticleEngine } from '@/composables/useParticleEngine'
import { Z_LAYERS } from '@/logic/constants/visuals'

const props = defineProps({
  isShiny: { type: Boolean, required: true },
  isGuardian: { type: Boolean, required: true },
  hasReflect: { type: Boolean, required: true },
  hasLightScreen: { type: Boolean, required: true },
  hasSafeguard: { type: Boolean, required: true },
  sparkleCount: { type: Number, required: true },
  radius: { type: Number, required: true },
  animSeed: { type: Number, required: true },
  spriteScale: { type: Number, required: true },
  enabled: { type: Boolean, required: true }
})

const rootRef = ref<HTMLElement | null>(null)
const shinyRef = ref<HTMLElement | null>(null)
const { initSystem: initShinySystem, killAll: killShinyFX } = useParticleEngine()

const initScreenAuraFX = () => {
  const container = rootRef.value?.closest('.pv-fx-wrapper')
  if (!container) return
  const screens = container.querySelectorAll('.pv-fx-screen-overlay')
  screens.forEach(el => {
    gsap.killTweensOf(el)
    gsap.fromTo(el, 
      { scale: 0.95, opacity: 0.4 }, 
      { scale: 1.05, opacity: 0.7, duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut' }
    )
  })
}

const initShinyFX = () => {
  if (!shinyRef.value) return
  const sparkles = Array.from(shinyRef.value.querySelectorAll('.sparkle')) as HTMLElement[]
  const shinyRadius = props.radius * 1.1

  initShinySystem(sparkles, {
    seed: props.animSeed,
    shape: 'circle',
    area: { x: [0, shinyRadius] },
    onRepeat: (el) => {
      gsap.set(el, { filter: `Drop-Shadow(0 0 2px black) Drop-Shadow(0 0 4px gold)` })
    },
    createTweens: (el, _i, delay) => {
      const maxScale = props.spriteScale * gsap.utils.random(0.3, 0.6) * 0.4
      const duration = gsap.utils.random(1.0, 1.5)

      return [
        gsap.fromTo(el, 
          { autoAlpha: 1, opacity: 1, y: 0, scale: 0, rotation: 0, xPercent: -50, yPercent: -50 },
          {
            scale: maxScale,
            rotation: 180,
            duration: duration,
            repeat: -1,
            repeatDelay: 1.3,
            delay,
            ease: 'power1.out'
          }
        ),
        gsap.to(el, {
          scale: 0,
          rotation: 360,
          duration: duration + 0.1,
          repeat: -1,
          repeatDelay: 1.2,
          delay: delay + duration,
        })
      ]
    }
  })
}

watch([() => props.isShiny, () => props.enabled], () => {
  nextTick(() => {
    killShinyFX()
    initShinyFX()
  })
}, { immediate: true })

watch([() => props.hasReflect, () => props.hasLightScreen, () => props.hasSafeguard], () => {
  nextTick(() => initScreenAuraFX())
}, { immediate: true })

onUnmounted(() => {
  killShinyFX()
  gsap.killTweensOf('.pv-fx-screen-overlay')
})
</script>

<template>
  <div
    ref="rootRef"
    class="pv-aura-fx-layer"
  >
    <!-- BRILLOS SHINY -->
    <div
      v-if="isShiny && enabled"
      ref="shinyRef"
      class="pv-fx-shiny-overlay"
      data-fx-type="shiny"
    >
      <div
        v-for="i in sparkleCount"
        :key="i"
        class="sparkle"
      />
    </div>

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

.sparkle {
  position: absolute;
  font-size: 32px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: Scale(0);
  transform-style: preserve-3d;
  &::before { content: '✨'; }
}
</style>
