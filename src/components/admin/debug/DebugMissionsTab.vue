<script setup lang="ts">
import { useGameStore } from '@/stores/game'
import { useDebugStore } from '@/stores/debug'
import { logger } from '@/logic/utils/logger'

interface ViteDebugBridge {
  regenerateMissions?: () => void;
  clearMissions?: () => void;
}

const game = useGameStore()
const debug = useDebugStore()

const getDebugBridge = () => window.__VITE_DEBUG__ as ViteDebugBridge // domain-ok

const regenerate = () => {
  const bridge = getDebugBridge()
  if (bridge?.regenerateMissions) {
    bridge.regenerateMissions()
  } else {
    logger.warn('Debug', 'Fallback: regenerateMissions from store directly')
    const tool = debug.tools.find(t => t.command === 'regenerateMissions')
    if (tool) tool.action()
  }
}

const clear = () => {
  if (!confirm('¿Seguro que quieres borrar todas las misiones actuales?')) return

  const bridge = getDebugBridge()
  if (bridge?.clearMissions) {
    bridge.clearMissions()
  } else {
    logger.warn('Debug', 'Fallback: clearMissions from store directly')
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
