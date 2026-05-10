<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import type { Pokemon } from '@/types/pokemon'

interface Props {
  enemy: Pokemon
  rarity?: number // 1-100 (lower is rarer/harder)
}

const props = withDefaults(defineProps<Props>(), {
  rarity: 50
})

const emit = defineEmits<{
  (e: 'success'): void
  (e: 'fail'): void
}>()

// Game Config (Adapted from Legacy)
const totalNotes = Math.min(22, 5 + Math.floor(props.rarity / 7))
const speedBase = Math.max(380, 1100 - (props.rarity * 7.5))
const hitWindow = Math.max(100, 190 - (props.rarity / 1.3))
const spawnInterval = speedBase * 0.7

interface Note {
  id: number
  x: string
  y: string
  startTime: number
  clicked: boolean
}

const activeNotes = ref<Note[]>([])
const clickedNotesCount = ref(0)
const spawnedNotesCount = ref(0)
const gameActive = ref(true)
const feedback = ref('')

let gameCall: gsap.core.Tween | null = null
const activeTweens = new Map<number, gsap.core.Tween[]>()

const spawnNext = () => {
  if (!gameActive.value || spawnedNotesCount.value >= totalNotes) return

  spawnedNotesCount.value++
  const noteId = spawnedNotesCount.value
  
  const padding = 20
  const x = padding + Math.random() * (100 - padding * 2)
  const y = padding + Math.random() * (100 - padding * 2)

  const note: Note = {
    id: noteId,
    x: `${x}%`,
    y: `${y}%`,
    startTime: gsap.globalTimeline.time() * 1000,
    clicked: false
  }

  activeNotes.value.push(note)

  // Fail timer if not clicked
  const failCall = gsap.delayedCall((speedBase + 150) / 1000, () => {
    if (!note.clicked && gameActive.value) {
      failGame('¡Perdiste el ritmo!')
    }
  })

  // Visual Ring Animation
  nextTick(() => {
    const el = document.querySelector(`.rhythm-note[data-note-id="${noteId}"] .rhythm-ring`)
    if (el) {
      const ringAnim = gsap.fromTo(el, 
        { scale: 2.5, opacity: 0 },
        { 
          scale: 0.6, 
          opacity: 1, 
          duration: speedBase / 1000, 
          ease: 'none',
          onComplete: () => { gsap.to(el, { opacity: 0, duration: 0.1 }) }
        }
      )
      activeTweens.set(noteId, [failCall, ringAnim])
    }
  })

  gameCall = gsap.delayedCall(spawnInterval / 1000, spawnNext)
}

const handleNoteClick = (note: Note) => {
  if (note.clicked || !gameActive.value) return

  if (note.id !== clickedNotesCount.value + 1) {
    failGame('¡Orden equivocado!')
    return
  }

  const elapsed = (gsap.globalTimeline.time() * 1000) - note.startTime
  const accuracy = Math.abs(elapsed - speedBase)

  if (accuracy < hitWindow) {
    note.clicked = true
    clickedNotesCount.value++
    
    // Kill the fail timer and ring animation
    const tweens = activeTweens.get(note.id)
    if (tweens) {
      tweens.forEach(t => t.kill())
      activeTweens.delete(note.id)
    }

    // Success animation
    const noteEl = document.querySelector(`.rhythm-note[data-note-id="${note.id}"]`)
    if (noteEl) {
      gsap.to(noteEl, { scale: 1.2, duration: 0.1, yoyo: true, repeat: 1 })
    }

    gsap.delayedCall(0.1, () => {
      activeNotes.value = activeNotes.value.filter(n => n.id !== note.id)
      if (clickedNotesCount.value >= totalNotes) {
        finishGame(true)
      }
    })
  } else {
    failGame(accuracy < speedBase ? '¡Muy pronto!' : '¡Muy tarde!')
  }
}

const failGame = (msg: string) => {
  if (!gameActive.value) return
  gameActive.value = false
  feedback.value = msg
  gsap.delayedCall(1, () => finishGame(false))
}

const finishGame = (success: boolean) => {
  gameActive.value = false
  if (gameCall) gameCall.kill()
  activeTweens.forEach(tweens => tweens.forEach(t => t.kill()))
  activeTweens.clear()

  if (success) {
    emit('success')
  } else {
    emit('fail')
  }
}

onMounted(() => {
  gsap.delayedCall(0.8, spawnNext)

  gsap.to('.fishing-icon', {
    y: -10,
    duration: 1,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  })
})

onUnmounted(() => {
  if (gameCall) gameCall.kill()
  activeTweens.forEach(tweens => tweens.forEach(t => t.kill()))
})
</script>

