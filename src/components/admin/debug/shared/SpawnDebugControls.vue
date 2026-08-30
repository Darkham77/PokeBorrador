<script setup lang="ts">
/**
 * src/components/admin/debug/shared/SpawnDebugControls.vue
 * 
 * Shared UI and logic for configuring all spawn conditions, event rates,
 * and minigames probabilities (Fishing, Mining/Archaeology, Shinies, Trainers, Rivals, Guardians).
 * Used identically by both Admin Panel (Map Tab) and Battle Debug HUD.
 */

import { computed } from 'vue'
import { useDebugStore } from '@/stores/debug'
import PVTooltip from '@/components/common/PVTooltip.vue'
import DebugNumericControlRow, { type DebugPresetOption } from './DebugNumericControlRow.vue'

const debugStore = useDebugStore()

const DEFAULT_SHINY_RATE = 3000
const PRESET_SHINY_ALWAYS_RATE = 1

const SHINY_PRESETS: readonly DebugPresetOption[] = [
  { label: '✨ 100% (1/1)', value: 1, tooltip: '100% probabilidad Shiny garantizada' },
  { label: '1% (1/100)', value: 100, tooltip: '1% probabilidad Shiny (1 en 100)' },
  { label: 'Masuda (1/512)', value: 512, tooltip: 'Ratio Método Masuda (1 en 512)' }
]

const PERCENT_STANDARD_PRESETS: readonly DebugPresetOption[] = [
  { label: '0%', value: 0 },
  { label: '50%', value: 50 },
  { label: '100%', value: 100 }
]

const RIVAL_PRESETS: readonly DebugPresetOption[] = [
  { label: '0%', value: 0 },
  { label: '10%', value: 10 },
  { label: '50%', value: 50 },
  { label: '100%', value: 100 }
]

const GUARDIAN_PRESETS: readonly DebugPresetOption[] = [
  { label: '0%', value: 0 },
  { label: '50%', value: 50 },
  { label: '80%', value: 80 },
  { label: '100%', value: 100 }
]

const DEFENDER_PRESETS: readonly DebugPresetOption[] = [
  { label: '0%', value: 0 },
  { label: '20%', value: 20 },
  { label: '50%', value: 50 },
  { label: '100%', value: 100 }
]

const isAnyOverrideActive = computed(() => {
  return debugStore.shinyRateOverride !== null ||
    debugStore.trainerChancePct !== null ||
    debugStore.rivalChancePct !== null ||
    debugStore.guardianChancePct !== null ||
    debugStore.defenderChancePct !== null ||
    debugStore.fishingChancePct !== null ||
    debugStore.archaeologyChancePct !== null ||
    debugStore.trainerChance50 ||
    debugStore.forceRival ||
    debugStore.forceGuardian80 ||
    debugStore.forceShiny100
})

const activeOverridesSummary = computed(() => {
  const active: string[] = [] // no-domain
  if (debugStore.shinyRateOverride !== null || debugStore.forceShiny100) {
    const rate = debugStore.shinyRateOverride ?? (debugStore.forceShiny100 ? PRESET_SHINY_ALWAYS_RATE : DEFAULT_SHINY_RATE)
    active.push(rate === PRESET_SHINY_ALWAYS_RATE ? 'Shiny: 100%' : `Shiny: 1/${rate}`)
  }
  if (debugStore.trainerChancePct !== null || debugStore.trainerChance50) {
    active.push(`Entrenadores: ${debugStore.trainerChancePct ?? 50}%`)
  }
  if (debugStore.rivalChancePct !== null || debugStore.forceRival) {
    active.push(`Rival: ${debugStore.rivalChancePct ?? 100}%`)
  }
  if (debugStore.guardianChancePct !== null || debugStore.forceGuardian80) {
    active.push(`Guardián: ${debugStore.guardianChancePct ?? 80}%`)
  }
  if (debugStore.defenderChancePct !== null) {
    active.push(`Defensor: ${debugStore.defenderChancePct}%`)
  }
  if (debugStore.fishingChancePct !== null) {
    active.push(`Pesca: ${debugStore.fishingChancePct}%`)
  }
  if (debugStore.archaeologyChancePct !== null) {
    active.push(`Minería: ${debugStore.archaeologyChancePct}%`)
  }
  return active.join(' | ')
})
</script>

