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
const gridSize = 5
const maxEnergy = 10
const totalFossilParts = 3

interface Tile {
  r: number
  c: number
  isFossil: boolean
  isDug: boolean
  clue: 'HOT' | 'COLD' | ''
}

// State
const grid = ref<Tile[]>([])
const energy = ref(maxEnergy)
const fossilsFound = ref(0)
const gameActive = ref(true)
const feedback = ref('¡Excavá las rocas con cuidado!')
const isFailed = ref(false)

// Initialize Game
function initGame() {
  // Generate empty grid
  const tempGrid: Tile[] = []
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      tempGrid.push({
        r,
        c,
        isFossil: false,
        isDug: false,
        clue: ''
      })
    }
  }

  // Generate contiguous 3-block fossil (horizontal or vertical)
  const isHorizontal = Math.random() < 0.5
  let startR = 0
  let startC = 0

  if (isHorizontal) {
    startR = Math.floor(Math.random() * gridSize)
    startC = Math.floor(Math.random() * (gridSize - totalFossilParts + 1))
  } else {
    startR = Math.floor(Math.random() * (gridSize - totalFossilParts + 1))
    startC = Math.floor(Math.random() * gridSize)
  }

  const fossilCoords = new Set<string>()
  for (let i = 0; i < totalFossilParts; i++) {
    const r = isHorizontal ? startR : startR + i
    const c = isHorizontal ? startC + i : startC
    fossilCoords.add(`${r},${c}`)
  }

  // Apply fossil flag
  tempGrid.forEach(tile => {
    if (fossilCoords.has(`${tile.r},${tile.c}`)) {
      tile.isFossil = true
    }
  })

  grid.value = tempGrid
  energy.value = maxEnergy
  fossilsFound.value = 0
  gameActive.value = true
  isFailed.value = false
  feedback.value = '¡Excavá las rocas con cuidado!'
}

// Calculate Manhattan distance to nearest hidden fossil
function getDistanceToNearestFossil(r: number, c: number): number {
  let minDistance = 999
  grid.value.forEach(tile => {
    if (tile.isFossil && !tile.isDug) {
      const dist = Math.abs(tile.r - r) + Math.abs(tile.c - c)
      if (dist < minDistance) {
        minDistance = dist
      }
    }
  })
  return minDistance
}

// Handle Tile Dig
function handleTileClick(tile: Tile) {
  if (!gameActive.value || tile.isDug) return

  tile.isDug = true
  energy.value--

  // Click Animation: Shake Grid slightly
  gsap.fromTo('.archaeology-grid', 
    { x: -3 }, 
    { x: 3, duration: 0.05, repeat: 5, yoyo: true, ease: 'none', onComplete: () => { gsap.set('.archaeology-grid', { x: 0 }) } }
  )

  // Dig Animation on tile
  const tileEl = document.querySelector(`.tile[data-coord="${tile.r},${tile.c}"]`)
  if (tileEl) {
    gsap.fromTo(tileEl, { scale: 0.9 }, { scale: 1, duration: 0.15, ease: 'power1.out' })
    createDustParticles(tileEl)
  }

  if (tile.isFossil) {
    fossilsFound.value++
    feedback.value = '¡Encontraste una pieza de fósil!'
    gsap.fromTo('.energy-counter', { scale: 1.2 }, { scale: 1, duration: 0.3 })
    
    // Sparkle Animation on hit
    if (tileEl) {
      gsap.to(tileEl, { backgroundColor: '#fef08a', duration: 0.2, yoyo: true, repeat: 1 })
    }

    if (fossilsFound.value >= totalFossilParts) {
      win()
      return
    }
  } else {
    // Clue
    const dist = getDistanceToNearestFossil(tile.r, tile.c)
    if (dist <= 1) {
      tile.clue = 'HOT'
      feedback.value = '¡Muy caliente! Hay un fósil cerca.'
    } else {
      tile.clue = 'COLD'
      feedback.value = 'Frío. Sigue buscando.'
    }
  }

  // Out of Energy Check
  if (energy.value <= 0 && fossilsFound.value < totalFossilParts) {
    fail()
  }
}

// Win sequence
function win() {
  gameActive.value = false
  feedback.value = '¡FÓSIL EXCAVADO CON ÉXITO!'
  
  // Confetti / glow animation
  gsap.to('.archaeology-grid', {
    boxShadow: '0 0 40px rgba(234, 179, 8, 0.8)',
    duration: 0.5
  })

  gsap.delayedCall(1.2, () => {
    if (props.onWin) props.onWin()
    emit('win')
    emit('close')
  })
}

// Fail sequence
function fail() {
  gameActive.value = false
  isFailed.value = true
  feedback.value = 'El fósil se ha desmoronado...'

  // Crack grid animation
  gsap.to('.archaeology-grid', {
    opacity: 0.5,
    filter: 'grayscale(1)',
    duration: 0.5
  })

  gsap.delayedCall(1.2, () => {
    if (props.onFail) props.onFail()
    emit('fail')
    emit('close')
  })
}

