<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerClassStore } from '@/stores/playerClass'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'

const classStore = usePlayerClassStore() as any
const uiStore = useUIStore() as any
const battleStore = useBattleStore() as any

const isPerformanceMode = computed(() => {
  return uiStore.isAnyBlockingModalOpen || battleStore.isBattleActive || uiStore.isDebugPerformanceMode
})

const isRocket = computed(() => classStore.playerClass === 'rocket')
const criminality = computed(() => classStore.classData.criminality || 0)
const activeTab = computed(() => uiStore.activeTab)

// Solo se muestra en la pestaña de mapa para el equipo rocket y si no estamos en modo performance
const isVisible = computed(() => isRocket.value && activeTab.value === 'map' && !isPerformanceMode.value)
const isMax = computed(() => criminality.value >= 100)
</script>

<template>
  <Transition name="slide-right">
    <div
      v-if="isVisible"
      class="criminality-container"
    >
      <div class="label press-start">
        CRIMEN
      </div>
      <div class="bar-bg">
        <div 
          class="bar-fill" 
          :class="{ blinking: isMax }"
          :style="{ height: criminality + '%' }"
        >
          <div
            v-if="isMax"
            class="glow-effect"
          />
        </div>
      </div>
      <div class="percent-label">
        {{ criminality }}%
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.criminality-container {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: Translatey(-50%);
  width: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: var(--z-base);
  pointer-events: none;
  padding: 15px 10px;
}

/* Premium 'Black Neon' shadow */
.criminality-container::before {
  content: '';
  position: absolute;
  inset: -10px; // Aumentado para mayor cobertura
  background: Rgba(0, 0, 0, 0.85);
  will-change: filter, opacity;
  will-change: transform, filter, opacity;
  filter: Blur(20px); // Aumentado para un aura más suave y expansiva
  border-radius: 40px;
  z-index: -1;
}

.label {
  writing-mode: vertical-lr;
  transform: Rotate(180deg);
  font-size: 8px;
  color: Rgba(239, 68, 68, 1);
  margin-bottom: 8px;
  text-shadow: 1px 1px var(--black), 0 0 5px Rgba(239, 68, 68, 0.4);
  @include pixelated;
}

.bar-bg {
  width: 12px;
  height: 200px;
  background: var(--black);
  border: 2px solid Rgba(51, 51, 51, 1);
  border-radius: 10px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  box-shadow: 0 0 10px Rgba(0, 0, 0, 0.5), inset 0 0 5px Rgba(0, 0, 0, 0.8);
}

.bar-fill {
  width: 100%;
  background: Rgba(239, 68, 68, 1);
  transition: height 0.3s ease;
  box-shadow: 0 0 15px Rgba(239, 68, 68, 1);
  position: relative;
}

.percent-label {
  margin-top: 8px;
  font-size: 10px;
  font-weight: 800;
  color: Rgba(239, 68, 68, 1);
  text-shadow: 1px 1px var(--black), 0 0 5px Rgba(239, 68, 68, 0.4);
}

.blinking {
  animation: blinkRed 0.5s infinite;
}

@keyframes blinkRed {
  0% { background: Rgba(239, 68, 68, 1); box-shadow: 0 0 20px Rgba(239, 68, 68, 1); }
  50% { background: Rgba(153, 27, 27, 1); box-shadow: 0 0 5px Rgba(153, 27, 27, 1); }
  100% { background: Rgba(239, 68, 68, 1); box-shadow: 0 0 20px Rgba(239, 68, 68, 1); }
}

.slide-right-enter-active, .slide-right-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.slide-right-enter-from, .slide-right-leave-to {
  opacity: 0;
  transform: Translatey(-50%) Translatex(30px);
}
</style>
