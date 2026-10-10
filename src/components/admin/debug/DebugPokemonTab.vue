<script setup lang="ts">

import { useUIStore } from '@/stores/ui'
import DebugPokemonCreator from './DebugPokemonCreator.vue'

const ui = useUIStore()

interface ViteDebug extends Record<string, unknown> { // open-record: Generic key-value data dictionary container
  setPokedexMode: (mode: string) => void
  resetPokedexDB: () => void
  syncPokedex: () => void
  clearPvpTeam: () => void
  clearWarTeam: () => void
  forceStarterScreen: () => void
  walkEggs: () => void
  repairAllIllegal: () => void
}

const getDebug = () => window.__VITE_DEBUG__ as ViteDebug

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

async function walkEggs() {
  getDebug().walkEggs()
}

async function repairAllIllegal() {
  getDebug().repairAllIllegal?.()
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
            id="debug-pokemon-tab-btn-atrapar"
            class="btn-vicio-neutral btn-vicio-sm"
            :class="{ active: ui.debugPokedexMode === 'caught' }"
            @click.stop="setDebugPokedex('caught')"
          >
            ATRAPAR
          </button>
        </PVTooltip>
        <PVTooltip title="Simular que no has visto nada (Misterio)">
          <button
            id="debug-pokemon-tab-btn-nunca-visto"
            class="btn-vicio-neutral btn-vicio-sm"
            :class="{ active: ui.debugPokedexMode === 'none' }"
            @click.stop="setDebugPokedex('none')"
          >
            NUNCA VISTO
          </button>
        </PVTooltip>
        <PVTooltip title="Ver todos los vistos (silueta si no capturado)">
          <button
            id="debug-pokemon-tab-btn-vistos"
            class="btn-vicio-neutral btn-vicio-sm"
            :class="{ active: ui.debugPokedexMode === 'seen' }"
            @click.stop="setDebugPokedex('seen')"
          >
            VISTOS
          </button>
        </PVTooltip>
        <PVTooltip title="Restaurar progreso real">
          <button
            id="debug-pokemon-tab-btn-real"
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
          <PVTooltip title="Detecta y repara la legalidad de todos los Pokémon de la cuenta (equipo, caja y guardería)">
            <button
              id="debug-pokemon-tab-btn-reparar-ilegales"
              class="btn-vicio-primary btn-vicio-sm"
              @click.stop="repairAllIllegal"
            >
              <span class="emoji">⚠️</span> REPARAR ILEGALES
            </button>
          </PVTooltip>
          <PVTooltip title="Sincroniza la pokedex con lo que tienes en el equipo/caja">
            <button
              id="debug-pokemon-tab-btn-recalcular-pokedex"
              class="btn-vicio-secondary btn-vicio-sm"
              @click.stop="syncPokedexFromCollection"
            >
              RECALCULAR POKEDEX
            </button>
          </PVTooltip>
          <PVTooltip title="Borra todo el progreso de la pokedex">
            <button
              id="debug-pokemon-tab-btn-reset-pokedex"
              class="btn-vicio-danger btn-vicio-sm"
              @click.stop="resetPokedexDB"
            >
              RESET POKEDEX
            </button>
          </PVTooltip>
          <PVTooltip title="Alternar rellenado automático de equipo PVP">
            <button
              id="debug-pokemon-tab-btn-ui-pvpautofilldisabled-habilit"
              class="btn-vicio-secondary btn-vicio-sm"
              :class="{ active: !ui.pvpAutoFillDisabled }"
              @click.stop="ui.pvpAutoFillDisabled = !ui.pvpAutoFillDisabled"
            >
              {{ ui.pvpAutoFillDisabled ? 'HABILITAR AUTO-PVP' : 'DESHABILITAR AUTO-PVP' }}
            </button>
          </PVTooltip>
          <PVTooltip title="Limpia todos los slots del equipo PVP">
            <button
              id="debug-pokemon-tab-btn-limpiar-equipo-pvp"
              class="btn-vicio-danger btn-vicio-sm"
              @click.stop="clearPvpTeam"
            >
              LIMPIAR EQUIPO PVP
            </button>
          </PVTooltip>

          <PVTooltip title="Alternar rellenado automático de equipo de Guerra">
            <button
              id="debug-pokemon-tab-btn-ui-warautofilldisabled-habilit"
              class="btn-vicio-secondary btn-vicio-sm"
              :class="{ active: !ui.warAutoFillDisabled }"
              @click.stop="ui.warAutoFillDisabled = !ui.warAutoFillDisabled"
            >
              {{ ui.warAutoFillDisabled ? 'HABILITAR AUTO-GUERRA' : 'DESHABILITAR AUTO-GUERRA' }}
            </button>
          </PVTooltip>
          <PVTooltip title="Limpia todos los slots del equipo de Guerra">
            <button
              id="debug-pokemon-tab-btn-limpiar-equipo-guerra"
              class="btn-vicio-danger btn-vicio-sm"
              @click.stop="clearWarTeam"
            >
              LIMPIAR EQUIPO GUERRA
            </button>
          </PVTooltip>
        </div>
      </div>

      <!-- Starter Reset & Egg Walk -->
      <div class="debug-danger-zone no-border">
        <div class="button-row">
          <PVTooltip title="Fuerza la pantalla de elección de inicial para pruebas visuales">
            <button
              id="debug-pokemon-tab-btn-atrapar-inicial"
              class="btn-vicio-secondary btn-vicio-sm"
              @click.stop="forceStarterScreen"
            >
              ATRAPAR INICIAL
            </button>
          </PVTooltip>
          <PVTooltip title="Caminar todos los huevos en la mochila hasta que estén listos para abrir">
            <button
              id="debug-pokemon-tab-btn-caminar-huevos"
              class="btn-vicio-secondary btn-vicio-sm"
              @click.stop="walkEggs"
            >
              CAMINAR HUEVOS
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
  gap: $spacing-xl;
}

.debug-section-title {
  @include pixelated;
  @include pixelated;

  color: var(--yellow);
  font-size: var(--font-8);
  margin-bottom: 10px;
}

.debug-card {
  padding: 16px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: $radius-xl;
  background: Rgb(255 255 255 / 3%);
  
  &.full-width { width: 100%; }
  &.empty {
    @include pixelated;
    @include pixelated; 

    padding: 40px 20px;
    color: $muted;
    font-size: var(--font-8);
    text-align: center;
  }

  label {
    @include pixelated;
    @include pixelated;

    display: block;
    color: $muted;
    font-size: var(--font-8);
    margin-bottom: 12px;
  }
}

.debug-danger-zone {
  text-align: right;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed Rgb(124 58 237 / 30%);

  &.no-border { border-top: none; }
}

.danger-label {
  color: $red !important;
  opacity: 0.8;
  margin-top: 4px;
  margin-bottom: 8px !important;
}

// Global button overrides if specific spacing is needed
.button-row {
  display: flex;
  gap: $spacing-sm;
  
  &.wrap { flex-wrap: wrap; }
  
  button {
    min-width: 100px;
    flex: 1;
  }
}
</style>
