<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { gsap } from 'gsap'

const DIG_TILE_SCALE_IN = 0.9;
const DIG_TILE_ENTRY_DURATION_SEC = 0.15;
const DIG_FOSSIL_COUNTER_SCALE = 1.2;
const DIG_FOSSIL_COUNTER_DURATION_SEC = 0.3;
const DIG_FOSSIL_TILE_FLASH_DURATION_SEC = 0.2;
const DIG_OUTCOME_ANIM_DURATION_SEC = 0.5;
const DIG_PARTICLE_BASE_SCALE_OUT = 0.5;
import BaseModal from '@/components/common/BaseModal.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const fossilSprite = computed(() => {
  const idStr = String(props.pokemon?.id || '').toLowerCase()
  if (idStr === 'kabuto' || idStr === 'kabutops') return getAssetUrl(ASSET_TYPES.ITEM, 'domefossil')
  if (idStr === 'omanyte' || idStr === 'omastar') return getAssetUrl(ASSET_TYPES.ITEM, 'helixfossil')
  if (idStr === 'aerodactyl') return getAssetUrl(ASSET_TYPES.ITEM, 'oldamber')
  return getAssetUrl(ASSET_TYPES.ITEM, 'helixfossil') // Fallback
})

interface Props {
  show?: boolean
  pokemon: Pokemon
  rarity?: number
  onWin?: ((difficulty: string) => void) | null
  onFail?: (() => void) | null
  onCloseCallback?: (() => void) | null
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  rarity: 0,
  onWin: null,
  onFail: null,
  onCloseCallback: null
})

const emit = defineEmits<{
  (e: 'win', difficulty: string): void
  (e: 'fail'): void
  (e: 'close'): void
}>()

import {
  ARCHAEOLOGY_DIFFICULTIES,
  calculateArchaeologyDifficulty,
  generateArchaeologyGrid,
  getDistanceToNearestFossil,
  type ArchaeologyDifficultyKey,
  type ArchaeologyTile
} from './archaeologyGameHelper.ts'

// State
const difficulty = ref<ArchaeologyDifficultyKey>('easy')
const gridSize = ref(5)
const maxEnergy = ref(12)
const totalFossilParts = ref(3)

type Tile = ArchaeologyTile

// State
const grid = ref<Tile[]>([])
const energy = ref(12)
const fossilsFound = ref(0)
const gameActive = ref(true)
const feedback = ref('¡Excavá las rocas con cuidado!')
const isFailed = ref(false)

function scheduleGameplayDelay(delaySec: number, callback: () => void) {
  const tween = gsap.delayedCall(delaySec, callback)
  const globalScale = gsap.globalTimeline.timeScale()
  if (globalScale > 0) tween.timeScale(1 / globalScale)
  return tween
}

// Initialize Game
function initGame() {
  const diff = calculateArchaeologyDifficulty(props.rarity || 50)
  difficulty.value = diff
  const config = ARCHAEOLOGY_DIFFICULTIES[diff]
  gridSize.value = config.grid
  maxEnergy.value = config.energy
  totalFossilParts.value = config.parts

  grid.value = generateArchaeologyGrid(gridSize.value, totalFossilParts.value)
  energy.value = maxEnergy.value
  fossilsFound.value = 0
  gameActive.value = true
  isFailed.value = false
  feedback.value = '¡Excavá las rocas con cuidado!'
}

