<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { gsap } from 'gsap'
import type { Pokemon } from '@/types/pokemon'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const fossilSprite = computed(() => {
  const idStr = String(props.enemy?.id || '').toLowerCase()
  if (idStr === 'kabuto' || idStr === 'kabutops') return getAssetUrl(ASSET_TYPES.ITEM, 'dome_fossil')
  if (idStr === 'omanyte' || idStr === 'omastar') return getAssetUrl(ASSET_TYPES.ITEM, 'helix_fossil')
  if (idStr === 'aerodactyl') return getAssetUrl(ASSET_TYPES.ITEM, 'old_amber')
  return getAssetUrl(ASSET_TYPES.ITEM, 'helix_fossil') // Fallback
})

interface Props {
  enemy: Pokemon
  rarity?: number // 1-100
}

const props = withDefaults(defineProps<Props>(), {
  rarity: 50
})

const emit = defineEmits<{
  (e: 'success', difficulty: string): void
  (e: 'fail'): void
}>()

// Game configuration and difficulties
const DIFFICULTIES = {
  easy: { grid: 5, energy: 12, parts: 3, label: 'Fácil', items: 1, color: '#4ade80' },
  medium: { grid: 6, energy: 10, parts: 4, label: 'Medio', items: 2, color: '#facc15' },
  hard: { grid: 7, energy: 8, parts: 5, label: 'Difícil', items: 3, color: '#fb923c' },
  expert: { grid: 8, energy: 6, parts: 6, label: 'Experto', items: 4, color: '#f87171' }
} as const

type DifficultyKey = keyof typeof DIFFICULTIES

// State
const difficulty = ref<DifficultyKey>('easy')
const gridSize = ref(5)
const maxEnergy = ref(12)
const totalFossilParts = ref(3)

interface Tile {
  r: number
  c: number
  isFossil: boolean
  isDug: boolean
  clue: 'HOT' | 'COLD' | ''
}

// State
const grid = ref<Tile[]>([])
const energy = ref(12)
const fossilsFound = ref(0)
const gameActive = ref(true)
const feedback = ref('¡Excavá las rocas con cuidado!')
const isFailed = ref(false)
const overlayRef = ref<HTMLElement | null>(null)

// Initialize Game
function initGame() {
  // Determine difficulty automatically based on weighted probabilities & Pokemon rarity
  const isRare = (props.rarity || 50) < 15
  const randRoll = Math.random() * 100
  let diff: DifficultyKey = 'easy'
  
  if (isRare) {
    if (randRoll < 10) diff = 'easy'
    else if (randRoll < 35) diff = 'medium'
    else if (randRoll < 75) diff = 'hard'
    else diff = 'expert'
  } else {
    if (randRoll < 40) diff = 'easy'
    else if (randRoll < 70) diff = 'medium'
    else if (randRoll < 90) diff = 'hard'
    else diff = 'expert'
  }
  
  difficulty.value = diff
  const config = DIFFICULTIES[diff]
  gridSize.value = config.grid
  maxEnergy.value = config.energy
  totalFossilParts.value = config.parts

  // Generate empty grid
  const tempGrid: Tile[] = []
  for (let r = 0; r < gridSize.value; r++) {
    for (let c = 0; c < gridSize.value; c++) {
      tempGrid.push({
        r,
        c,
        isFossil: false,
        isDug: false,
        clue: ''
      })
    }
  }

  // Generate contiguous fossil shape using a DFS/random walk algorithm
  const fossilCoords = new Set<string>()
  let currentR = Math.floor(Math.random() * gridSize.value)
  let currentC = Math.floor(Math.random() * gridSize.value)
  fossilCoords.add(`${currentR},${currentC}`)

  const directions = [
    { r: -1, c: 0 },
    { r: 1, c: 0 },
    { r: 0, c: -1 },
    { r: 0, c: 1 }
  ]

  while (fossilCoords.size < totalFossilParts.value) {
    const activeList = Array.from(fossilCoords).map(str => {
      const parts = str.split(',')
      const r = Number(parts[0] ?? 0)
      const c = Number(parts[1] ?? 0)
      return { r, c }
    })

    const candidates: { r: number; c: number }[] = []
    for (const cell of activeList) {
      for (const dir of directions) {
        const nr = cell.r + dir.r
        const nc = cell.c + dir.c
        if (nr >= 0 && nr < gridSize.value && nc >= 0 && nc < gridSize.value) {
          const key = `${nr},${nc}`
          if (!fossilCoords.has(key)) {
            candidates.push({ r: nr, c: nc })
          }
        }
      }
    }

    if (candidates.length === 0) {
      // Clear and restart in the extremely rare event of getting trapped
      fossilCoords.clear()
      currentR = Math.floor(Math.random() * gridSize.value)
      currentC = Math.floor(Math.random() * gridSize.value)
      fossilCoords.add(`${currentR},${currentC}`)
      continue
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)]!
    fossilCoords.add(`${chosen.r},${chosen.c}`)
  }

  // Apply fossil flag
  tempGrid.forEach(tile => {
    if (fossilCoords.has(`${tile.r},${tile.c}`)) {
      tile.isFossil = true
    }
  })

  grid.value = tempGrid
  energy.value = maxEnergy.value
  fossilsFound.value = 0
  gameActive.value = true
  isFailed.value = false
}

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

