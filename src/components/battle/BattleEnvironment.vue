<script setup>
import { computed } from 'vue'
import { useBattleBackground } from '@/composables/useBattleBackground'

const props = defineProps({
  locationId: { type: String, default: 'route1' },
  currentCycle: { type: String, default: 'dia' }
})

const { getBackgroundUrl } = useBattleBackground()

const bgData = computed(() => {
  return getBackgroundUrl(props.locationId, props.currentCycle)
})

const handleBackgroundError = (e) => {
  const currentSrc = e.target.src
  if (currentSrc.includes('_')) {
    const baseSrc = currentSrc.substring(0, currentSrc.lastIndexOf('_')) + '.webp'
    if (baseSrc !== currentSrc) {
      e.target.src = baseSrc
    }
  }
}
</script>

<template>
  <div class="battle-environment">
    <!-- Fondo dinámico -->
    <img 
      :src="bgData.url" 
      class="arena-bg" 
      @error="handleBackgroundError"
    >
  </div>
</template>

<style scoped lang="scss">
.arena-bg {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover;
  z-index: calc(var(--z-base) + 1);
  image-rendering: pixelated !important;
}

.battle-environment {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
