<script setup lang="ts">
import { useBattleStore } from '@/stores/battle/battle'
import BattleBallPicker from './BattleBallPicker.vue'

interface Props {
  isFinishing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isFinishing: false
})

const emit = defineEmits<{
  (e: 'switch'): void
  (e: 'bag'): void
  (e: 'catch'): void
  (e: 'select-ball', ballId: string): void
}>()

import { computed } from 'vue'

const battleStore = useBattleStore()

const isLocked = computed(() => {
  const p = battleStore.player
  if (!p) return false
  const volatile = p.volatileCounters
  if (!volatile) return false
  return !!((volatile['twoturnmove'] && volatile['twoturnmove'] > 0) || 
            (volatile['lockedmove'] && volatile['lockedmove'] > 0))
})

// Eliminamos onHoverBtn manual para usar los estados nativos del mixin btn-vicio

</script>

<template>
  <div 
    class="actions-container"
    :class="{ 'intro-fade': battleStore.isIntroAnimating }"
  >
    <div class="action-row-complex">
      <button
        class="action-btn switch-btn"
        :disabled="battleStore.isProcessing || props.isFinishing || battleStore.isIntroAnimating || !!(battleStore.player?.volatileCounters?.['partiallytrapped']) || !!(battleStore.player?.trapped) || isLocked"
        @click.stop="emit('switch')"
      >
        <span class="icon">🔄</span> <span class="text">CAMBIAR</span>
      </button>

      <BattleBallPicker 
        :is-finishing="props.isFinishing"
        :disabled="battleStore.isProcessing || props.isFinishing || battleStore.isIntroAnimating || isLocked"
        @select-ball="(id: string) => emit('select-ball', id)"
        @catch="emit('catch')"
      />

      <button
        class="action-btn bag-btn"
        :disabled="battleStore.isProcessing || props.isFinishing || battleStore.isIntroAnimating || isLocked"
        @click.stop="emit('bag')"
      >
        <span class="icon">🎒</span> <span class="text">MOCHILA</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.actions-container {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: visible;
  position: relative;
  z-index: var(--z-low);

  &.intro-fade {
    opacity: 0.1;
    pointer-events: none;
  }
}

.action-row-complex {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--move-panel-gap, 12px);
  align-items: center;
  overflow: visible;

  .action-btn {
    flex: 1;
    
    .text {
      @include pixelated;
      font-size: 8px;
    }

    &.switch-btn {
      @include btn-vicio('secondary', 'sm');
    }

    &.bag-btn {
      @include btn-vicio('success', 'sm');
    }
  }
}
</style>
