<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import type { ITacticalReplayEngine } from '@/logic/battle/replay/tacticalReplayEngine.ts'

const props = defineProps<{
  engine: ITacticalReplayEngine
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'turn-change', turn: number): void
}>()

const replayerBarRef = ref<HTMLElement | null>(null)
const copyFeedback = ref(false)
let autoPlayTween: gsap.core.Tween | null = null

const currentTurn = ref(props.engine.getCurrentTurn())
const totalTurns = computed(() => props.engine.getTotalTurns())
const isPlaying = ref(props.engine.isPlaying())
const isOver = computed(() => props.engine.isOver())
const battleCode = computed(() => props.engine.getRecord().battleCode)
const themeTitle = computed(() => props.engine.getRecord().themeId.replace(/_/g, ' ').toUpperCase())

const turnLabel = computed(() => {
  const cur = String(currentTurn.value).padStart(2, '0')
  const tot = String(totalTurns.value).padStart(2, '0')
  return `TURNO ${cur} / ${tot}`
})

function updateState() {
  currentTurn.value = props.engine.getCurrentTurn()
  isPlaying.value = props.engine.isPlaying()
  emit('turn-change', currentTurn.value)
}

function handleNextTurn() {
  const advanced = props.engine.nextTurn()
  updateState()
  if (!advanced && autoPlayTween) {
    stopAutoPlay()
  }
}

function handleRestart() {
  stopAutoPlay()
  props.engine.restart()
  updateState()
}

function startAutoPlay() {
  props.engine.play()
  isPlaying.value = true
  scheduleNextStep()
}

function stopAutoPlay() {
  if (autoPlayTween) {
    autoPlayTween.kill()
    autoPlayTween = null
  }
  props.engine.pause()
  isPlaying.value = false
}

function scheduleNextStep() {
  if (!props.engine.isPlaying() || props.engine.isOver()) {
    stopAutoPlay()
    return
  }

  // GSAP-based zero-timer turn pacing
  const dummy = { t: 0 }
  autoPlayTween = gsap.to(dummy, {
    t: 1,
    duration: 1.8,
    onComplete: () => {
      if (props.engine.isPlaying()) {
        const adv = props.engine.nextTurn()
        updateState()
        if (adv && !props.engine.isOver()) {
          scheduleNextStep()
        } else {
          stopAutoPlay()
        }
      }
    }
  })
}

function togglePlayPause() {
  if (isPlaying.value) {
    stopAutoPlay()
  } else {
    if (isOver.value) {
      props.engine.restart()
      updateState()
    }
    startAutoPlay()
  }
}

async function copyCode() {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(battleCode.value)
    }
    copyFeedback.value = true
    gsap.fromTo('.copy-indicator', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2 })
    
    // Auto clear feedback via GSAP
    gsap.delayedCall(2.0, () => {
      copyFeedback.value = false
    })
  } catch {
    // Fallback if clipboard permission denied
    copyFeedback.value = false
  }
}

function handleClose() {
  stopAutoPlay()
  emit('close')
}

onMounted(() => {
  if (replayerBarRef.value) {
    gsap.from(replayerBarRef.value, {
      y: 40,
      opacity: 0,
      duration: 0.4,
      ease: 'back.out(1.4)'
    })
  }
})

onUnmounted(() => {
  stopAutoPlay()
})
</script>

