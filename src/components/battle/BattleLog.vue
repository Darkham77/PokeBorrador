<script setup>
import { computed, watch, ref, nextTick, onMounted } from 'vue'
import { useBattleStore } from '@/stores/battle'

const battleStore = useBattleStore()
const logContainer = ref(null)

const logs = computed(() => battleStore.battleLogs)

const scrollToBottom = async () => {
  await nextTick()
  setTimeout(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  }, 50)
}

// Watch both length and internal content changes
watch(logs, scrollToBottom, { deep: true })

onMounted(() => {
  scrollToBottom()
  if (logContainer.value) {
    const observer = new ResizeObserver(scrollToBottom)
    observer.observe(logContainer.value)
  }
})

</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    ref="logContainer"
    class="battle-log custom-scrollbar-vicio"
  >
    <div class="log-scroll-inner">
      <div 
        v-for="log in logs" 
        :key="log.id" 
        class="log-entry"
        :class="log.type"
      >
        <div
          v-if="log.icon"
          class="log-icon-wrapper"
          :class="log.iconType"
        >
          <img
            :src="log.icon"
            class="log-icon"
            loading="lazy"
            @error="e => e.target.style.display = 'none'"
          >
        </div>
        <span
          class="log-text"
          v-html="log.msg"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.battle-log {
  height: 100%;
  width: 100%;
  min-height: 0;
  padding: 20px;
  overflow-y: auto !important;
  display: block;
  @include smooth-scroll;
  @include gpu-layer;

  .log-scroll-inner {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  @media (max-width: 560px) {
    padding: 10px !important;
    .log-scroll-inner {
      gap: 4px !important;
    }
  }
}

.log-entry {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  line-height: 1.6;
  color: Rgba(255,255,255,0.9);
  animation: slideIn 0.3s ease-out;
  padding-bottom: 4px;
  border-bottom: 1px solid Rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  gap: 4px !important; // Máxima cercanía
  min-height: 32px;

  .log-icon-wrapper {
    flex-shrink: 0;
    width: 42px !important; // Punto medio para sprites grandes
    height: 32px !important;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent !important;
    border-radius: 0 !important;
    overflow: visible !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;
    position: relative;

    &::before, &::after { display: none !important; }

    &.item, &.pokemon {
      background: transparent !important;
    }
  }

  .log-icon {
    width: 56px !important;
    height: 56px !important;
    max-width: none !important;
    max-height: none !important;
    object-fit: contain;
    image-rendering: pixelated;
    filter: Drop-Shadow(0 4px 8px Rgba(0,0,0,0.4));
    position: absolute;
    top: 50%;
    left: 50%;
    transform: Translate(-50%, -50%);
  }

  .log-text {
    flex: 1;
  }

  @media (max-width: 560px) {
    font-size: 11px !important;
    padding: 2px 0 !important;
    margin: 0 !important;
    line-height: 1.3 !important;
    border-bottom: 1px solid Rgba(255,255,255,0.03) !important;
    min-height: 0 !important;
    gap: 8px !important;

    .log-icon-wrapper {
      width: 28px !important;
      height: 28px !important;
    }
  }
}

.log-entry:last-child {
  border-bottom: none;
}

@keyframes slideIn {
  from { opacity: 0; transform: TranslateX(-10px); }
  to { opacity: 1; transform: TranslateX(0); }
}

/* Color overrides mapping to legacy types */
:deep(.log-info) { color: $yellow; font-weight: 500; }
:deep(.log-player) { color: $green; }
:deep(.log-enemy) { color: $red; }
:deep(.log-catch) { color: $purple; }

/* Compatibility with new types */
:deep(.log-damage) { color: $red; }
:deep(.log-heal) { color: $green; }
:deep(.log-status) { color: $purple; }

</style>
