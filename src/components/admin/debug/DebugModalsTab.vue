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
          id="debug-modals-tab-input-modalcount" 
          v-model.number="modalCount" 
          type="number" 
          min="1" 
          max="20"
        >
        <PVTooltip :title="`Se abrirán ${modalCount} ventanas con 1s de desfase.`">
          <button
            id="debug-modals-tab-btn-istesting-procesando-iniciar-t" 
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
            id="debug-modals-tab-btn-cerrar-todo"
            class="btn-vicio-danger btn-vicio-sm"
            @click.stop="modalStore.closeAll"
          >
            CERRAR TODO
          </button>
        </PVTooltip>

        <PVTooltip title="Dispara una notificación de error global para probar el sistema de logs.">
          <button
            id="debug-modals-tab-btn-disparar-error"
            class="btn-vicio-danger btn-vicio-sm"
            @click.stop="triggerSampleError"
          >
            DISPARAR ERROR
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-group">
      <label>TESTING RECOMPENSAS &amp; BADGES</label>
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
        <PVTooltip title="Simula el renderizado ligero en el MAPA (suspende spawns y climas).">
          <button
            :class="uiStore.isDebugFastMode ? 'btn-vicio-danger btn-vicio-sm' : 'btn-vicio-primary btn-vicio-sm'"
            @click.stop="uiStore.isDebugFastMode = !uiStore.isDebugFastMode"
          >
            {{ uiStore.isDebugFastMode ? 'DESACTIVAR MODO RÁPIDO' : 'ACTIVAR MODO RÁPIDO' }}
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
  gap: $spacing-xl;
}

.debug-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  label {
    @include pixelated;

    color: $muted;
    font-size: var(--font-8);
  }
}

%button-group-base {
  display: flex;
  gap: $spacing-md-alt;
}

.button-row {
  @extend %button-group-base;
}

.button-column {
  @extend %button-group-base;

  flex-direction: column;
}

.input-row {
  display: flex;
  gap: $spacing-md-alt;

  input {
    @include pixelated;

    height: 40px;
    padding: 12px 15px;
    border: 1px solid Rgb(255 255 255 / 10%);
    border-radius: $radius-lg;
    background: Rgb(0 0 0 / 30%);
    color: $white;
    font-size: var(--font-8);
    flex: 1;
    outline: none;

    &:focus { border-color: var(--purple); }
  }
}



.hint {
  margin: 0;
  color: $muted;
  font-size: var(--font-8);
  line-height: 1.4;
}

.simulation-summary-box {
  @include pixelated;

  padding: 8px 10px;
  border: 1px solid Rgb(34 197 94 / 30%);
  border-radius: $radius-md;
  background: Rgb(34 197 94 / 12%);
  color: var(--green-light);
  font-size: var(--font-8);
  line-height: 1.4;
}
</style>
