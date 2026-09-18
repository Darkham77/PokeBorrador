<script setup lang="ts">
import { useBattleStore } from '@/stores/battle/battle'
import { useUIStore } from '@/stores/ui'

const battleStore = useBattleStore()
const uiStore = useUIStore()

const zoomIn = () => {
  const current = battleStore.debugZoom
  if (current < 1.0) {
    const nextZoom = Math.min(1.0, Math.round((current + 0.1) * 10) / 10)
    battleStore.debugZoom = nextZoom
  }
}

const zoomOut = () => {
  const current = battleStore.debugZoom
  if (current > 0.5) {
    const nextZoom = Math.max(0.5, Math.round((current - 0.1) * 10) / 10)
    battleStore.debugZoom = nextZoom
  }
}

const copyReplay = async () => {
  const payload = battleStore.getCombatReplayPayload()
  if (!payload) {
    uiStore.notify('No hay combate activo para exportar', '⚠️')
    return
  }
  const text = JSON.stringify(payload, null, 2)
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    }
    uiStore.notify('Replay de combate copiado al portapapeles', '📋')
  } catch (err) {
    console.error('Failed to copy replay to clipboard:', err)
  }
}
</script>

<template>
  <div class="camera-zoom-controls">
    <button
      class="zoom-btn"
      :disabled="battleStore.debugZoom >= 1.0"
      title="Acercar cámara"
      @click.stop="zoomIn"
    >
      +
    </button>
    <button
      class="zoom-btn"
      :disabled="battleStore.debugZoom <= 0.5"
      title="Alejar cámara"
      @click.stop="zoomOut"
    >
      -
    </button>
    <button
      class="zoom-btn"
      title="Copiar Replay de Combate"
      @click.stop="copyReplay"
    >
      <span class="emoji">📋</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.camera-zoom-controls {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  gap: 8px;
  z-index: calc(var(--z-base) + 40);
  pointer-events: auto;
  @include pixelated;
}

.zoom-btn {
  @include btn-vicio('neutral', 'sm');
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
  font-size: 10px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  .emoji {
    line-height: 1;
    font-size: 12px;
  }
}
</style>
