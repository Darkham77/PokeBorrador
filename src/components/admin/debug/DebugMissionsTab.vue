<script setup>
import { useBreedingStore } from '@/stores/breeding'
import { useGameStore } from '@/stores/game'
import { useDebugStore } from '@/stores/debug'
import PVTooltip from '@/components/common/PVTooltip.vue'

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
        <PVTooltip title="Fuerza la regeneración de nuevas misiones de guardería.">
          <button 
            class="small-btn primary"
            @click.stop="regenerate"
          >
            REGENERAR AHORA
          </button>
        </PVTooltip>
        <PVTooltip title="Borra todas las misiones activas de la base de datos local.">
          <button 
            class="small-btn danger"
            @click.stop="clear"
          >
            LIMPIAR TODO
          </button>
        </PVTooltip>
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
  font-size: 8px;
  color: $muted;
  margin: 10px 0;
  span { color: var(--yellow); font-weight: bold; }
}

.debug-json {
  font-size: 8px;
  background: Rgba(0,0,0,0.3);
  padding: 10px;
  border-radius: 8px;
  color: $green;
  max-height: 200px;
  min-height: 0;
  overflow-y: auto;
  white-space: pre-wrap;
}

.full-width {
  grid-column: 1 / -1;
}

.small-btn {
  &.primary { border-color: $purple; color: $purple; }
  &.danger { border-color: $red; color: $red; }
}
</style>
