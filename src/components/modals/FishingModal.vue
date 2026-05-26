<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import BaseModal from '@/components/common/BaseModal.vue'
import type { Pokemon } from '@/types/pokemon'

interface Props {
  show?: boolean
  pokemon: Pokemon
  rarity?: number
  onWin?: (() => void) | null
  onFail?: (() => void) | null
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  rarity: 0,
  onWin: null,
  onFail: null
})

const emit = defineEmits<{
  (e: 'win'): void
  (e: 'fail'): void
  (e: 'close'): void
}>()

// Game configuration
const totalNotes = Math.min(22, 5 + Math.floor(props.rarity / 7))
const speedBase = Math.max(380, 1100 - (props.rarity * 7.5))
const hitWindow = Math.max(100, 190 - (props.rarity / 1.3))
const spawnInterval = speedBase * 0.7

interface FishingNote {
  id: number
  x: number
  y: number
  startTime: number
  isHit: boolean
}

// State
const spawnedNotesCount = ref(0)
const clickedNotesCount = ref(0)
const notes = ref<FishingNote[]>([])
const gameActive = ref(true)
const isFailed = ref(false)

const spawnNext = () => {
  if (!gameActive.value || spawnedNotesCount.value >= totalNotes) return

  spawnedNotesCount.value++
  const id = spawnedNotesCount.value
  const x = 15 + Math.random() * 70
  const y = 20 + Math.random() * 60

  const note: FishingNote = {
    id,
    x,
    y,
    startTime: gsap.globalTimeline.time() * 1000,
    isHit: false
  }

  notes.value.push(note)

  // Fail if not clicked in time
  gsap.delayedCall((speedBase + hitWindow) / 1000, () => {
    if (gameActive.value && !note.isHit) {
      fail()
    }
  })

  // Schedule next spawn
  if (spawnedNotesCount.value < totalNotes) {
    gsap.delayedCall(spawnInterval / 1000, spawnNext)
  }
}

const handleNoteClick = (note: FishingNote) => {
  if (!gameActive.value || note.isHit) return

  const elapsed = (gsap.globalTimeline.time() * 1000) - note.startTime
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
  gsap.delayedCall(0.5, () => {
    if (props.onWin) props.onWin()
    emit('win')
    emit('close')
  })
}

const fail = () => {
  if (!gameActive.value) return
  gameActive.value = false
  isFailed.value = true
  gsap.delayedCall(1, () => {
    if (props.onFail) props.onFail()
    emit('fail')
    emit('close')
  })
}

onMounted(() => {
  gsap.delayedCall(1, spawnNext)
})

onUnmounted(() => {
  gameActive.value = false
  gsap.killTweensOf(spawnNext)
})

// Local directive to animate the rhythm ring with GSAP
const vGsapShrink = {
  mounted(el: HTMLElement, binding: { value: number }) {
    const duration = binding.value / 1000
    const tl = gsap.timeline()
    tl.fromTo(el, 
      { scale: 1.8, opacity: 0 },
      { scale: 1, duration, ease: 'none' }
    )
    tl.to(el, { opacity: 1, duration: duration * 0.2, ease: 'none' }, 0)
    tl.to(el, { borderColor: '#ffffff', duration: duration * 0.8, ease: 'none' }, duration * 0.2)
  }
}
</script>

<template>
  <BaseModal
    :show="show"
    type="fullscreen"
    hide-header
    :show-close-button="false"
    overlay="dark"
    padding="raw"
    :show-border="false"
  >
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
              v-gsap-shrink="speedBase"
              class="rhythm-ring"
            />
          </div>
        </TransitionGroup>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.fishing-game-overlay {
  position: fixed;
  inset: 0;
  background: Rgba(0, 0, 0, 0.9);
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(10px);
  @include gpu-layer;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: crosshair;

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
  transform: Translatex(-50%);
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
  transform: Translatex(-50%);
  @include pixelated;
  font-size: 14px;
  color: var(--white);
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
    color: var(--white);
    z-index: var(--z-base);
    text-shadow: 0 2px 4px Rgba(0,0,0,0.5);
  }

  .rhythm-ring {
    position: absolute;
    inset: -10px;
    border: 4px solid Rgba(59, 130, 246, 1);
    border-radius: 50%;
    pointer-events: none;
  }
}

.note-leave-to {
  transform: Translate(-50%, -50%) Scale(1.5);
  opacity: 0;
}
</style>
