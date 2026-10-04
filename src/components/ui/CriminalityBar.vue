<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle/battle'
import { calculatePoliceBonusLevel } from '@/logic/player/classMath'
import { useGsapTransition } from '@/composables/ui/useGsapTransition'

const SLIDE_TRANSITION_OFFSET_PX = 30 as const

const classStore = usePlayerClassStore()
const uiStore = useUIStore()
const battleStore = useBattleStore()
const { beforeEnter, enter, leave } = useGsapTransition({ type: 'slide-right', xOffset: SLIDE_TRANSITION_OFFSET_PX })

const isFastMode = computed(() => {
  return uiStore.isFastMode || battleStore.isBattleActive
})

const isRocket = computed(() => classStore.playerClass === 'rocket')
const criminality = computed(() => classStore.classData.criminality || 0)
const activeTab = computed(() => uiStore.activeTab)

// Solo se muestra en la pestaña de mapa para el equipo rocket y si no estamos en modo rápido
const isVisible = computed(() => isRocket.value && activeTab.value === 'map' && !isFastMode.value)
const isMax = computed(() => criminality.value >= 100)
const percentLabelText = computed(() => {
  if (criminality.value > 100) {
    const bonusLv = calculatePoliceBonusLevel(criminality.value)
    if (bonusLv > 0) {
      return `${criminality.value}% (+${bonusLv} LV)`
    }
  }
  return `${criminality.value}%`
})
</script>

<template>
  <Transition
    :css="false"
    @before-enter="beforeEnter"
    @enter="enter"
    @leave="leave"
  >
    <div
      v-if="isVisible"
      id="criminality-bar"
      class="criminality-container"
    >
      <div class="label press-start">
        CRIMEN
      </div>
      <div class="bar-bg">
        <div 
          id="criminality-bar-fill"
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
      <div 
        id="criminality-percent-label"
        class="percent-label"
      >
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
  top: 0;
  right: calc(6px + var(--scrollbar-width, 0px));
  bottom: 0;
  z-index: var(--z-base);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px; // Aumentado para dar aire lateral
  height: fit-content;
  padding: 20px 10px;
  border-radius: 20px;
  background: rgb(0 0 0 / 80%); // Solidez al 80% para contraste puro
  margin-block: auto;
  pointer-events: none;
  box-shadow: 0 0 30px rgb(0 0 0 / 90%); // Aura oscura eficiente
}

.label {
  @include pixelated;

  color: rgb(239 68 68 / 100%);
  font-size: 8px;
  transform: rotate(180deg);
  writing-mode: vertical-lr;
  margin-bottom: 8px;
  text-shadow: 1px 1px var(--black), 0 0 5px rgb(239 68 68 / 40%);
}

.bar-bg {
  display: flex;
  align-items: flex-end;
  width: 12px;
  height: 200px;
  border: 2px solid rgb(51 51 51 / 100%);
  border-radius: 10px;
  background: var(--black);
  overflow: hidden;
  box-shadow: 0 0 10px rgb(0 0 0 / 50%), inset 0 0 5px rgb(0 0 0 / 80%);
}

.bar-fill {
  position: relative;
  width: 100%;
  background: rgb(239 68 68 / 100%);
  box-shadow: 0 0 15px rgb(239 68 68 / 100%);
}

.percent-label {
  @include pixelated;

  color: rgb(239 68 68 / 100%);
  font-size: 10px;
  font-weight: 800;
  transform: rotate(180deg);
  margin-top: 8px;
  text-shadow: 1px 1px var(--black), 0 0 5px rgb(239 68 68 / 40%);
  writing-mode: vertical-lr;
}
</style>
