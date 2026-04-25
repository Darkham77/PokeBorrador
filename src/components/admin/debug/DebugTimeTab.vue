<script setup>
import { ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { useMapStore } from '@/stores/map'
import PVTooltip from '@/components/common/PVTooltip.vue'

const game = useGameStore()
const mapStore = useMapStore()

const debugDate = ref(new Date().toISOString().slice(0, 16))
const timeOffsetLabel = ref(`${game.db.getTimeOffset()}ms`)

function updateMockTime() {
  window.__VITE_DEBUG__.setMockTime(debugDate.value)
  timeOffsetLabel.value = `${game.db.getTimeOffset()}ms`
  window.dispatchEvent(new CustomEvent('time-sync-update'))
}

function resetTime() {
  window.__VITE_DEBUG__.resetTime()
  timeOffsetLabel.value = '0ms'
  debugDate.value = new Date().toISOString().slice(0, 16)
  window.dispatchEvent(new CustomEvent('time-sync-update'))
  mapStore.setGlobalCycle(null)
}

function addHours(h) {
  window.__VITE_DEBUG__.addHours(h)
  timeOffsetLabel.value = `${game.db.getTimeOffset()}ms`
}

function toggleWeather(w) {
  const next = mapStore.globalWeather === w ? 'clear' : w
  window.__VITE_DEBUG__.setWeather(next)
}

function toggleCycle(c) {
  const next = mapStore.forcedCycle === c ? null : c
  window.__VITE_DEBUG__.setCycle(next)
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
      <label>Clima Global (Pruebas)</label>
      <div class="button-row weather-grid">
        <PVTooltip
          v-for="w in [
            { id: 'clear', label: '☀️ DESP', desc: 'Cielo despejado.' },
            { id: 'rain', label: '🌧️ LLUV', desc: 'Lluvia constante.' },
            { id: 'storm', label: '⚡ TORM', desc: 'Tormenta eléctrica.' },
            { id: 'fog', label: '🌫️ NIEB', desc: 'Niebla espesa.' },
            { id: 'snow', label: '🌨️ NIEV', desc: 'Nieve suave.' },
            { id: 'blizzard', label: '❄️ TOR-N', desc: 'Tormenta de nieve.' },
            { id: 'sandstorm', label: '🏜️ AREN', desc: 'Tormenta de arena.' },
            { id: 'heatwave', label: '🔥 CALO', desc: 'Ola de calor.' }
          ]"
          :key="w.id"
          :title="w.desc"
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
      <strong>{{ mapStore.currentCycle.toUpperCase() }} | {{ mapStore.globalWeather.toUpperCase() }}</strong>
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
</style>
