<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import BaseModal from '@/components/common/BaseModal.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import {
  calculateFishingTotalNotes,
  calculateFishingSpeedBase,
  calculateFishingHitWindow,
} from '@/logic/minigames/minigameMath'

const MINIGAME_SPAWN_PADDING_PX = 60
const MINIGAME_MIN_DISTANCE_PX = 85
const MINIGAME_MAX_POSITION_ATTEMPTS = 15
const MINIGAME_FAIL_TIMER_BUFFER_MS = 150
const MINIGAME_CONTAINER_SIZE_PX = 380

const SPAWN_INTERVAL_MULTIPLIER = 0.7
const INITIAL_RING_SCALE = 3.0
const RING_FADE_OUT_DURATION_SEC = 0.1
const SUCCESS_SCALE_DURATION_SEC = 0.1
const REMOVE_NOTE_DELAY_SEC = 0.1
const FAIL_FEEDBACK_DELAY_SEC = 1
const INITIAL_SPAWN_DELAY_SEC = 0.8
const ICON_BOUNCE_Y_PX = -10
const ICON_BOUNCE_DURATION_SEC = 1

const DEFAULT_RARITY = 50
const MS_PER_SECOND = 1000

interface Props {
  show?: boolean
  pokemon: Pokemon
  rarity?: number // 1-100
  onWin?: (() => void) | null
  onFail?: (() => void) | null
  onCloseCallback?: (() => void) | null
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  rarity: DEFAULT_RARITY,
  onWin: null,
  onFail: null,
  onCloseCallback: null
})

const emit = defineEmits<{
  (e: 'win'): void
  (e: 'fail'): void
  (e: 'close'): void
}>()

const gameActive = ref(true)
const feedback = ref('')

let gameCall: gsap.core.Tween | null = null
let iconTween: gsap.core.Tween | null = null
const totalNotes = calculateFishingTotalNotes(props.rarity)
const speedBase = calculateFishingSpeedBase(props.rarity)
const hitWindow = calculateFishingHitWindow(props.rarity)
const spawnInterval = speedBase * SPAWN_INTERVAL_MULTIPLIER

interface Note {
  id: number
  x: number // in px
  y: number // in px
  startTime: number
  clicked: boolean
}

const activeNotes = ref<Note[]>([])
const clickedNotesCount = ref(0)
const spawnedNotesCount = ref(0)
const activePositions = ref<{ x: number; y: number }[]>([])
const activeTweens = new Map<number, gsap.core.Tween[]>()
const fishingIconRef = ref<HTMLElement | null>(null)

function getAnimationClockMs(): number {
  return performance.now()
}

function createGameplayTween(target: gsap.TweenTarget, vars: gsap.TweenVars): gsap.core.Tween {
  const tween = gsap.to(target, vars)
  const globalScale = gsap.globalTimeline.timeScale()
  if (globalScale > 0) tween.timeScale(1 / globalScale)
  return tween
}

function scheduleGameplayDelay(delaySec: number, callback: () => void): gsap.core.Tween {
  const tween = gsap.delayedCall(delaySec, callback)
  const globalScale = gsap.globalTimeline.timeScale()
  if (globalScale > 0) tween.timeScale(1 / globalScale)
  return tween
}

