<script setup>
import { ref } from 'vue'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import PVTooltip from '@/components/common/PVTooltip.vue'

const modalStore = useModalStore()
const uiStore = useUIStore()
const modalCount = ref(5)
const isTesting = ref(false)

async function startTest() {
  if (isTesting.value) return
  isTesting.value = true
  await window.__VITE_DEBUG__.testModalStack(modalCount.value)
  isTesting.value = false
}


function triggerSampleError() {
  window.__VITE_DEBUG__.triggerTestError()
}
</script>

<template>
  <div class="debug-tab">
    <div class="debug-group">
      <label>CANTIDAD DE MODALS</label>
      <div class="input-row">
        <input 
          v-model.number="modalCount" 
          type="number" 
          min="1" 
          max="20"
        >
        <PVTooltip :title="`Se abrirán ${modalCount} ventanas con 1s de desfase.`">
          <button 
            class="btn-vicio-primary" 
            :disabled="isTesting"
            @click="startTest"
          >
            {{ isTesting ? 'PROCESANDO...' : 'INICIAR TEST' }}
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-group">
      <label>ACCIONES RÁPIDAS</label>
      <div class="button-row">
        <PVTooltip title="Cierra todas las ventanas modales abiertas actualmente.">
          <button
            class="btn-vicio-danger"
            @click="modalStore.closeAll"
          >
            CERRAR TODO
          </button>
        </PVTooltip>

        <PVTooltip title="Dispara una notificación de error global para probar el sistema de logs.">
          <button
            class="btn-vicio-danger"
            @click="triggerSampleError"
          >
            DISPARAR ERROR
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-group">
      <label>RENDIMIENTO MAPA</label>
      <PVTooltip title="Simula el renderizado ligero (oculta spawns y climas) sin tener que abrir modales.">
        <button
          :class="uiStore.isDebugPerformanceMode ? 'btn-vicio-danger' : 'btn-vicio-primary'"
          @click="uiStore.isDebugPerformanceMode = !uiStore.isDebugPerformanceMode"
        >
          {{ uiStore.isDebugPerformanceMode ? 'DESACTIVAR MODO RENDIMIENTO' : 'ACTIVAR MODO RENDIMIENTO' }}
        </button>
      </PVTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.debug-tab {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.debug-group {
  display: flex;
  flex-direction: column;
  gap: 12px;

  label {
    font-family: 'Press Start 2P', cursive;
    font-size: 8px;
    color: $muted;
    @include pixelated;
  }
}

.input-row {
  display: flex;
  gap: 10px;

  input {
    flex: 1;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: $white;
    padding: 12px 15px;
    height: 40px;
    font-family: 'Press Start 2P', cursive;
    font-size: 8px;
    @include pixelated;
    outline: none;
    line-height: 1;

    &:focus { border-color: var(--purple); }
  }
}

.btn-vicio-primary {
  @include btn-vicio-primary;
  padding: 10px 20px;
  font-size: 8px;
}

.btn-vicio-danger {
  @include btn-vicio-danger;
  padding: 10px;
  font-size: 8px;
}

.hint {
  font-size: 8px;
  color: $muted;
  margin: 0;
  line-height: 1.4;
}
</style>
