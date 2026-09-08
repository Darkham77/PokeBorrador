<script setup lang="ts">
import { computed } from 'vue'
import { useLivePvPStore } from '@/stores/livePvP'

interface Props {
  viewerCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  viewerCount: 1
})

const livePvP = useLivePvPStore()
const phase = computed(() => livePvP.battleState.phase)

const statusText = computed(() => {
  if (phase.value === 'faint_switch') return '¡Esperando cambio tras debilitamiento!'
  if (phase.value === 'resolving') return 'Resolviendo turno en tiempo real...'
  return 'Esperando elecciones de los entrenadores...'
})
</script>

<template>
  <div
    id="battle-spectator-overlay"
    class="spectator-overlay"
  >
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
@use "@/styles/core/tools" as *;

.spectator-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px 16px;
  gap: 8px;
  background: Rgba(10, 14, 24, 0.9);
  border-top: 1px solid Rgba(239, 68, 68, 0.4);
  box-shadow: 0 -4px 16px Rgba(0, 0, 0, 0.4);
}

.spectator-badge-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: Rgba(239, 68, 68, 0.2);
  border: 1px solid Rgba(239, 68, 68, 0.7);
  padding: 3px 10px;
  border-radius: 4px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background-color: #ef4444;
  border-radius: 50%;
  box-shadow: 0 0 8px #ef4444;
}

.live-text {
  font-family: var(--font-pixel, monospace);
  font-size: 0.75rem;
  font-weight: bold;
  color: #ef4444;
  letter-spacing: 0.05em;
}

.viewer-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #94a3b8;
  font-size: 0.8rem;
  font-family: var(--font-pixel, monospace);
}

.spectator-status-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #e2e8f0;
}
</style>
