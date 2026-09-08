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
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 16px;
  background: Rgba(15, 23, 42, 0.95);
  border-top: 1px solid Rgba(59, 130, 246, 0.4);
  box-shadow: 0 -4px 12px Rgba(0, 0, 0, 0.4);
}

.replay-turn-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-pixel, monospace);

  .label {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .turn-numbers {
    font-size: 0.9rem;
    color: #60a5fa;
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
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 32px;
  padding: 2px 8px;
  background: Rgba(30, 41, 59, 0.8);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: #f8fafc;
  font-family: var(--font-pixel, monospace);
  font-size: 0.85rem;
  cursor: pointer;

  &:hover {
    background: Rgba(59, 130, 246, 0.3);
    border-color: #60a5fa;
  }

  &.play-btn {
    background: Rgba(59, 130, 246, 0.25);
    border-color: Rgba(59, 130, 246, 0.6);
    font-size: 1rem;
  }

  &.speed-btn {
    font-size: 0.75rem;
    color: #38bdf8;
    font-weight: bold;
  }
}
</style>
