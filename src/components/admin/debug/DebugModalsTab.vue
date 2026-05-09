<script setup lang="ts">
import { ref } from 'vue'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'

const modalStore = useModalStore()
const uiStore = useUIStore()
const modalCount = ref(5)
const isTesting = ref(false)

async function startTest() {
  if (isTesting.value) return
  isTesting.value = true
  const win = window as unknown as { __VITE_DEBUG__: { testModalStack: (count: number) => Promise<void> } }
  await win.__VITE_DEBUG__.testModalStack(modalCount.value)
  isTesting.value = false
}

function triggerSampleError() {
  const win = window as unknown as { __VITE_DEBUG__: { triggerTestError: () => void } }
  win.__VITE_DEBUG__.triggerTestError()
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
            class="btn-vicio-primary btn-vicio-sm" 
            :disabled="isTesting"
            @click.stop="startTest"
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
            class="btn-vicio-danger btn-vicio-sm"
            @click.stop="modalStore.closeAll"
          >
            CERRAR TODO
          </button>
        </PVTooltip>

        <PVTooltip title="Dispara una notificación de error global para probar el sistema de logs.">
          <button
            class="btn-vicio-danger btn-vicio-sm"
            @click.stop="triggerSampleError"
          >
            DISPARAR ERROR
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-group">
      <label>RENDIMIENTO GLOBALES</label>
      <div class="button-column">
        <PVTooltip title="Simula el renderizado ligero en el MAPA (oculta spawns y climas).">
          <button
            :class="uiStore.isDebugPerformanceMode ? 'btn-vicio-danger btn-vicio-sm' : 'btn-vicio-primary btn-vicio-sm'"
            @click.stop="uiStore.isDebugPerformanceMode = !uiStore.isDebugPerformanceMode"
          >
            {{ uiStore.isDebugPerformanceMode ? 'DESACTIVAR PERF. MAPA' : 'ACTIVAR PERF. MAPA' }}
          </button>
        </PVTooltip>

        <PVTooltip title="Fuerza el modo simplificado en TODOS los MODALS (esconde FX de Pokémon, brillos y auras).">
          <button
            :class="uiStore.isSimplifiedModalsMode ? 'btn-vicio-danger btn-vicio-sm' : 'btn-vicio-primary btn-vicio-sm'"
            @click.stop="uiStore.isSimplifiedModalsMode = !uiStore.isSimplifiedModalsMode"
          >
            {{ uiStore.isSimplifiedModalsMode ? 'DESACTIVAR PERF. MODALS' : 'ACTIVAR PERF. MODALS' }}
          </button>
        </PVTooltip>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
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
    @include pixelated;
    font-size: 8px;
    color: $muted;
    @include pixelated;
  }
}

.button-row, .button-column {
  display: flex;
  gap: 10px;
}

.button-column {
  flex-direction: column;
}

.input-row {
  display: flex;
  gap: 10px;

  input {
    flex: 1;
    background: Rgba(0, 0, 0, 0.3);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: $white;
    padding: 12px 15px;
    height: 40px;
    @include pixelated;
    font-size: 8px;
    @include pixelated;
    outline: none;
    line-height: 1;

    &:focus { border-color: var(--purple); }
  }
}



.hint {
  font-size: 8px;
  color: $muted;
  margin: 0;
  line-height: 1.4;
}
</style>
