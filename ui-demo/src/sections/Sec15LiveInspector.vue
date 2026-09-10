<script setup lang="ts">
import { computed } from 'vue'
import { useLiveInspector } from '../logic/useLiveInspector.ts'

const { logs, serializedData, clear, log } = useLiveInspector()

const formattedJson = computed(() => {
  return JSON.stringify(serializedData.value, null, 2)
})

function handleClear() {
  clear()
  log('Consola limpiada por el usuario.')
}

function handleReset() {
  clear()
  log('Formulario y datos restablecidos.')
}
</script>

<template>
  <section class="pv-section">
    <h2 class="section-title">
      <span class="emoji">💻</span>
      <span>15. Consola de Estado e Inspector en Vivo (Terminal Retro)</span>
    </h2>

    <div class="pv-panel-wrap has-cast-shadow">
      <div class="pv-frame-panel pv-live-inspector-panel">
        <div class="inspector-header">
          <div class="inspector-title">
            <span class="pulse-dot" />
            <span>CONSOLA DE EVENTOS E INSPECTOR EN TIEMPO REAL</span>
          </div>
          <div class="inspector-actions">
            <button
              id="btn-clear-inspector"
              type="button"
              class="pv-curve-xs pv-btn pv-btn-secondary"
              style="font-size: 7px; padding: 4px 8px;"
              @click="handleClear"
            >
              <span>LIMPIAR CONSOLA</span>
            </button>
            <button
              id="btn-reset-inspector"
              type="button"
              class="pv-curve-xs pv-btn pv-btn-danger"
              style="font-size: 7px; padding: 4px 8px;"
              @click="handleReset"
            >
              <span>RESET DATOS</span>
            </button>
          </div>
        </div>

        <div class="inspector-grid">
          <!-- Columna 1: Logs de eventos en vivo -->
          <div class="log-box-column">
            <span class="column-label">ÚLTIMOS EVENTOS DETECTADOS:</span>
            <div
              id="live-inspector-logs"
              class="log-box-content pv-frame-control"
            >
              <div
                v-for="entry in logs"
                :key="entry.id"
                class="log-entry"
              >
                <span class="log-time">[{{ entry.time }}]</span>
                <span class="log-msg">{{ entry.message }}</span>
              </div>
              <div
                v-if="logs.length === 0"
                style="color: #64748b;"
              >
                // Consola vacía. Interactúa con los controles para ver eventos...
              </div>
            </div>
          </div>

          <!-- Columna 2: JSON Serializado -->
          <div class="log-box-column">
            <span class="column-label">VALORES SERIALIZADOS DEL FORMULARIO:</span>
            <pre
              id="live-inspector-json"
              class="json-pre-content pv-frame-control"
            >{{ formattedJson }}</pre>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.pv-section {
  width: 100%;
}
</style>
