<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { useDebugStore } from '@/stores/debug'

const ui = useUIStore()
const debugStore = useDebugStore()

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

    <!-- Simulación de Eventos y Probabilidades del Mapa -->
    <div class="debug-card">
      <label>PROBABILIDADES Y SIMULACIÓN DE EVENTOS</label>
      <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span
            class="field-label"
            style="margin-bottom: 0; font-size: 9px; color: #fff;"
          >Forzar 50% encuentros con entrenadores (Rutas)</span>
          <input 
            v-model="debugStore.trainerChance50" 
            type="checkbox" 
            style="width: 16px; height: 16px; cursor: pointer;"
          >
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span
            class="field-label"
            style="margin-bottom: 0; font-size: 9px; color: #fff;"
          >Forzar 100% encuentros con Rival</span>
          <input 
            v-model="debugStore.forceRival" 
            type="checkbox" 
            style="width: 16px; height: 16px; cursor: pointer;"
          >
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span
            class="field-label"
            style="margin-bottom: 0; font-size: 9px; color: #fff;"
          >Forzar 80% encuentros con Guardián</span>
          <input 
            v-model="debugStore.forceGuardian80" 
            type="checkbox" 
            style="width: 16px; height: 16px; cursor: pointer;"
          >
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span
            class="field-label"
            style="margin-bottom: 0; font-size: 9px; color: #fff;"
          >Forzar 100% encuentros Shiny</span>
          <input 
            v-model="debugStore.forceShiny100" 
            type="checkbox" 
            style="width: 16px; height: 16px; cursor: pointer;"
          >
        </div>
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

.field-label {
  font-family: inherit;
  font-weight: 500;
}
</style>
