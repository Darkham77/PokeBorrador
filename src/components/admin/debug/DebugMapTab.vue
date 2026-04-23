<script setup>
import { useUIStore } from '@/stores/ui'

const props = defineProps({
  securityCheck: { type: Function, required: true }
})

const ui = useUIStore()

function toggleGridDebug() {
  if (!props.securityCheck()) return
  ui.isDebugGridMode = !ui.isDebugGridMode
  ui.notify(`Visualización de grilla: ${ui.isDebugGridMode ? 'ACTIVADA' : 'DESACTIVADA'}`, '🗺️')
}

function togglePerformanceMode() {
  if (!props.securityCheck()) return
  ui.isDebugPerformanceMode = !ui.isDebugPerformanceMode
  ui.notify(`Modo simplificado: ${ui.isDebugPerformanceMode ? 'ACTIVADO' : 'DESACTIVADO'}`, '🚀')
}
</script>

<template>
  <div class="debug-grid">
    <div class="debug-card">
      <label>Visualización de Grilla (Rutas)</label>
      <div class="button-row">
        <button
          class="small-btn"
          :class="{ active: ui.isDebugGridMode }"
          @click="toggleGridDebug"
        >
          MOSTRAR BORDES (ROSA)
        </button>
      </div>
      <p class="debug-help">
        Muestra los límites de cada celda de la grilla NxN en las rutas del mapa.
      </p>
    </div>

    <div class="debug-card">
      <label>Rendimiento / Simplificación</label>
      <div class="button-row">
        <button
          class="small-btn"
          :class="{ active: ui.isDebugPerformanceMode }"
          @click="togglePerformanceMode"
        >
          SIMPLIFICAR MAPA (MODO PERF)
        </button>
      </div>
      <p class="debug-help">
        Fuerza el modo de alto rendimiento que simplifica el renderizado del mapa.
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/debug";

.debug-help {
  font-size: 8px;
  color: #64748b;
  margin-top: 8px;
  line-height: 1.4;
}
</style>