// Handle Tile Dig
function handleTileClick(tile: Tile) {
  if (!gameActive.value || tile.isDug) return

  tile.isDug = true
  if (!tile.isFossil) {
    energy.value--
  }

  const GRID_SHAKE_OFFSET_PX = 3

  const GRID_SHAKE_STEP_SEC = 0.05
  // Click Animation: Shake Grid slightly
  gsap.fromTo('.archaeology-grid', 
    { x: -GRID_SHAKE_OFFSET_PX }, // magic-ok
    { x: GRID_SHAKE_OFFSET_PX, duration: GRID_SHAKE_STEP_SEC, repeat: 5, yoyo: true, ease: 'none', onComplete: () => { gsap.set('.archaeology-grid', { x: 0 }) } }
  )

  // Dig Animation on tile
  const tileEl = document.querySelector(`.tile[data-coord="${tile.r},${tile.c}"]`)
  if (tileEl) {
    gsap.fromTo(tileEl, { scale: DIG_TILE_SCALE_IN }, { scale: 1, duration: DIG_TILE_ENTRY_DURATION_SEC, ease: 'power1.out' })
    createDustParticles(tileEl)
  }

  if (tile.isFossil) {
    fossilsFound.value++
    feedback.value = '¡Encontraste una pieza de fósil!'
    gsap.fromTo('.energy-counter', { scale: DIG_FOSSIL_COUNTER_SCALE }, { scale: 1, duration: DIG_FOSSIL_COUNTER_DURATION_SEC })
    
    // Sparkle Animation on hit
    if (tileEl) {
      gsap.to(tileEl, { backgroundColor: '#fef08a', duration: DIG_FOSSIL_TILE_FLASH_DURATION_SEC, yoyo: true, repeat: 1 })
    }

    if (fossilsFound.value >= totalFossilParts.value) {
      win()
      return
    }
  } else {
    // Clue
    const dist = getDistanceToNearestFossil(grid.value, tile.r, tile.c)
    if (dist <= 1) {
      tile.clue = 'HOT'
      feedback.value = '¡Muy caliente! Hay un fósil cerca.'
    } else {
      tile.clue = 'COLD'
      feedback.value = 'Frío. Sigue buscando.'
    }
  }

  // Out of Energy Check
  if (energy.value <= 0 && fossilsFound.value < totalFossilParts.value) {
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
    duration: DIG_OUTCOME_ANIM_DURATION_SEC
  })

  scheduleGameplayDelay(1.2, () => {
    emit('win', difficulty.value)
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
    duration: DIG_OUTCOME_ANIM_DURATION_SEC
  })

  scheduleGameplayDelay(1.2, () => {
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
const DUST_PARTICLE_BORDER_RADIUS_PERCENT = 50

    const particle = document.createElement('div')
    particle.className = 'dust-particle'
    particle.style.cssText = `
      position: absolute;
      width: 4px;
      height: 4px;
      background: #ca8a04;
      border-radius: ${DUST_PARTICLE_BORDER_RADIUS_PERCENT}%;
      pointer-events: none;
      left: ${rect.left - parent.getBoundingClientRect().left + rect.width / 2}px;
      top: ${rect.top - parent.getBoundingClientRect().top + rect.height / 2}px;
      z-index: var(--z-hud);
    `
    parent.appendChild(particle)

    const DUST_VELOCITY_BASE = 20
    const DUST_VELOCITY_VARIANCE = 40
    const DUST_PARTICLE_TOP_OFFSET_PX = 20
    const angle = Math.random() * Math.PI * 2
    const velocity = DUST_VELOCITY_BASE + Math.random() * DUST_VELOCITY_VARIANCE
    
    gsap.to(particle, {
      x: Math.cos(angle) * velocity,
      y: Math.sin(angle) * velocity - DUST_PARTICLE_TOP_OFFSET_PX, // push up slightly
      opacity: 0,
      scale: DIG_PARTICLE_BASE_SCALE_OUT,
      duration: DIG_OUTCOME_ANIM_DURATION_SEC + Math.random() * 0.3,
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

const handleCloseModal = () => {
  emit('close')
  props.onCloseCallback?.()
}
</script>

<template>
  <BaseModal
    id="archaeology-modal"
    :show="show"
    title="EXCAVACIÓN ARQUEOLÓGICA"
    title-color="#eab308"
    header-background="rgba(43, 29, 14, 0.95)"
    variant="retro"
    overlay="dark"
    max-width="420px"
    @close="handleCloseModal"
  >
    <template #header-icon>
      <span class="emoji">⛏️</span>&nbsp;
    </template>
    <div
      class="archaeology-container"
      :class="{ fail: isFailed }"
    >
      <div class="archaeology-header">
        <p>Encontrá el fósil de <span>{{ totalFossilParts }} piezas</span> oculto en las rocas.</p>
      </div>

      <div class="stats-row">
        <div
          class="stat-pill difficulty-pill"
          :style="{ borderColor: ARCHAEOLOGY_DIFFICULTIES[difficulty].color, color: ARCHAEOLOGY_DIFFICULTIES[difficulty].color }"
        >
          {{ ARCHAEOLOGY_DIFFICULTIES[difficulty].label.toUpperCase() }}
        </div>
        <div class="stat-pill energy-counter">
          ENERGÍA: {{ energy }}
        </div>
        <div class="stat-pill">
          PIEZAS: {{ fossilsFound }} / {{ totalFossilParts }}
        </div>
      </div>

      <div
        id="archaeology-grid"
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
              class="emoji clue-tag hot"
            >🔥</span>
            <span
              v-else-if="tile.clue === 'COLD'"
              class="emoji clue-tag cold"
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
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.archaeology-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px 8px 16px;
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
  gap: 8px;
  margin-bottom: 20px;
  width: 100%;
  justify-content: center;
  flex-wrap: nowrap;
}

.stat-pill {
  @include pixelated;
  font-size: 8px;
  color: var(--white);
  background: Rgba(255, 255, 255, 0.05);
  padding: 6px 10px;
  border-radius: 12px;
  border: 1px solid Rgba(234, 179, 8, 0.3);
  white-space: nowrap;
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
    .fossil-sprite {
      width: 32px;
      height: 32px;
      object-fit: contain;
      @include sprite-render;
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
