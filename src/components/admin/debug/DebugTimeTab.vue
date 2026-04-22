<script setup>
import { ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'

const props = defineProps({
  securityCheck: { type: Function, required: true }
})

const game = useGameStore()
const ui = useUIStore()
const mapStore = useMapStore()

const debugDate = ref(new Date().toISOString().slice(0, 16))
const timeOffsetLabel = ref(`${game.db.getTimeOffset()}ms`)

function updateMockTime() {
  if (!props.securityCheck()) return
  game.db.setMockTime(debugDate.value)
  timeOffsetLabel.value = `${game.db.getTimeOffset()}ms`
  ui.notify(`Tiempo fijado en: ${debugDate.value}`, '⏰')
  window.dispatchEvent(new CustomEvent('time-sync-update'))
}

function resetTime() {
  if (!props.securityCheck()) return
  game.db.resetTime()
  timeOffsetLabel.value = '0ms'
  debugDate.value = new Date().toISOString().slice(0, 16)
  ui.notify('Tiempo restablecido al real', '♻️')
  window.dispatchEvent(new CustomEvent('time-sync-update'))
  mapStore.setGlobalCycle(null)
}

function addHours(h) {
  if (!props.securityCheck()) return
  const current = game.db.getTimeOffset()
  game.db.setTimeOffset(current + (h * 3600 * 1000))
  timeOffsetLabel.value = `${game.db.getTimeOffset()}ms`
  ui.notify(`+${h} horas añadidas`, '⏩')
  window.dispatchEvent(new CustomEvent('time-sync-update'))
}

function toggleWeather(w) {
  if (!props.securityCheck()) return
  const next = mapStore.globalWeather === w ? 'clear' : w
  mapStore.setGlobalWeather(next)
  ui.notify(`Clima fijado: ${next.toUpperCase()}`, '🌥️')
}

function toggleCycle(c) {
  if (!props.securityCheck()) return
  const next = mapStore.forcedCycle === c ? null : c
  mapStore.setGlobalCycle(next)
  ui.notify(`Ciclo forzado: ${next ? next.toUpperCase() : 'REAL'}`, '⌛')
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
          <button @click="updateMockTime">
            APLICAR
          </button>
          <button
            class="secondary"
            @click="resetTime"
          >
            RESET
          </button>
        </div>
      </div>
    </div>

    <div class="debug-card">
      <label>Atajos Rápidos</label>
      <div class="button-row">
        <button @click="addHours(1)">
          +1h
        </button>
        <button @click="addHours(6)">
          +6h
        </button>
        <button @click="addHours(24)">
          +24h
        </button>
      </div>
    </div>

    <div class="debug-card">
      <label>Ciclo Atmosférico (Manual)</label>
      <div class="button-row">
        <button
          :class="{ active: mapStore.forcedCycle === 'morning' }"
          @click="toggleCycle('morning')"
        >
          🌅 AM
        </button>
        <button
          :class="{ active: mapStore.forcedCycle === 'day' }"
          @click="toggleCycle('day')"
        >
          ☀️ DÍA
        </button>
        <button
          :class="{ active: mapStore.forcedCycle === 'dusk' }"
          @click="toggleCycle('dusk')"
        >
          🌇 AT
        </button>
        <button
          :class="{ active: mapStore.forcedCycle === 'night' }"
          @click="toggleCycle('night')"
        >
          🌙 NC
        </button>
      </div>
    </div>

    <div class="debug-card">
      <label>Clima Global (Pruebas)</label>
      <div class="button-row weather-grid">
        <button
          :class="{ active: mapStore.globalWeather === 'clear' }"
          @click="toggleWeather('clear')"
        >
          ☀️ DESP
        </button>
        <button
          :class="{ active: mapStore.globalWeather === 'rain' }"
          @click="toggleWeather('rain')"
        >
          🌧️ LLUV
        </button>
        <button
          :class="{ active: mapStore.globalWeather === 'storm' }"
          @click="toggleWeather('storm')"
        >
          ⚡ TORM
        </button>
        <button
          :class="{ active: mapStore.globalWeather === 'fog' }"
          @click="toggleWeather('fog')"
        >
          🌫️ NIEB
        </button>
        <button
          :class="{ active: mapStore.globalWeather === 'snow' }"
          @click="toggleWeather('snow')"
        >
          🌨️ NIEV
        </button>
        <button
          :class="{ active: mapStore.globalWeather === 'blizzard' }"
          @click="toggleWeather('blizzard')"
        >
          ❄️ TOR-N
        </button>
        <button
          :class="{ active: mapStore.globalWeather === 'sandstorm' }"
          @click="toggleWeather('sandstorm')"
        >
          🏜️ AREN
        </button>
        <button
          :class="{ active: mapStore.globalWeather === 'heatwave' }"
          @click="toggleWeather('heatwave')"
        >
          🔥 CALO
        </button>
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
  flex-wrap: wrap !important;
  
  button {
    flex: 0 0 auto !important;
    width: fit-content !important;
    min-width: 70px;
  }
}

button.active {
  background: var(--yellow) !important;
  color: $black !important;
  border-color: $black !important;
}
</style>