function handleTileClick(tile: Tile) {
  if (!gameActive.value || tile.isDug) return

  tile.isDug = true
  if (!tile.isFossil) {
    energy.value--
  }

  // Shake Grid
  gsap.fromTo('.archaeology-grid', 
    { x: -3 }, 
    { x: 3, duration: 0.05, repeat: 5, yoyo: true, ease: 'none', onComplete: () => { gsap.set('.archaeology-grid', { x: 0 }) } }
  )

  const tileEl = document.querySelector(`.tile[data-coord="${tile.r},${tile.c}"]`)
  if (tileEl) {
    gsap.fromTo(tileEl, { scale: 0.9 }, { scale: 1, duration: 0.15, ease: 'power1.out' })
    createDustParticles(tileEl)
  }

  if (tile.isFossil) {
    fossilsFound.value++
    feedback.value = '¡Encontraste una pieza de fósil!'
    
    if (tileEl) {
      gsap.to(tileEl, { backgroundColor: '#fef08a', duration: 0.2, yoyo: true, repeat: 1 })
    }

    if (fossilsFound.value >= totalFossilParts.value) {
      finishGame(true)
      return
    }
  } else {
    const dist = getDistanceToNearestFossil(tile.r, tile.c)
    if (dist <= 1) {
      tile.clue = 'HOT'
      feedback.value = '¡Muy caliente! Hay un fósil cerca.'
    } else {
      tile.clue = 'COLD'
      feedback.value = 'Frío. Sigue buscando.'
    }
  }

  if (energy.value <= 0 && fossilsFound.value < totalFossilParts.value) {
    finishGame(false)
  }
}

function finishGame(success: boolean) {
  gameActive.value = false
  if (success) {
    feedback.value = '¡FÓSIL EXCAVADO!'
    gsap.to('.archaeology-grid', {
      boxShadow: '0 0 40px rgba(234, 179, 8, 0.8)',
      duration: 0.5
    })
    gsap.delayedCall(1, () => emit('success', difficulty.value))
  } else {
    isFailed.value = true
    feedback.value = 'El fósil se desmoronó...'
    gsap.to('.archaeology-grid', {
      opacity: 0.5,
      filter: 'grayscale(1)',
      duration: 0.5
    })
    gsap.delayedCall(1, () => emit('fail'))
  }
}

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
      y: Math.sin(angle) * velocity - 20,
      opacity: 0,
      scale: 0.5,
      duration: 0.5,
      ease: 'power2.out',
      onComplete: () => particle.remove()
    })
  }
}

onMounted(() => {
  initGame()
  if (overlayRef.value) {
    gsap.from(overlayRef.value, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.out'
    })
  }
})

onUnmounted(() => {
  gameActive.value = false
})
</script>

