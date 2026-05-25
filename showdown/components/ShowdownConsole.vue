<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';
import { useShowdownSandboxStore } from '../useShowdownSandboxStore';

const store = useShowdownSandboxStore();
const consoleBody = ref<HTMLElement | null>(null);

// Función para limpiar el log de batalla
const clearLog = () => {
  store.battleLog = [];
};

// Auto-scroll para la consola de logs de Showdown
watch(() => store.battleLog.length, () => {
  nextTick(() => {
    if (consoleBody.value) {
      consoleBody.value.scrollTop = consoleBody.value.scrollHeight;
    }
  });
});

onMounted(() => {
  // Asegura un scroll inicial si ya hay logs cargados
  nextTick(() => {
    if (consoleBody.value) {
      consoleBody.value.scrollTop = consoleBody.value.scrollHeight;
    }
  });
});
</script>

<template>
  <aside class="console-panel">
    <div class="console-header">
      <span class="console-title">&gt;_ CONSOLA DE SIMULACIÓN (SHOWDOWN LOG)</span>
      <button
        class="clear-console-btn"
        @click="clearLog"
      >
        Limpiar
      </button>
    </div>
    <div
      ref="consoleBody"
      class="console-body"
    >
      <div
        v-for="(log, idx) in store.battleLog"
        :key="idx"
        class="console-line"
        :class="`log-${log.type}`"
      >
        <span class="line-arrow">&gt;</span> {{ log.text }}
      </div>
      <div
        v-if="store.isAnimating"
        class="console-line active-line"
      >
        <span class="line-cursor">▒</span> Procesando acciones en Worker...
      </div>
      <div
        v-else
        class="console-line active-line"
      >
        <span class="line-cursor">▒</span> Esperando elección del jugador...
      </div>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.console-panel {
  width: 320px;
  height: 100%;
  background: #030509;
  border-left: 2px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  z-index: 80;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);

  @media (max-width: 1000px) {
    width: 250px;
  }

  @media (max-width: 700px) {
    position: absolute;
    right: 0;
    top: 57px;
    bottom: 0;
    height: calc(100% - 57px);
    width: 280px;
  }
}

.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #0f1220;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  .console-title {
    font-family: var(--font-pixel);
    font-size: 8px;
    color: var(--blue, #0a84ff);
    letter-spacing: 0.5px;
  }

  .clear-console-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--gray, #86868b);
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--red, #ff453a);
      color: var(--red, #ff453a);
    }
  }
}

.console-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #a3b3c9;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0,0,0,0.2);
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.2);
  }
}

.console-line {
  word-break: break-word;
  white-space: pre-wrap;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.03);
  padding-bottom: 6px;

  &.log-start { color: #f5f5f7; font-weight: bold; }
  &.log-move { color: #ffffff; }
  &.log-damage { color: #ff5e5e; }
  &.log-heal { color: #6ee7b7; }
  &.log-faint { color: #ef4444; font-weight: bold; }
  &.log-supereffective { color: #fbbf24; font-weight: bold; }
  &.log-resisted { color: #9ca3af; }
  &.log-crit { color: #f97316; font-weight: bold; text-shadow: 0 0 5px rgba(249, 115, 22, 0.4); }
  &.log-ability { color: #60a5fa; font-weight: bold; }
  &.log-status { color: #c084fc; }
  &.log-weather { color: #38bdf8; }
  &.log-miss { color: #9ca3af; font-style: italic; }
  &.log-info { color: #d1d5db; }
  &.log-switch { color: #60a5fa; font-weight: bold; }

  .line-arrow {
    color: var(--blue, #0a84ff);
    font-weight: bold;
  }
}

.active-line {
  color: var(--green, #32d74b);
  display: flex;
  align-items: center;
  gap: 4px;

  .line-cursor {
    animation: blink 1s step-end infinite;
  }
}

@keyframes blink {
  50% { opacity: 0; }
}
</style>
