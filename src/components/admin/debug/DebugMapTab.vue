<script setup>
import { useUIStore } from '@/stores/ui'
import { useDebugStore } from '@/stores/debug'
import PVTooltip from '@/components/common/PVTooltip.vue'

const ui = useUIStore()
const _debug = useDebugStore()

// These tools are already registered in debugStore init()
// But we can retrieve them to use in the template or just call them directly
const toggleGrid = () => window.__VITE_DEBUG__.toggleGrid()
const togglePerf = () => window.__VITE_DEBUG__.togglePerf()
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
            @click="toggleGrid"
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
            @click="togglePerf"
          >
            SIMPLIFICAR MAPA (MODO PERF)
          </button>
        </PVTooltip>
      </div>
    </div>
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
</style>