<template>
  <div
    ref="overlayRef"
    class="archaeology-minigame-overlay"
    :class="{ fail: isFailed }"
  >
    <div class="archaeology-container">
      <div class="archaeology-hint">
        <div class="mining-icon">
          ⛏️
        </div>
        <div class="mining-text">
          <h3 class="pixel-text">
            ¡EXCAVACIÓN ACTIVA!
          </h3>
          <p>Encontrá el fósil de <strong>{{ props.enemy.name }}</strong> (<span>{{ totalFossilParts }} piezas</span>) antes de que se agote la energía.</p>
        </div>
      </div>

      <div class="stats-row">
        <div
          class="stat-pill difficulty-pill"
          :style="{ borderColor: DIFFICULTIES[difficulty].color, color: DIFFICULTIES[difficulty].color }"
        >
          {{ DIFFICULTIES[difficulty].label.toUpperCase() }}
        </div>
        <div class="stat-pill">
          ENERGÍA: {{ energy }}
        </div>
        <div class="stat-pill">
          PIEZAS: {{ fossilsFound }} / {{ totalFossilParts }}
        </div>
      </div>

      <div class="game-area">
        <div
          class="archaeology-grid"
          :style="{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gridTemplateRows: `repeat(${gridSize}, 1fr)` }"
        >
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
              <img
                v-if="tile.isFossil"
                :src="fossilSprite"
                class="fossil-sprite pixelated"
                alt="Fósil"
              >
              <span
                v-else-if="tile.clue === 'HOT'"
                class="clue-tag hot"
              >🔥</span>
              <span
                v-else-if="tile.clue === 'COLD'"
                class="clue-tag cold"
              >❄️</span>
            </template>
            <template v-if="!tile.isDug">
              <div class="rock-texture" />
            </template>
          </div>
        </div>
      </div>

      <div class="game-feedback pixel-text">
        {{ feedback }}
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/core/_mixins" as *;

.archaeology-minigame-overlay {
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

  &.fail {
    background: Rgba(139, 92, 26, 0.85);
  }
}

.archaeology-container {
  position: relative;
  width: 90%;
  max-width: 440px;
  height: 90%;
  max-height: 520px;
  background: Rgba(43, 29, 14, 0.9);
  border: 2px solid #ca8a04;
  border-radius: 32px;
  box-shadow: 0 0 40px Rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  padding: 24px;
  align-items: center;
}

.archaeology-hint {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  background: Rgba(202, 138, 4, 0.15);
  padding: 12px 20px;
  border-radius: 16px;
  border: 1px solid Rgba(202, 138, 4, 0.3);
  width: 100%;

  .mining-icon {
    font-size: 36px;
  }

  .mining-text {
    h3 {
      font-size: 14px;
      color: #eab308;
      margin-bottom: 4px;
      text-shadow: 0 0 10px Rgba(202, 138, 4, 0.5);
    }
    p {
      font-size: 11px;
      color: #dfcbb5;
      span { color: #fff; font-weight: bold; }
    }
  }
}

.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.stat-pill {
  @include pixelated;
  font-size: 10px;
  color: #fff;
  background: Rgba(255, 255, 255, 0.05);
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid Rgba(234, 179, 8, 0.3);
}

.game-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.archaeology-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(5, 1fr);
  gap: 6px;
  width: 250px;
  height: 250px;
  background: Rgba(24, 15, 6, 0.5);
  padding: 6px;
  border-radius: 12px;
  border: 2px solid #ca8a04;
  position: relative;
}

.tile {
  background: #78350f;
  border-radius: 6px;
  border: 1px solid #451a03;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  .rock-texture {
    position: absolute;
    inset: 3px;
    background: #b45309;
    border-radius: 3px;
    border: 1px solid #78350f;
  }

  &.is-dug {
    background: #451a03;
    border-color: #270e03;
    cursor: default;
  }

  &.is-fossil {
    background: #fef08a;
    box-shadow: inset 0 0 8px #eab308;
    .fossil-sprite {
      width: 28px;
      height: 28px;
      object-fit: contain;
      @include sprite-render;
      animation: pulse 1.5s infinite;
    }
  }

  .clue-tag {
    @include pixelated;
    font-size: 9px;
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
  margin-top: 16px;
  text-align: center;
  font-size: 11px;
  color: #dfcbb5;
  min-height: 16px;
}
</style>
