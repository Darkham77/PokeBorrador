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
        <!-- Siempre renderizamos el wrapper para mantener la alineación de la columna de texto -->
        <div
          class="log-icon-wrapper"
          :class="[log.iconType || 'empty']"
        >
          <img
            v-if="log.icon"
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
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 10px 15px;
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
  gap: 8px; 
  min-height: 32px;

  .log-icon-wrapper {
    flex-shrink: 0;
    width: 42px; // Ancho base estándar para TODOS los casos
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: var(--z-low);

    // Estilos específicos para AVATAR (Entrenador)
    &.trainer {
      // El contenedor externo mantiene los 42px para alineación, 
      // pero el contenido interno se centra y reduce.
      .log-icon {
        width: 28px !important;
        height: 28px !important;
        max-width: none !important;
        max-height: none !important;
        object-fit: cover; 
        transform: none !important;
        top: auto !important;
        left: auto !important;
        position: relative !important;
        filter: none !important;
        border-radius: 4px;
        border: 1px solid Rgba(255,255,255,0.1);
        background: Rgba(0,0,0,0.2) !important;
      }
    }
    
    &.empty {
      opacity: 0;
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
    position: relative;
    z-index: var(--z-base);
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
    
    .log-icon:not(.trainer .log-icon) {
      width: 38px !important;
      height: 38px !important;
    }
    
    .trainer .log-icon {
      width: 22px !important;
      height: 22px !important;
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
