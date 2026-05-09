<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  pokemon: { type: Object, required: true },
  rarity: { type: Number, default: 0 },
  onWin: { type: Function, default: null },
  onFail: { type: Function, default: null }
})

const emit = defineEmits(['win', 'fail', 'close'])

// Game configuration
const totalNotes = Math.min(22, 5 + Math.floor(props.rarity / 7))
const speedBase = Math.max(380, 1100 - (props.rarity * 7.5))
const hitWindow = Math.max(100, 190 - (props.rarity / 1.3))
const spawnInterval = speedBase * 0.7

// State
const spawnedNotesCount = ref(0)
const clickedNotesCount = ref(0)
const notes = ref([])
const gameActive = ref(true)
const isFailed = ref(false)

const spawnNext = () => {
  if (!gameActive.value || spawnedNotesCount.value >= totalNotes) return

  spawnedNotesCount.value++
  const id = spawnedNotesCount.value
  const x = 15 + Math.random() * 70
  const y = 20 + Math.random() * 60

  const note = {
    id,
    x,
    y,
    startTime: Date.now(),
    isHit: false,
    timeout: null
  }

  notes.value.push(note)

  // Fail if not clicked in time
  note.timeout = setTimeout(() => {
    if (gameActive.value && !note.isHit) {
      fail()
    }
  }, speedBase + hitWindow)

  // Schedule next spawn
  if (spawnedNotesCount.value < totalNotes) {
    setTimeout(spawnNext, spawnInterval)
  }
}

const handleNoteClick = (note) => {
  if (!gameActive.value || note.isHit) return

  const elapsed = Date.now() - note.startTime
  const diff = Math.abs(elapsed - speedBase)

  if (diff <= hitWindow) {
    note.isHit = true
    clickedNotesCount.value++
    
    if (clickedNotesCount.value >= totalNotes) {
      win()
    }
  } else {
    fail()
  }
}

const win = () => {
  gameActive.value = false
  setTimeout(() => {
    if (props.onWin) props.onWin()
    emit('win')
    emit('close')
  }, 500)
}

const fail = () => {
  if (!gameActive.value) return
  gameActive.value = false
  isFailed.value = true
  setTimeout(() => {
    if (props.onFail) props.onFail()
    emit('fail')
    emit('close')
  }, 1000)
}

onMounted(() => {
  setTimeout(spawnNext, 1000)
})

onUnmounted(() => {
  gameActive.value = false
  notes.value.forEach(n => clearTimeout(n.timeout))
})
</script>

<template>
  <div
    class="fishing-game-overlay"
    :class="{ fail: isFailed }"
  >
    <div class="rhythm-container">
      <div class="fishing-hint">
        <h3>¡RITMO DE PESCA!</h3>
        <p>Hacé clic en los números <span>1, 2, 3...</span></p>
        <p class="secondary">
          ¡Mantené el foco!
        </p>
      </div>

      <div class="rhythm-counter">
        NOTAS: {{ clickedNotesCount }} / {{ totalNotes }}
      </div>

      <TransitionGroup name="note">
        <div
          v-for="note in notes"
          v-show="!note.isHit"
          :key="note.id"
          class="rhythm-note"
          :style="{ left: note.x + '%', top: note.y + '%' }"
          @mousedown.stop="handleNoteClick(note)"
        >
          <div class="note-number">
            {{ note.id }}
          </div>
          <div
            class="rhythm-ring"
            :style="{ animationDuration: speedBase + 'ms' }"
          />
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.fishing-game-overlay {
  position: fixed;
  inset: 0;
  z-index: Var(--z-modal);
  background: Rgba(0, 0, 0, 0.9);
  -webkit-backdrop-filter: Blur(10px);
  backdrop-filter: Blur(10px);
  @include gpu-layer;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: crosshair;
  transition: background 0.5s;
  @include gpu-layer;

  &.fail {
    background: Rgba(153, 27, 27, 0.9);
  }
}

.rhythm-container {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 1000px;
  max-height: 800px;
  user-select: none;
}

.fishing-hint {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: TranslateX(-50%);
  text-align: center;
  pointer-events: none;
  
  h3 {
    @include pixelated;
    font-size: 16px;
    color: Rgba(59, 130, 246, 1);
    margin-bottom: 12px;
    text-shadow: 0 0 10px Rgba(59, 130, 246, 0.5);
  }

  p {
    font-size: 14px;
    color: Rgba(238, 238, 238, 1);
    span { color: Rgba(250, 204, 21, 1); font-weight: bold; }
  }

  .secondary {
    font-size: 11px;
    opacity: 0.6;
    margin-top: 8px;
    text-transform: uppercase;
  }
}

.rhythm-counter {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: TranslateX(-50%);
  @include pixelated;
  font-size: 14px;
  color: Var(--white);
  background: Rgba(255, 255, 255, 0.05);
  padding: 12px 24px;
  border-radius: 99px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
}

.rhythm-note {
  position: absolute;
  width: 70px;
  height: 70px;
  transform: Translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  .note-number {
    @include pixelated;
    font-size: 20px;
    color: Var(--white);
    z-index: Var(--z-base);
    text-shadow: 0 2px 4px Rgba(0,0,0,0.5);
  }

  .rhythm-ring {
    position: absolute;
    inset: -10px;
    border: 4px solid Rgba(59, 130, 246, 1);
    border-radius: 50%;
    animation: shrink linear forwards;
    pointer-events: none;
  }
}

@keyframes shrink {
  from { transform: Scale(1.8); opacity: 0; }
  20% { opacity: 1; }
  to { transform: Scale(1); opacity: 1; border-color: Var(--white); }
}

.note-leave-active {
  transition: all 0.2s ease;
}
.note-leave-to {
  transform: Translate(-50%, -50%) Scale(1.5);
  opacity: 0;
}
</style>