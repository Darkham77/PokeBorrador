<script setup lang="ts">
import { computed } from 'vue'
import { useBattleBackground, type BattleBackgroundLocationId } from '@/composables/battle/useBattleBackground'

interface Props {
  locationId?: BattleBackgroundLocationId
  currentCycle?: string
}

const props = withDefaults(defineProps<Props>(), {
  locationId: 'route1',
  currentCycle: 'dia'
})

const { getBackgroundUrl } = useBattleBackground()

const bgData = computed(() => {
  return getBackgroundUrl(props.locationId, props.currentCycle)
})

const handleBackgroundError = (e: Event) => {
  const target = e.target as HTMLImageElement
  const currentSrc = target.src
  if (currentSrc.includes('_')) {
    const baseSrc = currentSrc.substring(0, currentSrc.lastIndexOf('_')) + '.webp'
    if (baseSrc !== currentSrc) {
      target.src = baseSrc
    }
  }
}
</script>

<template>
  <div
    class="battle-environment"
    data-weathers="raindance sunnyday electricterrain grassyterrain mistyterrain psychicterrain"
  >
    <!-- Fondo dinámico -->
    <img 
      :src="bgData.url" 
      class="arena-bg" 
      @error="handleBackgroundError"
    >
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.arena-bg {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover;
  z-index: calc(var(--z-base) + 1);
  filter: var(--weather-filter, Brightness(1) contrast(1));
  will-change: filter;
  @include pixelated;
}

.battle-environment {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>