<template>
  <div
    id="battle-tactical-replayer-bar"
    ref="replayerBarRef"
    class="tactical-replayer-bar"
  >
    <!-- Left Section: Match Info & Fog Badge -->
    <div class="replayer-info-section">
      <span class="theater-badge"><span class="emoji">🎭</span> TEATRO PVP</span>
      <span class="theme-badge">{{ themeTitle }}</span>
      <span
        class="fog-badge"
        title="Movimientos y objetos solo visibles una vez usados"
      >
        <span class="emoji">🌫️</span> NIEBLA ACTIVA
      </span>
    </div>

    <!-- Center Section: Turn Stepper Controls -->
    <div class="replayer-controls-section">
      <button
        id="btn-replayer-restart"
        v-gsap-hover="'button'"
        class="ctrl-btn secondary"
        title="Reiniciar Repetición"
        @click="handleRestart"
      >
        <span class="emoji">↺</span> REINICIAR
      </button>

      <button
        id="btn-replayer-play-pause"
        v-gsap-hover="'button'"
        class="ctrl-btn primary"
        :title="isPlaying ? 'Pausar' : 'Reproducir'"
        @click="togglePlayPause"
      >
        <span class="emoji">{{ isPlaying ? '⏸' : (isOver ? '↺' : '▶') }}</span> {{ isPlaying ? 'PAUSA' : (isOver ? 'REPETIR' : 'PLAY') }}
      </button>

      <button
        id="btn-replayer-next-turn"
        v-gsap-hover="'button'"
        class="ctrl-btn action"
        :disabled="isOver"
        title="Avanzar Siguiente Turno"
        @click="handleNextTurn"
      >
        SIGUIENTE <span class="emoji">▶</span>
      </button>

      <div class="turn-counter">
        <span class="turn-val">{{ turnLabel }}</span>
      </div>
    </div>

    <!-- Right Section: Battle Code & Exit -->
    <div class="replayer-actions-section">
      <button
        id="btn-replayer-copy-code"
        v-gsap-hover="'button'"
        class="copy-code-btn"
        title="Copiar Battle Code"
        @click="copyCode"
      >
        <span class="code-lbl">{{ battleCode }}</span>
        <span class="copy-icon emoji">📋</span>
        <span
          v-if="copyFeedback"
          class="copy-indicator"
        >¡COPIADO!</span>
      </button>

      <button
        id="btn-replayer-exit"
        v-gsap-hover="'button'"
        class="exit-btn"
        title="Salir del Teatro"
        @click="handleClose"
      >
        <span class="emoji">✕</span> SALIR
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tactical-replayer-bar {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-hud);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: calc(100% - 32px);
  max-width: 1050px;
  padding: 10px 18px;
  background: Rgba(15, 23, 42, 0.94);
  backdrop-filter: Blur(8px);
  border: 2px solid Rgba(234, 179, 8, 0.5);
  border-radius: 12px;
  box-shadow: 0 8px 32px Rgba(0, 0, 0, 0.6), inset 0 1px 0 Rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  font-family: 'Press Start 2P', monospace, sans-serif;
}

.replayer-info-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  .theater-badge {
    padding: 4px 8px;
    background: #854d0e;
    border: 1px solid #eab308;
    border-radius: 4px;
    font-size: 0.65rem;
    color: #fef08a;
  }

  .theme-badge {
    padding: 4px 8px;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 4px;
    font-size: 0.6rem;
    color: #94a3b8;
  }

  .fog-badge {
    padding: 4px 8px;
    background: Rgba(71, 85, 105, 0.6);
    border: 1px dashed #64748b;
    border-radius: 4px;
    font-size: 0.6rem;
    color: #cbd5e1;
  }
}

.replayer-controls-section {
  display: flex;
  align-items: center;
  gap: 10px;

  .ctrl-btn {
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 0.68rem;
    font-weight: bold;
    cursor: pointer;
    font-family: inherit;
    border: 1px solid transparent;

    &.primary {
      background: linear-gradient(180deg, #3b82f6, #1d4ed8);
      color: #ffffff;
      border-color: #60a5fa;
    }

    &.action {
      background: linear-gradient(180deg, #10b981, #047857);
      color: #ffffff;
      border-color: #34d399;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    &.secondary {
      background: #334155;
      color: #cbd5e1;
      border-color: #475569;
    }
  }

  .turn-counter {
    padding: 6px 12px;
    background: #020617;
    border: 1px solid #1e293b;
    border-radius: 6px;

    .turn-val {
      font-size: 0.68rem;
      color: #facc15;
      letter-spacing: 1px;
    }
  }
}

.replayer-actions-section {
  display: flex;
  align-items: center;
  gap: 10px;

  .copy-code-btn {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #0f172a;
    border: 1px solid #eab308;
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.65rem;
    color: #fef08a;
    cursor: pointer;

    .copy-indicator {
      position: absolute;
      top: -24px;
      right: 0;
      background: #22c55e;
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.55rem;
      box-shadow: 0 2px 8px Rgba(0, 0, 0, 0.4);
    }
  }

  .exit-btn {
    padding: 6px 12px;
    background: #ef4444;
    border: 1px solid #f87171;
    border-radius: 6px;
    color: #ffffff;
    font-family: inherit;
    font-size: 0.65rem;
    font-weight: bold;
    cursor: pointer;
  }
}

@media (max-width: 768px) {
  .tactical-replayer-bar {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
