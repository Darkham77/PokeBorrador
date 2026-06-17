<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle/battle'

const classStore = usePlayerClassStore()
const uiStore = useUIStore()
const battleStore = useBattleStore()

const isPerformanceMode = computed(() => {
  return uiStore.isAnyBlockingModalOpen || battleStore.isBattleActive || uiStore.isDebugPerformanceMode
})

const isRocket = computed(() => classStore.playerClass === 'rocket')
const criminality = computed(() => classStore.classData.criminality || 0)
const activeTab = computed(() => uiStore.activeTab)

// Solo se muestra en la pestaña de mapa para el equipo rocket y si no estamos en modo performance
const isVisible = computed(() => isRocket.value && activeTab.value === 'map' && !isPerformanceMode.value)
const isMax = computed(() => criminality.value >= 100)
const percentLabelText = computed(() => {
  if (criminality.value > 100) {
    const excess = criminality.value - 100
    const bonusLv = Math.floor(excess / 50)
    if (bonusLv > 0) {
      return `${criminality.value}% (+${bonusLv} LV)`
    }
  }
  return `${criminality.value}%`
})
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
          v-gsap-loop="{ effect: 'blink-red', duration: 0.5, active: isMax }"
          class="bar-fill" 
          :style="{ height: Math.min(100, criminality) + '%' }"
        >
          <div
            v-if="isMax"
            class="glow-effect"
          />
        </div>
      </div>
      <div class="percent-label">
        {{ percentLabelText }}
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.criminality-container {
  position: fixed;
  right: calc(6px + var(--scrollbar-width, 0px));
  top: 50%;
  transform: Translatey(-50%);
  width: 24px; // Aumentado para dar aire lateral
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: var(--z-base);
  pointer-events: none;
  padding: 20px 10px;
  background: Rgba(0, 0, 0, 0.8); // Solidez al 80% para contraste puro
  border-radius: 20px;
  box-shadow: 0 0 30px Rgba(0, 0, 0, 0.9); // Aura oscura eficiente
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
  
  box-shadow: 0 0 15px Rgba(239, 68, 68, 1);
  position: relative;
}

.percent-label {
  margin-top: 8px;
  font-size: 10px;
  font-weight: 800;
  color: Rgba(239, 68, 68, 1);
  text-shadow: 1px 1px var(--black), 0 0 5px Rgba(239, 68, 68, 0.4);
  writing-mode: vertical-lr;
  transform: Rotate(180deg);
  @include pixelated;
}



.slide-right-enter-active, .slide-right-leave-active {
  
}
.slide-right-enter-from, .slide-right-leave-to {
  opacity: 0;
  transform: Translatey(-50%) Translatex(30px);
}
</style>