const spawnNext = () => {
  if (!gameActive.value || spawnedNotesCount.value >= totalNotes) return

  spawnedNotesCount.value++
  const noteId = spawnedNotesCount.value
  
  // Anti-overlapping logic in pixels (380x380 container)
  const padding = MINIGAME_SPAWN_PADDING_PX
  const minDistance = MINIGAME_MIN_DISTANCE_PX
  let x = 0
  let y = 0
  let tooClose = false
  let attempts = 0

  do {
    tooClose = false
    x = padding + Math.random() * (MINIGAME_CONTAINER_SIZE_PX - padding * 2)
    y = padding + Math.random() * (MINIGAME_CONTAINER_SIZE_PX - padding * 2)

    for (const pos of activePositions.value) {
      const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2))
      if (dist < minDistance) {
        tooClose = true
        break
      }
    }
    attempts++
  } while (tooClose && attempts < MINIGAME_MAX_POSITION_ATTEMPTS)

  const myPos = { x, y }
  activePositions.value.push(myPos)

  const note: Note = {
    id: noteId,
    x,
    y,
    startTime: getAnimationClockMs(),
    clicked: false
  }

  activeNotes.value.push(note)

  // Fail timer if not clicked
  const failCall = scheduleGameplayDelay((speedBase + MINIGAME_FAIL_TIMER_BUFFER_MS) / MS_PER_SECOND, () => {
    if (!note.clicked && gameActive.value) {
      activePositions.value = activePositions.value.filter(p => p !== myPos)
      failGame('¡Perdiste el ritmo!')
    }
  })

  // Visual Ring Animation
  nextTick(() => {
    const el = document.querySelector(`.rhythm-note[data-note-id="${noteId}"] .rhythm-ring`)
    if (el) {
      gsap.set(el, { scale: INITIAL_RING_SCALE, opacity: 0 })
      const ringAnim = createGameplayTween(el, {
          scale: 1.0, 
          opacity: 1, 
          duration: speedBase / MS_PER_SECOND, 
          ease: 'none',
          onComplete: () => { gsap.to(el, { opacity: 0, duration: RING_FADE_OUT_DURATION_SEC }) }
      })
      activeTweens.set(noteId, [failCall, ringAnim])
    }
  })

  gameCall = scheduleGameplayDelay(spawnInterval / MS_PER_SECOND, spawnNext)
}

