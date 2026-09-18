<script setup lang="ts">
/**
 * src/components/map/MapCardSpawnsTrigger.vue
 * 
 * Animated Pokéball button triggering the Route Spawns modal.
 */
import { useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useUIStore } from '@/stores/ui'

const POKEBALL_TRIGGER_HOVER_OFFSET_PX = 1
const POKEBALL_TRIGGER_HOVER_SCALE = 1.15
const GSAP_TRANSITION_DURATION_SEC = 0.2

const emit = defineEmits<{
  (e: 'click'): void
}>()

const uiStore = useUIStore()
const pokeballTriggerRef = useTemplateRef<HTMLElement>('pokeballTriggerRef')

const onMouseEnter = () => {
  if (uiStore.isLowPowerActive) return
  if (pokeballTriggerRef.value) {
    gsap.to(pokeballTriggerRef.value, {
      x: POKEBALL_TRIGGER_HOVER_OFFSET_PX,
      y: POKEBALL_TRIGGER_HOVER_OFFSET_PX,
      scale: POKEBALL_TRIGGER_HOVER_SCALE,
      duration: GSAP_TRANSITION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }
}

const onMouseLeave = () => {
  if (uiStore.isLowPowerActive) {
    if (pokeballTriggerRef.value) {
      gsap.set(pokeballTriggerRef.value, { clearProps: 'transform,x,y,scale' })
    }
    return
  }
  if (pokeballTriggerRef.value) {
    gsap.to(pokeballTriggerRef.value, {
      x: 0,
      y: 0,
      scale: 1,
      duration: GSAP_TRANSITION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto',
      onComplete: () => {
        if (pokeballTriggerRef.value) {
          gsap.set(pokeballTriggerRef.value, { clearProps: 'transform,x,y,scale' })
        }
      }
    })
  }
}
</script>

<template>
  <PVTooltip
    title="REPORTE DE ENCUENTROS"
    description="Ver probabilidades en tiempo real de todos los Pokémon."
    position="top"
    class="pokeball-route-tooltip"
  >
    <div
      class="pokeball-route-trigger"
      @click.stop.prevent="emit('click')"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <div
        ref="pokeballTriggerRef"
        class="pokeball-icon-wrapper"
      >
        <img
          :src="getAssetUrl(ASSET_TYPES.ITEM, 'pokeball')"
          class="pokeball-icon"
          alt="Spawns"
        >
      </div>
    </div>
  </PVTooltip>
</template>

<style src="./MapCard.styles.scss" scoped lang="scss"></style>
