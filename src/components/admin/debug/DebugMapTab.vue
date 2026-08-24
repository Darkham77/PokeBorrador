<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import SpawnDebugControls from './shared/SpawnDebugControls.vue'

const ui = useUIStore()

interface ViteDebug extends Record<string, unknown> { // open-record
  toggleGrid: () => void
  togglePerf: () => void
}

const getDebug = () => window.__VITE_DEBUG__ as ViteDebug

const toggleGrid = () => getDebug().toggleGrid()
const togglePerf = () => getDebug().togglePerf()
</script>

<template>
  <div class="debug-grid">
    <div class="debug-card">
      <label>Visualización de Grilla (Rutas)</label>
      <div class="button-row">
        <PVTooltip title="Muestra los límites de cada celda de la grilla NxN en las rutas del mapa.">
          <button
            class="small-btn"
            :class="{ active: ui.isDebugGridMode }"
            @click.stop="toggleGrid"
          >
            MOSTRAR BORDES (ROSA)
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-card">
      <label>Rendimiento / Simplificación</label>
      <div class="button-row">
        <PVTooltip title="Fuerza el modo de alto rendimiento que simplifica el renderizado del mapa.">
          <button
            class="small-btn"
            :class="{ active: ui.isDebugPerformanceMode }"
            @click.stop="togglePerf"
          >
            SIMPLIFICAR MAPA (MODO PERF)
          </button>
        </PVTooltip>
      </div>
    </div>

    <!-- Simulación de Eventos, Probabilidades del Mapa y Minijuegos -->
    <SpawnDebugControls />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/debug";

.debug-help {
  font-size: 8px;
  color: $muted;
  margin-top: 8px;
  line-height: 1.4;
}

.field-label {
  font-family: inherit;
  font-weight: 500;
}
</style>
