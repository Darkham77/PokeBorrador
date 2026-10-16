<script setup lang="ts">
import { computed } from 'vue';
import { useLivePvPStore } from '@/stores/livePvP';

interface Props {
  viewerCount?: number;
}

const props = withDefaults(defineProps<Props>(), {
  viewerCount: 1
});

const livePvP = useLivePvPStore();
const phase = computed(() => livePvP.battleState.phase);

const statusText = computed(() => {
  if (phase.value === 'faint_switch') return '¡Esperando cambio tras debilitamiento!';
  if (phase.value === 'resolving') return 'Resolviendo turno en tiempo real...';
  return 'Esperando elecciones de los entrenadores...';
});
</script>

<template>
  <div id="battle-spectator-overlay" class="spectator-overlay">
    <div class="spectator-badge-container">
      <div class="live-indicator">
        <span class="pulse-dot" />
        <span class="live-text">EN VIVO</span>
      </div>
      <div class="viewer-count">
        <span class="emoji icon">👥</span>
        <span class="count">{{ props.viewerCount }}</span>
      </div>
    </div>
    <div class="spectator-status-banner">
      <span class="emoji status-icon">⚔️</span>
      <span class="status-msg">{{ statusText }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/tools' as *;

.spectator-overlay {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: $spacing-sm;
  width: 100%;
  padding: 12px 16px;
  background: Rgb(10 14 24 / 90%);
  border-top: 1px solid Rgb(239 68 68 / 40%);
  box-shadow: var(--shadow-card);
}

.spectator-badge-container {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.live-indicator {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm-alt;
  padding: 3px 10px;
  border: 1px solid Rgb(239 68 68 / 70%);
  border-radius: $radius-sm;
  background: Rgb(239 68 68 / 20%);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--red-light);
  box-shadow: var(--shadow-glow-yellow-sm);
}

.live-text {
  color: var(--red-light);
  font-family: var(--font-pixel, monospace);
  font-size: var(--font-12);
  font-weight: bold;
  letter-spacing: 0.05em;
}

.viewer-count {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  color: var(--slate-400);
  font-family: var(--font-pixel, monospace);
  font-size: var(--font-13);
}

.spectator-status-banner {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  color: var(--slate-200);
  font-size: var(--font-14);
}
</style>
