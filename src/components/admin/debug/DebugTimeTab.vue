<script setup lang="ts">


import { ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { useMapStore } from '@/stores/map'
import { useModalStore } from '@/stores/modals'
import { getMechanicalWeather, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA } from '@/logic/battle/weatherMapper'
import { DEBUG_WEATHER_EFFECTS } from './debugConstants'

interface ViteDebugBridge {
  setMockTime: (date: string) => void;
  resetTime: () => void;
  addHours: (h: number) => void;
  addWeeks: (w: number) => void;
  setWeather: (w: string | null) => void;
  setCycle: (c: string | null) => void;
}

const game = useGameStore()
const mapStore = useMapStore()
const modalStore = useModalStore()

const debugDate = ref(Temporal.Now.instant().toString().slice(0, 16))

interface GameDB {
  getTimeOffset?: () => number
}

const getDB = () => game.db as unknown as GameDB
const timeOffsetLabel = ref(`${getDB()?.getTimeOffset?.() || 0}ms`)

const getDebugBridge = () => (window as unknown as { __VITE_DEBUG__: ViteDebugBridge }).__VITE_DEBUG__

function updateMockTime() {
  getDebugBridge().setMockTime(debugDate.value)
  timeOffsetLabel.value = `${getDB()?.getTimeOffset?.() || 0}ms`
  window.dispatchEvent(new CustomEvent('time-sync-update'))
}

function resetTime() {
  getDebugBridge().resetTime()
  timeOffsetLabel.value = '0ms'
  debugDate.value = Temporal.Now.instant().toString().slice(0, 16)
  window.dispatchEvent(new CustomEvent('time-sync-update'))
  mapStore.setGlobalCycle(null)
}

function addHours(h: number) {
  getDebugBridge().addHours(h)
  timeOffsetLabel.value = `${getDB()?.getTimeOffset?.() || 0}ms`
  window.dispatchEvent(new CustomEvent('time-sync-update'))
}

function addWeeks(w: number) {
  getDebugBridge().addWeeks(w)
  timeOffsetLabel.value = `${getDB()?.getTimeOffset?.() || 0}ms`
  window.dispatchEvent(new CustomEvent('time-sync-update'))
}

function toggleWeather(w: string | null) {
  const next = mapStore.globalWeather === w ? null : w;
  getDebugBridge().setWeather(next);
}

function toggleCycle(c: string | null) {
  const next = mapStore.forcedCycle === c ? null : c;
  getDebugBridge().setCycle(next);
}
</script>

<template>
  <div class="debug-grid">
    <div class="debug-card">
      <label>Simular Fecha/Hora</label>
      <div class="input-group vertical">
        <input
          v-model="debugDate"
          type="datetime-local"
          step="1"
        >
        <div class="button-row">
          <PVTooltip title="Aplica la fecha y hora seleccionada al motor del juego.">
            <button @click.stop="updateMockTime">
              APLICAR
            </button>
          </PVTooltip>
          <PVTooltip title="Restaura la hora real del sistema.">
            <button
              class="secondary"
              @click.stop="resetTime"
            >
              RESET
            </button>
          </PVTooltip>
        </div>
      </div>
    </div>

    <div class="debug-card">
      <label>Atajos Rápidos</label>
      <div class="button-row">
        <PVTooltip title="Añadir 1 hora al tiempo actual.">
          <button @click.stop="addHours(1)">
            +1h
          </button>
        </PVTooltip>
        <PVTooltip title="Añadir 6 horas al tiempo actual.">
          <button @click.stop="addHours(6)">
            +6h
          </button>
        </PVTooltip>
        <PVTooltip title="Añadir 24 horas al tiempo actual.">
          <button @click.stop="addHours(24)">
            +24h
          </button>
        </PVTooltip>
        <PVTooltip title="Añadir 1 semana (cambia la estación).">
          <button
            class="primary"
            @click.stop="addWeeks(1)"
          >
            +1 Sem
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-card">
      <label>Ciclo Atmosférico (Manual)</label>
      <div class="button-row">
        <PVTooltip title="Forzar amanecer.">
          <button
            :class="{ active: mapStore.forcedCycle === 'morning' }"
            @click.stop="toggleCycle('morning')"
          >
            🌅 AM
          </button>
        </PVTooltip>
        <PVTooltip title="Forzar día.">
          <button
            :class="{ active: mapStore.forcedCycle === 'day' }"
            @click.stop="toggleCycle('day')"
          >
            ☀️ DÍA
          </button>
        </PVTooltip>
        <PVTooltip title="Forzar atardecer.">
          <button
            :class="{ active: mapStore.forcedCycle === 'dusk' }"
            @click.stop="toggleCycle('dusk')"
          >
            🌇 AT
          </button>
        </PVTooltip>
        <PVTooltip title="Forzar noche.">
          <button
            :class="{ active: mapStore.forcedCycle === 'night' }"
            @click.stop="toggleCycle('night')"
          >
            🌙 NC
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-card">
      <div class="header-with-action">
        <label>Clima Global (Pruebas)</label>
        <PVTooltip title="Ver todas las tablas de probabilidad de clima por ruta/estación/ciclo.">
          <button 
            class="btn-vicio-neutral btn-vicio-sm"
            @click.stop="modalStore.open('DebugWeatherTables')"
          >
            📋 VER TABLAS
          </button>
        </PVTooltip>
      </div>
      <div class="button-row weather-grid">
        <PVTooltip
          v-for="w in DEBUG_WEATHER_EFFECTS"
          :key="w.id"
          :title="w.desc || WEATHER_VISUAL_METADATA[w.id]?.description || WEATHER_UI_METADATA[getMechanicalWeather(w.id)]?.description"
        >
          <button
            :class="{ active: mapStore.globalWeather === w.id }"
            @click.stop="toggleWeather(w.id)"
          >
            {{ w.label }}
          </button>
        </PVTooltip>
      </div>
    </div>

    <div class="debug-info-box">
      <span>Estado:</span>
      <strong>{{ mapStore.currentCycle?.toUpperCase() }} | CLIMA LOCAL: {{ mapStore.currentWeather?.toUpperCase() }}</strong>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/debug";

.weather-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.header-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  label { margin-bottom: 0; }
}

.btn-vicio-neutral.btn-vicio-sm {
  padding: 4px 10px;
  font-size: 8px;
  height: auto;
}
</style>
