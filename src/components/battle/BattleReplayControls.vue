<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ITacticalReplayEngine } from '@/logic/battle/replay/tacticalReplayEngine'

interface Props {
  engine?: ITacticalReplayEngine | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'pause'): void
  (e: 'next'): void
  (e: 'restart'): void
  (e: 'speed-change', speed: number): void
}>()

const isPlaying = ref(false)
const speed = ref(1)
const speeds = [1, 2, 4] as const

const currentTurn = computed(() => props.engine?.getCurrentTurn() ?? 0)
const totalTurns = computed(() => props.engine?.getTotalTurns() ?? 0)

const togglePlay = () => {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    emit('play')
  } else {
    emit('pause')
  }
}

const handleNext = () => {
  emit('next')
}

const handleRestart = () => {
  isPlaying.value = false
  emit('restart')
}

const cycleSpeed = () => {
  const currentIndex = speeds.indexOf(speed.value as 1 | 2 | 4)
  const nextIndex = (currentIndex + 1) % speeds.length
  speed.value = speeds[nextIndex] ?? 1
  emit('speed-change', speed.value)
}
</script>

<template>
  <div
    id="battle-replay-controls"
    class="replay-controls-bar"
  >
    <div class="replay-turn-indicator">
      <span class="label">TURNO</span>
      <span class="turn-numbers">{{ currentTurn }} / {{ totalTurns }}</span>
    </div>

    <div class="replay-buttons">
      <button
        id="replay-btn-restart"
        class="replay-btn"
        title="Reiniciar Replay"
        @click="handleRestart"
      >
        <span class="emoji">⏮️</span>
      </button>
      <button
        id="replay-btn-play-pause"
        class="replay-btn play-btn"
        :title="isPlaying ? 'Pausar' : 'Reproducir'"
        @click="togglePlay"
      >
        <span class="emoji">{{ isPlaying ? '⏸️' : '▶️' }}</span>
      </button>
      <button
        id="replay-btn-next"
        class="replay-btn"
        title="Siguiente Turno"
        @click="handleNext"
      >
        <span class="emoji">⏭️</span>
      </button>
      <button
        id="replay-btn-speed"
        class="replay-btn speed-btn"
        title="Cambiar Velocidad"
        @click="cycleSpeed"
      >
        {{ speed }}x
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.replay-controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 8px 16px;
  background: rgb(15 23 42 / 95%);
  border-top: 1px solid rgb(59 130 246 / 40%);
  box-shadow: 0 -4px 12px rgb(0 0 0 / 40%);
}

.replay-turn-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-pixel, monospace);

  .label {
    color: #94a3b8;
    font-size: 0.75rem;
  }

  .turn-numbers {
    color: #60a5fa;
    font-size: 0.9rem;
    font-weight: bold;
  }
}

.replay-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.replay-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 36px;
  height: 32px;
  padding: 2px 8px;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 4px;
  background: rgb(30 41 59 / 80%);
  color: #f8fafc;
  font-family: var(--font-pixel, monospace);
  font-size: 0.85rem;
  cursor: pointer;

  &:hover {
    background: rgb(59 130 246 / 30%);
    border-color: #60a5fa;
  }

  &.play-btn {
    background: rgb(59 130 246 / 25%);
    font-size: 1rem;
    border-color: rgb(59 130 246 / 60%);
  }

  &.speed-btn {
    color: #38bdf8;
    font-size: 0.75rem;
    font-weight: bold;
  }
}
</style>