// Sparkle/Dust Generator
function createDustParticles(target: Element) {
  const rect = target.getBoundingClientRect()
  const parent = target.parentElement
  if (!parent) return

  for (let i = 0; i < 6; i++) {
    const particle = document.createElement('div')
    particle.className = 'dust-particle'
    particle.style.cssText = `
      position: absolute;
      width: 4px;
      height: 4px;
      background: #ca8a04;
      border-radius: 50%;
      pointer-events: none;
      left: ${rect.left - parent.getBoundingClientRect().left + rect.width / 2}px;
      top: ${rect.top - parent.getBoundingClientRect().top + rect.height / 2}px;
      z-index: 100;
    `
    parent.appendChild(particle)

    const angle = Math.random() * Math.PI * 2
    const velocity = 20 + Math.random() * 40
    
    gsap.to(particle, {
      x: Math.cos(angle) * velocity,
      y: Math.sin(angle) * velocity - 20, // push up slightly
      opacity: 0,
      scale: 0.5,
      duration: 0.5 + Math.random() * 0.3,
      ease: 'power2.out',
      onComplete: () => particle.remove()
    })
  }
}

onMounted(() => {
  initGame()
})

onUnmounted(() => {
  gameActive.value = false
})
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
      class="archaeology-game-overlay"
      :class="{ fail: isFailed }"
    >
      <div class="archaeology-container">
        <div class="archaeology-header">
          <h3 class="pixel-text">
            ⛏️ EXCAVACIÓN ARQUEOLÓGICA
          </h3>
          <p>Encontrá el fósil de <span>3 piezas</span> oculto en las rocas.</p>
        </div>

        <div class="stats-row">
          <div class="stat-pill energy-counter">
            ENERGÍA: {{ energy }}
          </div>
          <div class="stat-pill">
            PIEZAS: {{ fossilsFound }} / {{ totalFossilParts }}
          </div>
        </div>

        <div class="archaeology-grid">
          <div
            v-for="tile in grid"
            :key="`${tile.r}-${tile.c}`"
            class="tile"
            :class="{
              'is-dug': tile.isDug,
              'is-fossil': tile.isDug && tile.isFossil,
              'is-empty': tile.isDug && !tile.isFossil,
              'clue-hot': tile.isDug && tile.clue === 'HOT',
              'clue-cold': tile.isDug && tile.clue === 'COLD'
            }"
            :data-coord="`${tile.r},${tile.c}`"
            @mousedown.stop="handleTileClick(tile)"
          >
            <template v-if="tile.isDug">
              <span
                v-if="tile.isFossil"
                class="fossil-icon"
              >🦴</span>
              <span
                v-else-if="tile.clue === 'HOT'"
                class="clue-tag hot"
              >🔥</span>
              <span
                v-else-if="tile.clue === 'COLD'"
                class="clue-tag cold"
              >❄️</span>
            </template>
            <template v-else>
              <div class="rock-texture" />
            </template>
          </div>
        </div>

        <div class="game-feedback pixel-text">
          {{ feedback }}
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.archaeology-game-overlay {
  position: fixed;
  inset: 0;
  background: Rgba(0, 0, 0, 0.85);
  backdrop-filter: Blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform, filter, opacity;
  @include gpu-layer;

  &.fail {
    background: Rgba(139, 92, 26, 0.9);
  }
}

.archaeology-container {
  position: relative;
  width: 90%;
  max-width: 420px;
  background: Rgba(43, 29, 14, 0.9);
  border: 3px solid #ca8a04;
  border-radius: 24px;
  box-shadow: 0 0 40px Rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  padding: 24px;
  align-items: center;
}

.archaeology-header {
  text-align: center;
  margin-bottom: 16px;
  pointer-events: none;

  h3 {
    @include pixelated;
    font-size: 14px;
    color: #eab308;
    margin-bottom: 8px;
    text-shadow: 0 0 10px Rgba(234, 179, 8, 0.4);
  }

  p {
    font-size: 12px;
    color: #dfcbb5;
    span { color: #fef08a; font-weight: bold; }
  }
}

.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  width: 100%;
  justify-content: center;
}

.stat-pill {
  @include pixelated;
  font-size: 10px;
  color: var(--white);
  background: Rgba(255, 255, 255, 0.05);
  padding: 8px 16px;
  border-radius: 12px;
  border: 1px solid Rgba(234, 179, 8, 0.3);
}

.archaeology-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(5, 1fr);
  gap: 6px;
  width: 300px;
  height: 300px;
  background: Rgba(24, 15, 6, 0.5);
  padding: 8px;
  border-radius: 16px;
  border: 2px solid #ca8a04;
  position: relative;
}

.tile {
  background: #78350f;
  border-radius: 8px;
  border: 1px solid #451a03;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &:hover:not(.is-dug) {
    background: #92400e;
  }

  .rock-texture {
    position: absolute;
    inset: 4px;
    background: #b45309;
    border-radius: 4px;
    border: 1px solid #78350f;
  }

  &.is-dug {
    background: #451a03;
    border-color: #270e03;
    cursor: default;
  }

  &.is-fossil {
    background: #fef08a;
    box-shadow: inset 0 0 10px #eab308;
    .fossil-icon {
      font-size: 24px;
      animation: pulse 1.5s infinite;
    }
  }

  .clue-tag {
    @include pixelated;
    font-size: 10px;
    font-weight: bold;
    
    &.hot {
      color: #f87171;
    }
    
    &.cold {
      color: #60a5fa;
    }
  }
}

.game-feedback {
  margin-top: 20px;
  text-align: center;
  font-size: 11px;
  color: #dfcbb5;
  min-height: 20px;
}
</style>
