<script setup lang="ts">
import { ref } from 'vue'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import { useEventStore } from '@/stores/events'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useGTSStore } from '@/stores/gts'
import { usePvPStore } from '@/stores/pvp'
import { simulatePastEventAndMissionsReward, clearDebugSimulatedRewards } from '@/logic/debug/rewardsDebugSimulation'

const modalStore = useModalStore()
const uiStore = useUIStore()
const eventStore = useEventStore()
const gameStore = useGameStore()
const authStore = useAuthStore()
const gtsStore = useGTSStore()
const pvpStore = usePvPStore()

const modalCount = ref(5)
const isTesting = ref(false)
const isSimulatingRewards = ref(false)
const isClearingRewards = ref(false)
const lastSimulationSummary = ref('')

async function handleSimulateRewards() {
  if (isSimulatingRewards.value) return
  isSimulatingRewards.value = true
  try {
    const summary = await simulatePastEventAndMissionsReward(eventStore, gameStore, authStore, uiStore, modalStore, gtsStore, pvpStore)
    lastSimulationSummary.value = summary
  } finally {
    isSimulatingRewards.value = false
  }
}

async function handleClearRewards() {
  if (isClearingRewards.value) return
  isClearingRewards.value = true
  try {
    await clearDebugSimulatedRewards(eventStore, gameStore, uiStore, gtsStore, pvpStore)
    lastSimulationSummary.value = ''
  } finally {
    isClearingRewards.value = false
  }
}

async function startTest() {
  if (isTesting.value) return
  isTesting.value = true
  const bridge = Reflect.get(window, '__VITE_DEBUG__') as { testModalStack: (count: number) => Promise<void> } | undefined // domain-ok: Open dynamic text or non-domain string payload
  await bridge?.testModalStack(modalCount.value)
  isTesting.value = false
}

function triggerSampleError() {
  const bridge = Reflect.get(window, '__VITE_DEBUG__') as { triggerTestError: () => void } | undefined // domain-ok: Open dynamic text or non-domain string payload
  bridge?.triggerTestError()
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
      <label>TESTING RECOMPENSAS & BADGES</label>
      <div class="button-row">
        <PVTooltip title="Busca el último torneo o evento pasado, simula ganarlo (puesto aleatorio), inyecta misión y cobro GTS, y redirige a Inicio.">
          <button
            id="btn-debug-simulate-rewards"
            class="btn-vicio-primary btn-vicio-sm"
            :disabled="isSimulatingRewards"
            @click.stop="handleSimulateRewards"
          >
            <template v-if="isSimulatingRewards">
              SIMULANDO...
            </template>
            <template v-else>
              <span class="emoji">🎯</span> SIMULAR RECOMPENSAS COMPLETAS
            </template>
          </button>
        </PVTooltip>

        <PVTooltip title="Elimina las recompensas, misiones y cobros GTS generados por la simulación de pruebas.">
          <button
            id="btn-debug-clear-rewards"
            class="btn-vicio-danger btn-vicio-sm"
            :disabled="isClearingRewards"
            @click.stop="handleClearRewards"
          >
            <template v-if="isClearingRewards">
              LIMPIANDO...
            </template>
            <template v-else>
              <span class="emoji">🧹</span> LIMPIAR PREMIOS
            </template>
          </button>
        </PVTooltip>
      </div>
      <div
        v-if="lastSimulationSummary"
        class="simulation-summary-box"
      >
        {{ lastSimulationSummary }}
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
    outline: none;

    &:focus { border-color: var(--purple); }
  }
}



.hint {
  font-size: 8px;
  color: $muted;
  margin: 0;
  line-height: 1.4;
}

.simulation-summary-box {
  background: Rgba(34, 197, 94, 0.12);
  border: 1px solid Rgba(34, 197, 94, 0.3);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 8px;
  color: #86efac;
  line-height: 1.4;
  @include pixelated;
}
</style>
