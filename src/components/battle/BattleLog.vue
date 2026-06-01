<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useBattleStore } from '@/stores/battle'

const battleStore = useBattleStore()
const logContainer = ref<HTMLDivElement | null>(null)
const logInner = ref<HTMLDivElement | null>(null)

const logs = computed(() => battleStore.battleLogs)

const scrollToBottom = async (isInstant = false) => {
  await nextTick()
  if (!logContainer.value) return
  
  if (isInstant) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  } else {
    gsap.killTweensOf(logContainer.value)
    gsap.to(logContainer.value, {
      scrollTop: logContainer.value.scrollHeight,
      duration: 0.4,
      ease: 'power2.out'
    })
  }
}

const lastLogId = ref<number | null>(null)

watch(logs, (newVal) => {
  scrollToBottom()
  
  if (newVal && newVal.length > 0) {
    const lastLog = newVal[newVal.length - 1]
    if (lastLog && lastLog.id !== lastLogId.value) {
      const isNew = lastLogId.value !== null
      lastLogId.value = lastLog.id
      
      if (isNew) {
        nextTick(() => {
          const entries = logContainer.value?.querySelectorAll('.log-entry')
          if (entries && entries.length > 0) {
            const lastEntry = entries[entries.length - 1] as HTMLElement
            gsap.killTweensOf(lastEntry)
            gsap.fromTo(lastEntry, 
              { opacity: 0, x: -20, filter: 'Blur(4px)' }, 
              { opacity: 1, x: 0, filter: 'Blur(0px)', duration: 0.5, ease: 'back.out(1.2)' }
            )
          }
        })
      }
    }
  } else {
    lastLogId.value = null
  }
}, { deep: true, immediate: true })

const handleImgError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none'
}

onMounted(() => {
  scrollToBottom(true)
  if (logInner.value) {
    const observer = new ResizeObserver(() => scrollToBottom())
    observer.observe(logInner.value)
  }
})
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    ref="logContainer"
    class="battle-log custom-scrollbar-vicio"
  >
    <div
      ref="logInner"
      class="log-scroll-inner"
    >
      <div 
        v-for="log in logs" 
        :key="log.id" 
        class="log-entry"
        :class="[log.type, `side-${log.side}`]"
      >
        <!-- Siempre renderizamos el wrapper para mantener la alineación de la columna de texto -->
        <div
          class="log-icon-wrapper"
          :class="[log.iconType || 'empty']"
        >
          <span
            v-if="log.iconType === 'emoji'"
            class="log-emoji"
          >{{ log.icon }}</span>
          <img
            v-else-if="log.icon"
            :src="log.icon"
            class="log-icon"
            loading="lazy"
            @error="handleImgError"
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
  padding: 4px 10px;
  overflow-y: auto !important;
  display: block;
  @include smooth-scroll;
  @include gpu-layer;

  /* Estilos de Scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: Rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: Rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    border: 1px solid Rgba(0, 0, 0, 0.2);
    
    &:hover {
      background: Rgba(255, 255, 255, 0.25);
    }
  }

  .log-scroll-inner {
    display: flex;
    flex-direction: column;
    gap: 2px;
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
  padding-bottom: 4px;
  border-bottom: 1px solid Rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  gap: 8px; 
  min-height: 32px;
  will-change: transform, opacity;

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
        will-change: transform, filter, opacity;
  filter: none !important;
        border-radius: 4px;
        border: 1px solid Rgba(255,255,255,0.1);
        background: Rgba(0,0,0,0.2) !important;
      }
    }
    
    // Estilos específicos para ITEMS (Objetos) - Reducidos a la mitad
    &.item {
      .log-icon {
        width: 28px !important;
        height: 28px !important;
        position: relative !important;
        top: auto !important;
        left: auto !important;
        transform: none !important;
      }
    }
    
    &.empty {
      opacity: 0;
    }
  }

  .log-icon {
    @include pixelated;
    width: 56px !important; 
    height: 56px !important;
    max-width: none !important;
    max-height: none !important;
    object-fit: contain;
    will-change: transform, filter, opacity;
    filter: Drop-Shadow(0 4px 8px Rgba(0,0,0,0.4));
    position: absolute;
    top: 50%;
    left: 50%;
    transform: Translate(-50%, -50%);
  }

  .log-emoji {
    @include pixelated;
    font-size: 16px; // Reducido para evitar desbordes
    line-height: 1;
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif !important;
    will-change: transform, filter, opacity;
    filter: Drop-Shadow(0 2px 4px Rgba(0, 0, 0, 0.4));
    
    // Centrado absoluto con prioridad máxima - Forzamos minúscula para asegurar compatibilidad
    position: absolute !important;
    top: 50% !important;
    left: 50% !important;
    transform: Translate(-50%, -50%) !important;
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
    
    .log-icon:not(.trainer .log-icon):not(.item .log-icon) {
      width: 38px !important;
      height: 38px !important;
    }
    
    .trainer .log-icon, .item .log-icon {
      width: 18px !important;
      height: 18px !important;
    }
  }
}

.log-entry:last-child {
  border-bottom: none;
}

/* Entry animations handled by GSAP */

/* Side-based backgrounds (Only 2 bands) */
.log-entry.side-player {
  background: Linear-Gradient(90deg, Rgba(0, 255, 127, 0.15) 0%, Transparent 80%);
  border-left: 2px solid Rgba(0, 255, 127, 0.4);
}
.log-entry.side-enemy {
  background: Linear-Gradient(90deg, Rgba(255, 65, 54, 0.15) 0%, Transparent 80%);
  border-left: 2px solid Rgba(255, 65, 54, 0.4);
}

/* Compatibility with new types (Text only overrides) */
:deep(.log-info) { color: var(--yellow); font-weight: 500; }
:deep(.log-player) { color: Rgba(0, 255, 127, 1); }
:deep(.log-enemy) { color: Rgba(255, 65, 54, 1); }
:deep(.log-catch) { color: Rgba(177, 13, 201, 1); }

/* Semantic types */
:deep(.log-damage) { color: Rgba(255, 65, 54, 1); }
:deep(.log-heal) { color: Rgba(0, 255, 127, 1); }
:deep(.log-status) { color: Rgba(177, 13, 201, 1); }

.log-entry {
  padding-left: 6px;
  border-radius: 4px 0 0 4px;
  
  min-height: 28px !important;
  
  &:hover {
    background-color: Rgba(255, 255, 255, 0.03) !important;
  }
}

</style>