<template>
  <div class="spawn-debug-controls">
    <!-- PROBABILIDADES DE SPAWNS Y MINIJUEGOS (MODULARES) -->
    <div class="debug-card">
      <div class="card-header">
        <label>PROBABILIDADES DE SPAWNS Y MINIJUEGOS</label>
        <PVTooltip title="Configura las probabilidades numéricas de cada evento del mapa y minijuego de captura.">
          <span class="info-badge">ℹ️</span>
        </PVTooltip>
      </div>

      <div class="rates-list">
        <!-- Ratio Shiny -->
        <DebugNumericControlRow
          id="debug-spawn-shiny"
          v-model="debugStore.shinyRateOverride"
          label="Probabilidad Shiny"
          icon="✨"
          tooltip="Modifica el ratio de aparición de Pokémon Shiny (Defecto oficial: 1 en 3000 o ~0.033%)."
          default-label="Defecto: 1 en 3000"
          prefix="1 en"
          :min="1"
          :max="10000"
          placeholder="3000"
          :presets="SHINY_PRESETS"
        />

        <!-- Entrenadores en Rutas -->
        <DebugNumericControlRow
          id="debug-spawn-trainer"
          v-model="debugStore.trainerChancePct"
          label="Entrenadores en Rutas"
          icon="👥"
          tooltip="Probabilidad porcentual de encuentro contra entrenadores comunes en rutas (Defecto: Dinámico entre 5% y 20%)."
          default-label="Defecto: 5-20%"
          suffix="%"
          placeholder="Dinámico"
          :presets="PERCENT_STANDARD_PRESETS"
        />

        <!-- Rival Azul -->
        <DebugNumericControlRow
          id="debug-spawn-rival"
          v-model="debugStore.rivalChancePct"
          label="Rival Azul"
          icon="⚔️"
          tooltip="Probabilidad de encuentro especial con el Rival Azul al caminar por cualquier mapa (Defecto oficial: 0.1%)."
          default-label="Defecto: 0.1%"
          suffix="%"
          :step="0.1"
          placeholder="0.1"
          :presets="RIVAL_PRESETS"
        />

        <!-- Guardián Alfa -->
        <DebugNumericControlRow
          id="debug-spawn-guardian"
          v-model="debugStore.guardianChancePct"
          label="Guardián Alfa"
          icon="👑"
          tooltip="Probabilidad de encontrar al Pokémon Guardián Alfa de la ruta si aún no ha sido capturado hoy (Defecto oficial: 5%)."
          default-label="Defecto: 5%"
          suffix="%"
          placeholder="5"
          :presets="GUARDIAN_PRESETS"
        />

        <!-- Defensor de Facción -->
        <DebugNumericControlRow
          id="debug-spawn-defender"
          v-model="debugStore.defenderChancePct"
          label="Defensor de Facción"
          icon="🚩"
          tooltip="Probabilidad de enfrentarse a defensores de la facción rival durante el fin de semana de guerra (Defecto oficial: 20%)."
          default-label="Defecto: 20%"
          suffix="%"
          placeholder="20"
          :presets="DEFENDER_PRESETS"
        />

        <!-- Minijuego de Pesca -->
        <DebugNumericControlRow
          id="debug-spawn-fishing"
          v-model="debugStore.fishingChancePct"
          label="Minijuego de Pesca (Agua)"
          icon="🎣"
          tooltip="Probabilidad base de activar el minijuego de pesca en mapas con agua al explorar (Defecto oficial: 10%)."
          default-label="Defecto: 10%"
          suffix="%"
          placeholder="10"
          :presets="PERCENT_STANDARD_PRESETS"
        />

        <!-- Minijuego de Minería / Arqueología -->
        <DebugNumericControlRow
          id="debug-spawn-archaeology"
          v-model="debugStore.archaeologyChancePct"
          label="Minería / Arqueología (Cuevas)"
          icon="⛏️"
          tooltip="Probabilidad base de activar el minijuego de excavación de fósiles y gemas en cuevas y montañas (Defecto: Cueva 10%, Montaña 5%)."
          default-label="Defecto: 10%"
          suffix="%"
          placeholder="10"
          :presets="PERCENT_STANDARD_PRESETS"
        />
      </div>
    </div>

    <!-- BOTÓN DE RESTAURACIÓN GLOBAL Y RESUMEN -->
    <div class="actions-card">
      <button
        id="debug-spawn-reset-all-btn"
        class="full-btn reset-all-btn"
        @click.stop="debugStore.resetSpawnDefaults()"
      >
        <span class="btn-emoji">🔄</span> RESTAURAR TODOS LOS VALORES POR DEFECTO
      </button>

      <div class="debug-info-box">
        <span>Estado:</span>
        <strong
          v-if="isAnyOverrideActive"
          class="active-summary"
        >
          {{ activeOverridesSummary }}
        </strong>
        <strong
          v-else
          class="clean-summary"
        >
          VALORES POR DEFECTO (ORIGINAL)
        </strong>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/debug";
@use "@/styles/core/tools" as *;

.spawn-debug-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  label { margin-bottom: 0; }
  .info-badge { font-size: 8px; opacity: 0.7; cursor: help; }
}

.rates-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reset-all-btn {
  background: Rgba(34, 197, 94, 0.1);
  border: 1px dashed var(--green);
  color: var(--green);
  margin-top: 4px;

  &:hover {
    background: Rgba(34, 197, 94, 0.2);
    border-style: solid;
    color: white;
  }
}

.active-summary {
  color: var(--green) !important;
  font-size: 7px !important;
}

.clean-summary {
  color: Rgba(148, 163, 184, 0.8) !important;
  font-size: 7px !important;
}
</style>
