<script setup>
import { computed } from 'vue'
import { usePlayerClassStore } from '@/stores/playerClass'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'

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
@use "@/styles/core/tools" as *;

.criminality-container {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
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
  inset: -5px;
  background: rgba(0, 0, 0, 0.8);
  filter: Blur(15px);
  border-radius: 40px;
  z-index: -1;
}

.label {
  writing-mode: vertical-lr;
  transform: Rotate(180deg);
  font-size: 8px;
  color: #ef4444;
  margin-bottom: 8px;
  text-shadow: 1px 1px $black, 0 0 5px rgba(239, 68, 68, 0.4);
  font-family: 'Press Start 2P', cursive;
}

.bar-bg {
  width: 12px;
  height: 200px;
  background: $black;
  border: 2px solid #333;
  border-radius: 10px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5), inset 0 0 5px rgba(0, 0, 0, 0.8);
}

.bar-fill {
  width: 100%;
  background: #ef4444;
  transition: height 0.3s ease;
  box-shadow: 0 0 15px #ef4444;
  position: relative;
}

.percent-label {
  margin-top: 8px;
  font-size: 10px;
  font-weight: 800;
  color: #ef4444;
  text-shadow: 1px 1px $black, 0 0 5px rgba(239, 68, 68, 0.4);
}

.blinking {
  animation: blinkRed 0.5s infinite;
}

@keyframes blinkRed {
  0% { background: #ef4444; box-shadow: 0 0 20px #ef4444; }
  50% { background: #991b1b; box-shadow: 0 0 5px #991b1b; }
  100% { background: #ef4444; box-shadow: 0 0 20px #ef4444; }
}

.slide-right-enter-active, .slide-right-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.slide-right-enter-from, .slide-right-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(30px);
}
</style>
