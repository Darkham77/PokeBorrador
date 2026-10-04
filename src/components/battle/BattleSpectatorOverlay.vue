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
  justify-content: center;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  background: rgb(10 14 24 / 90%);
  border-top: 1px solid rgb(239 68 68 / 40%);
  box-shadow: 0 -4px 16px rgb(0 0 0 / 40%);
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
  padding: 3px 10px;
  border: 1px solid rgb(239 68 68 / 70%);
  border-radius: 4px;
  background: rgb(239 68 68 / 20%);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ef4444;
  box-shadow: 0 0 8px #ef4444;
}

.live-text {
  color: #ef4444;
  font-family: var(--font-pixel, monospace);
  font-size: 0.75rem;
  font-weight: bold;
  letter-spacing: 0.05em;
}

.viewer-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #94a3b8;
  font-family: var(--font-pixel, monospace);
  font-size: 0.8rem;
}

.spectator-status-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e2e8f0;
  font-size: 0.85rem;
}
</style>
