<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import DebugPokemonCreator from './DebugPokemonCreator.vue'

const ui = useUIStore()

interface ViteDebug {
  setPokedexMode: (mode: string) => void
  resetPokedexDB: () => void
  syncPokedex: () => void
  clearPvpTeam: () => void
  clearWarTeam: () => void
  forceStarterScreen: () => void
}

const getDebug = () => (window as unknown as { __VITE_DEBUG__: ViteDebug }).__VITE_DEBUG__

// Direct store manipulation (avoids stale proxy closures from HMR)
async function setDebugPokedex(mode: string) {
  getDebug().setPokedexMode(mode)
}

async function resetPokedexDB() {
  getDebug().resetPokedexDB()
}

async function syncPokedexFromCollection() {
  getDebug().syncPokedex()
}

async function clearPvpTeam() {
  getDebug().clearPvpTeam()
}

async function clearWarTeam() {
  getDebug().clearWarTeam()
}

async function forceStarterScreen() {
  getDebug().forceStarterScreen()
}
</script>

<template>
  <div class="debug-tab-content">
    <h3 class="debug-section-title">
      POKEMON DEBUG
    </h3>

    <!-- Pokedex Tools -->
    <div class="debug-card full-width">
      <label>Override Visual Pokedex (No se guarda)</label>
      <div class="button-row wrap">
        <PVTooltip title="Atrapar todos">
          <button
            class="btn-vicio-neutral btn-vicio-sm"
            :class="{ active: ui.debugPokedexMode === 'caught' }"
            @click.stop="setDebugPokedex('caught')"
          >
            ATRAPAR
          </button>
        </PVTooltip>
        <PVTooltip title="Simular que no has visto nada (Misterio)">
          <button
            class="btn-vicio-neutral btn-vicio-sm"
            :class="{ active: ui.debugPokedexMode === 'none' }"
            @click.stop="setDebugPokedex('none')"
          >
            NUNCA VISTO
          </button>
        </PVTooltip>
        <PVTooltip title="Ver todos los vistos (silueta si no capturado)">
          <button
            class="btn-vicio-neutral btn-vicio-sm"
            :class="{ active: ui.debugPokedexMode === 'seen' }"
            @click.stop="setDebugPokedex('seen')"
          >
            VISTOS
          </button>
        </PVTooltip>
        <PVTooltip title="Restaurar progreso real">
          <button
            class="btn-vicio-primary btn-vicio-sm"
            :class="{ active: ui.debugPokedexMode === null }"
            @click.stop="setDebugPokedex('real')"
          >
            REAL
          </button>
        </PVTooltip>
      </div>
      
      <div class="debug-danger-zone">
        <label class="danger-label">Persistent Database Changes (SE GUARDA)</label>
        <div class="button-row wrap">
          <PVTooltip title="Sincroniza la pokedex con lo que tienes en el equipo/caja">
            <button
              class="btn-vicio-secondary btn-vicio-sm"
              @click.stop="syncPokedexFromCollection"
            >
              RECALCULAR POKEDEX
            </button>
          </PVTooltip>
          <PVTooltip title="Borra todo el progreso de la pokedex">
            <button
              class="btn-vicio-danger btn-vicio-sm"
              @click.stop="resetPokedexDB"
            >
              RESET POKEDEX
            </button>
          </PVTooltip>
          <PVTooltip title="Alternar rellenado automático de equipo PVP">
            <button
              class="btn-vicio-secondary btn-vicio-sm"
              :class="{ active: !ui.pvpAutoFillDisabled }"
              @click.stop="ui.pvpAutoFillDisabled = !ui.pvpAutoFillDisabled"
            >
              {{ ui.pvpAutoFillDisabled ? 'HABILITAR AUTO-PVP' : 'DESHABILITAR AUTO-PVP' }}
            </button>
          </PVTooltip>
          <PVTooltip title="Limpia todos los slots del equipo PVP">
            <button
              class="btn-vicio-danger btn-vicio-sm"
              @click.stop="clearPvpTeam"
            >
              LIMPIAR EQUIPO PVP
            </button>
          </PVTooltip>
          
          <PVTooltip title="Alternar rellenado automático de equipo de Guerra">
            <button
              class="btn-vicio-secondary btn-vicio-sm"
              :class="{ active: !ui.warAutoFillDisabled }"
              @click.stop="ui.warAutoFillDisabled = !ui.warAutoFillDisabled"
            >
              {{ ui.warAutoFillDisabled ? 'HABILITAR AUTO-GUERRA' : 'DESHABILITAR AUTO-GUERRA' }}
            </button>
          </PVTooltip>
          <PVTooltip title="Limpia todos los slots del equipo de Guerra">
            <button
              class="btn-vicio-danger btn-vicio-sm"
              @click.stop="clearWarTeam"
            >
              LIMPIAR EQUIPO GUERRA
            </button>
          </PVTooltip>
        </div>
      </div>

      <!-- Starter Reset -->
      <div class="debug-danger-zone no-border">
        <div class="button-row">
          <PVTooltip title="Fuerza la pantalla de elección de inicial para pruebas visuales">
            <button
              class="btn-vicio-secondary btn-vicio-sm"
              @click.stop="forceStarterScreen"
            >
              ATRAPAR INICIAL
            </button>
          </PVTooltip>
        </div>
      </div>
    </div>

    <!-- Pokemon Creator -->
    <div class="debug-card full-width">
      <DebugPokemonCreator />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.debug-tab-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.debug-section-title {
  @include pixelated;
  font-size: 8px;
  color: var(--yellow);
  margin-bottom: 10px;
  @include pixelated;
}

.debug-card {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  
  &.full-width { width: 100%; }
  &.empty { 
    padding: 40px 20px;
    text-align: center;
    color: $muted;
    font-size: 8px;
    @include pixelated;
    @include pixelated;
  }

  label {
    display: block;
    @include pixelated;
    font-size: 8px;
    color: $muted;
    margin-bottom: 12px;
    @include pixelated;
  }
}

.button-row {
  display: flex;
  gap: 8px;
  
  &.wrap { flex-wrap: wrap; }
}

.debug-danger-zone {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed Rgba(124, 58, 237, 0.3);
  text-align: right;

  &.no-border { border-top: none; }
}

.danger-label {
  color: $red !important;
  margin-top: 4px;
  margin-bottom: 8px !important;
  opacity: 0.8;
}

// Global button overrides if specific spacing is needed
.button-row {
  display: flex;
  gap: 8px;
  
  &.wrap { flex-wrap: wrap; }
  
  button {
    flex: 1;
    min-width: 100px;
  }
}
</style>
