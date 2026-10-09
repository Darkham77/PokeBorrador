<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useClipboard } from '@vueuse/core'
import { gsap } from 'gsap'
import type { ITacticalReplayEngine } from '@/logic/battle/replay/tacticalReplayEngine.ts'

const props = defineProps<{
  engine: ITacticalReplayEngine
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'turn-change', turn: number): void
}>()

const CLIPBOARD_COPIED_DUR_MS = 2000 as const

const replayerBarRef = ref<HTMLElement | null>(null)
const copyIndicatorRef = ref<HTMLElement | null>(null)
const { copy, copied } = useClipboard({ copiedDuring: CLIPBOARD_COPIED_DUR_MS })
let autoPlayTween: gsap.core.Tween | null = null

watch(copied, async (isCopied) => {
  if (isCopied) {
    await nextTick()
    if (copyIndicatorRef.value) {
      gsap.fromTo(copyIndicatorRef.value, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2 })
    }
  }
})

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
  isPlaying.value = true
  props.engine.play()
  
  autoPlayTween = gsap.to({}, {
    duration: 1.8,
    repeat: -1,
    onRepeat: () => {
      const advanced = props.engine.nextTurn()
      updateState()
      if (!advanced) {
        stopAutoPlay()
      }
    }
  })
}

function stopAutoPlay() {
  isPlaying.value = false
  props.engine.pause()
  if (autoPlayTween) {
    autoPlayTween.kill()
    autoPlayTween = null
  }
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
  await copy(battleCode.value)
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
          v-if="copied"
          ref="copyIndicatorRef"
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
  z-index: var(--z-hud);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  width: calc(100% - 32px);
  max-width: 1050px;
  padding: 10px 18px;
  border: 2px solid Rgb(234 179 8 / 50%);
  border-radius: 12px;
  background: Rgb(15 23 42 / 94%);
  color: #f8fafc;
  font-family: 'Press Start 2P', monospace, sans-serif;
  transform: Translatex(-50%);
  backdrop-filter: Blur(8px);
  box-shadow: 0 8px 32px Rgb(0 0 0 / 60%), inset 0 1px 0 Rgb(255 255 255 / 10%);
}

.replayer-info-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  .theater-badge {
    padding: 4px 8px;
    border: 1px solid #eab308;
    border-radius: 4px;
    background: #854d0e;
    color: #fef08a;
    font-size: 0.65rem;
  }

  .theme-badge {
    padding: 4px 8px;
    border: 1px solid #334155;
    border-radius: 4px;
    background: #1e293b;
    color: #94a3b8;
    font-size: 0.6rem;
  }

  .fog-badge {
    padding: 4px 8px;
    border: 1px dashed #64748b;
    border-radius: 4px;
    background: Rgb(71 85 105 / 60%);
    color: #cbd5e1;
    font-size: 0.6rem;
  }
}

.replayer-controls-section {
  display: flex;
  align-items: center;
  gap: 10px;

  .ctrl-btn {
    padding: 8px 14px;
    border: 1px solid transparent;
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.68rem;
    font-weight: bold;
    cursor: pointer;

    &.primary {
      background: Linear-Gradient(180deg, #3b82f6, #1d4ed8);
      color: #fff;
      border-color: #60a5fa;
    }

    &.action {
      background: Linear-Gradient(180deg, #10b981, #047857);
      color: #fff;
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
    border: 1px solid #1e293b;
    border-radius: 6px;
    background: #020617;

    .turn-val {
      color: #facc15;
      font-size: 0.68rem;
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
    border: 1px solid #eab308;
    border-radius: 6px;
    background: #0f172a;
    color: #fef08a;
    font-family: inherit;
    font-size: 0.65rem;
    cursor: pointer;

    .copy-indicator {
      position: absolute;
      top: -24px;
      right: 0;
      padding: 2px 6px;
      border-radius: 4px;
      background: #22c55e;
      color: #fff;
      font-size: 0.55rem;
      box-shadow: 0 2px 8px Rgb(0 0 0 / 40%);
    }
  }

  .exit-btn {
    padding: 6px 12px;
    border: 1px solid #f87171;
    border-radius: 6px;
    background: #ef4444;
    color: #fff;
    font-family: inherit;
    font-size: 0.65rem;
    font-weight: bold;
    cursor: pointer;
  }
}

@media (width <= 768px) {
  .tactical-replayer-bar {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