<template>
  <div class="fishing-minigame-overlay">
    <div class="rhythm-container">
      <!-- Background / Hint -->
      <div class="fishing-hint">
        <div class="fishing-icon">
          🎣
        </div>
        <div class="fishing-text">
          <h3 class="pixel-text">
            ¡RITMO DE PESCA!
          </h3>
          <p>Hacé clic en las notas en orden <span>1, 2, 3...</span></p>
        </div>
      </div>

      <!-- Counter -->
      <div class="rhythm-counter pixel-text">
        NOTAS: {{ clickedNotesCount }} / {{ totalNotes }}
      </div>

      <!-- Game Area -->
      <div class="game-area">
        <div 
          v-for="note in activeNotes" 
          :key="note.id"
          class="rhythm-note"
          :class="{ 'success': note.clicked }"
          :style="{ left: note.x, top: note.y }"
          :data-note-id="note.id"
          @mousedown.stop="handleNoteClick(note)"
          @touchstart.prevent.stop="handleNoteClick(note)"
        >
          <div class="rhythm-circle">
            {{ note.id }}
          </div>
          <div 
            class="rhythm-ring" 
          />
        </div>
      </div>

      <!-- Feedback -->
      <Transition name="fade">
        <div
          v-if="feedback"
          class="game-feedback pixel-text"
        >
          {{ feedback }}
        </div>
      </Transition>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/core/_mixins" as *;
.fishing-minigame-overlay {
  position: absolute;
  inset: 0;
  z-index: var(--z-hud);
  background: Rgba(0, 0, 0, 0.7);
  will-change: transform, filter, opacity, backdrop-filter;
  backdrop-filter: Blur(8px);
  @include gpu-layer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  animation: fadeIn 0.3s ease;
}

.rhythm-container {
  position: relative;
  width: 90%;
  max-width: 500px;
  height: 90%;
  max-height: 500px;
  background: Rgba(255, 255, 255, 0.05);
  border: 2px solid Rgba(10, 132, 255, 0.3);
  border-radius: 32px;
  box-shadow: 0 0 40px Rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.fishing-hint {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  background: Rgba(10, 132, 255, 0.1);
  padding: 12px 20px;
  border-radius: 16px;
  border: 1px solid Rgba(10, 132, 255, 0.2);

  .fishing-icon {
    font-size: 40px;
  }

  .fishing-text {
    h3 {
      font-size: 14px;
      color: $blue;
      margin-bottom: 4px;
      text-shadow: 0 0 10px Rgba(10, 132, 255, 0.5);
    }
    p {
      font-size: 11px;
      color: #ccc;
      span { color: $white; font-weight: bold; }
    }
  }
}

.rhythm-counter {
  text-align: center;
  font-size: 16px;
  color: $white;
  margin-bottom: 16px;
  letter-spacing: 1px;
}

.game-area {
  flex: 1;
  position: relative;
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 20px;
  border: 1px dashed Rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.rhythm-note {
  position: absolute;
  width: 70px;
  height: 70px;
  transform: Translate(-50%, -50%);
  cursor: pointer;
  user-select: none;
  touch-action: none;

  .rhythm-circle {
    width: 100%;
    height: 100%;
    background: Rgba(10, 132, 255, 0.2);
    border: 3px solid $blue;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $white;
    @include pixelated;
    font-size: 18px;
    box-shadow: 0 0 20px Rgba(10, 132, 255, 0.4);
    transition: all 0.2s ease;
    z-index: calc(var(--z-map-floor) + 1);
    position: relative;
  }

  .rhythm-ring {
    position: absolute;
    inset: -20px;
    border: 2px solid Rgba(10, 132, 255, 0.6);
    border-radius: 50%;
    pointer-events: none;
    opacity: 0;
  }

  &.success .rhythm-circle {
    background: #4ade80;
    border-color: #22c55e;
    transform: Scale(1.2);
    box-shadow: 0 0 30px Rgba(34, 197, 94, 0.6);
  }
}

.game-feedback {
  position: absolute;
  top: 60%;
  left: 50%;
  transform: Translatex(-50%);
  font-size: 18px;
  color: #ff4d4d;
  text-shadow: 0 0 10px Rgba(255, 77, 77, 0.5);
  background: Rgba(0, 0, 0, 0.8);
  padding: 12px 24px;
  border-radius: 12px;
  z-index: var(--z-map-spawns);
}

@keyframes ringShrink {
  from { transform: Scale(2.5); opacity: 0; }
  20% { opacity: 1; }
  to { transform: Scale(0.6); opacity: 0; }
}

@keyframes bounce {
  0%, 100% { transform: Translatey(0); }
  50% { transform: Translatey(-10px); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
