<script setup>
import { ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'

const props = defineProps({
  securityCheck: { type: Function, required: true }
})

const game = useGameStore()
const ui = useUIStore()

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
}

function addHours(h) {
  if (!props.securityCheck()) return
  const current = game.db.getTimeOffset()
  game.db.setTimeOffset(current + (h * 3600 * 1000))
  timeOffsetLabel.value = `${game.db.getTimeOffset()}ms`
  ui.notify(`+${h} horas añadidas`, '⏩')
  window.dispatchEvent(new CustomEvent('time-sync-update'))
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

    <div class="debug-info-box">
      <span>Offset Actual:</span>
      <strong>{{ timeOffsetLabel }}</strong>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/debug";
</style>
