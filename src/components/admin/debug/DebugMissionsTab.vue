<script setup>
import { useBreedingStore } from '@/stores/breeding'
import { useGameStore } from '@/stores/game'
import { useDebugStore } from '@/stores/debug'

const _breeding = useBreedingStore()
const game = useGameStore()
const debug = useDebugStore()

const regenerate = () => {
  if (window.__VITE_DEBUG__?.regenerateMissions) {
    window.__VITE_DEBUG__.regenerateMissions()
  } else {
    console.warn('[DEBUG] Fallback: regenerateMissions from store directly')
    const tool = debug.tools.find(t => t.command === 'regenerateMissions')
    if (tool) tool.action()
  }
}

const clear = () => {
  if (!confirm('¿Seguro que quieres borrar todas las misiones actuales?')) return

  if (window.__VITE_DEBUG__?.clearMissions) {
    window.__VITE_DEBUG__.clearMissions()
  } else {
    console.warn('[DEBUG] Fallback: clearMissions from store directly')
    const tool = debug.tools.find(t => t.command === 'clearMissions')
    if (tool) tool.action()
  }
}
</script>

<template>
  <div class="debug-grid">
    <div class="debug-card full-width">
      <label>Misiones de Guardería</label>
      <div class="mission-status">
        Actualmente: <span>{{ game.state.daycare_missions?.length || 0 }}</span> activas
      </div>
      
      <div class="button-row">
        <button 
          class="small-btn primary"
          @click="regenerate"
        >
          REGENERAR AHORA
        </button>
        <button 
          class="small-btn danger"
          @click="clear"
        >
          LIMPIAR TODO
        </button>
      </div>
    </div>

    <div class="debug-card full-width">
      <label>Vista Previa (JSON)</label>
      <pre class="debug-json">{{ game.state.daycare_missions }}</pre>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/debug";

.mission-status {
  font-size: 11px;
  color: #94a3b8;
  margin: 10px 0;
  span { color: var(--yellow); font-weight: bold; }
}

.debug-json {
  font-size: 9px;
  background: rgba(0,0,0,0.3);
  padding: 10px;
  border-radius: 8px;
  color: #4ade80;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.full-width {
  grid-column: 1 / -1;
}

.small-btn {
  &.primary { border-color: #8b5cf6; color: #a78bfa; }
  &.danger { border-color: #ef4444; color: #f87171; }
}
</style>