const handleNoteClick = (note: Note) => {
  if (note.clicked || !gameActive.value) return

  if (note.id !== clickedNotesCount.value + 1) {
    failGame('¡Orden equivocado!')
    return
  }

  const elapsed = getAnimationClockMs() - note.startTime
  const accuracy = Math.abs(elapsed - speedBase)

  if (accuracy < hitWindow) {
    note.clicked = true
    clickedNotesCount.value++
    
    // Clear from active positions
    activePositions.value = activePositions.value.filter(p => p.x !== note.x || p.y !== note.y)

    // Kill the fail timer and ring animation
    const tweens = activeTweens.get(note.id)
    if (tweens) {
      tweens.forEach(t => t.kill())
      activeTweens.delete(note.id)
    }

    // Success animation
    const noteEl = document.querySelector(`.rhythm-note[data-note-id="${note.id}"]`)
    if (noteEl) {
      gsap.to(noteEl, { scale: 1.2, duration: SUCCESS_SCALE_DURATION_SEC, yoyo: true, repeat: 1 })
    }

    gsap.delayedCall(REMOVE_NOTE_DELAY_SEC, () => {
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
  gsap.delayedCall(FAIL_FEEDBACK_DELAY_SEC, () => finishGame(false))
}

const finishGame = (success: boolean) => {
  gameActive.value = false
  if (gameCall) gameCall.kill()
  activeTweens.forEach(tweens => tweens.forEach(t => t.kill()))
  activeTweens.clear()
  activePositions.value = []

  if (success) {
    emit('win')
  } else {
    emit('fail')
  }
  emit('close')
}

onMounted(() => {
  gameCall = scheduleGameplayDelay(INITIAL_SPAWN_DELAY_SEC, spawnNext)

  nextTick(() => {
    if (fishingIconRef.value) {
      iconTween = gsap.to(fishingIconRef.value, {
        y: ICON_BOUNCE_Y_PX,
        duration: ICON_BOUNCE_DURATION_SEC,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      })
    }
  })
})

onUnmounted(() => {
  if (gameCall) gameCall.kill()
  if (iconTween) iconTween.kill()
  activeTweens.forEach(tweens => tweens.forEach(t => t.kill()))
  activeTweens.clear()
})

const handleCloseModal = () => {
  emit('close')
  props.onCloseCallback?.()
}
</script>

<template>
  <BaseModal
    id="fishing-modal"
    :show="show"
    title="RITMO DE PESCA"
    title-color="var(--yellow)"
    header-background="rgba(18, 19, 26, 0.95)"
    variant="retro"
    overlay="dark"
    max-width="440px"
    @close="handleCloseModal"
  >
    <template #header-icon>
      <span
        ref="fishingIconRef"
        class="emoji fishing-icon"
      >🎣</span>&nbsp;
    </template>
    <div
      id="rhythm-container"
      class="rhythm-container"
    >
      <!-- Background / Hint -->
      <div class="fishing-hint">
        <div class="fishing-text">
          <p>Hacé clic en las notas en orden <span>1, 2, 3...</span></p>
        </div>
      </div>

      <!-- Counter -->
      <div class="rhythm-counter pixel-text">
        NOTAS: {{ clickedNotesCount }} / {{ totalNotes }}
      </div>

      <!-- Game Area (Fija 380x380 px) -->
      <div class="game-area">
        <div 
          v-for="note in activeNotes" 
          :key="note.id"
          class="rhythm-note"
          :class="{ 'success': note.clicked }"
          :style="{ left: `${note.x}px`, top: `${note.y}px` }"
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
      <div
        v-if="feedback"
        class="game-feedback pixel-text"
      >
        {{ feedback }}
      </div>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use "@/styles/core/_mixins" as *;

.rhythm-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px 8px 16px;
  align-items: center;
}

.fishing-hint {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  background: Rgba(10, 132, 255, 0.1);
  padding: 12px 20px;
  border-radius: 16px;
  border: 1px solid Rgba(10, 132, 255, 0.2);
  width: 100%;

  .fishing-icon {
    font-size: 40px;
  }

  .fishing-text {
    h3 {
      font-size: 11px;
      color: var(--blue, #0a84ff);
      margin-bottom: 4px;
      text-shadow: 0 0 10px Rgba(10, 132, 255, 0.5);
    }
    p {
      font-size: 9px;
      color: #ccc;
      span { color: #fff; font-weight: bold; }
    }
  }
}

.rhythm-counter {
  text-align: center;
  font-size: 12px;
  color: #fff;
  margin-bottom: 16px;
  letter-spacing: 1px;
}

.game-area {
  position: relative;
  width: 380px;
  height: 380px;
  background: Rgba(0, 0, 0, 0.4);
  border-radius: 20px;
  border: 2px solid Rgba(10, 132, 255, 0.2);
  overflow: hidden;
  box-shadow: inset 0 0 20px Rgba(0, 0, 0, 0.8);
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
    border: 3px solid var(--blue, #0a84ff);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    @include pixelated;
    font-size: 16px;
    box-shadow: 0 0 15px Rgba(10, 132, 255, 0.4);
    z-index: calc(var(--z-map-floor) + 1);
    position: relative;
  }

  .rhythm-ring {
    position: absolute;
    inset: 0;
    border: 4px solid Rgba(10, 132, 255, 0.8);
    border-radius: 50%;
    pointer-events: none;
    opacity: 0;
  }

  &.success .rhythm-circle {
    background: Rgba(34, 197, 94, 0.2);
    border-color: #22c55e;
    transform: Scale(1.2);
    box-shadow: 0 0 30px Rgba(34, 197, 94, 0.6);
  }
}

.game-feedback {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: Translate(-50%, -50%);
  font-size: 14px;
  color: #ff4d4d;
  text-shadow: 0 0 10px Rgba(255, 77, 77, 0.5);
  background: Rgba(0, 0, 0, 0.9);
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid Rgba(255, 77, 77, 0.3);
  z-index: var(--z-map-spawns);
  text-align: center;
  box-shadow: 0 4px 20px Rgba(0, 0, 0, 0.5);
}
</style>
