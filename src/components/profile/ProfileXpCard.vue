<script setup lang="ts">
import { computed, useTemplateRef, onMounted, onUnmounted, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { PLAYER_CLASSES, CLASS_MISSIONS } from '@/data/player/playerClasses'
import { MAX_TRAINER_RANK_LEVEL } from '@/logic/constants/gameplay'
import gsap from 'gsap'

const XP_STRIPE_SCROLL_DURATION_SEC = 2;
const XP_BAR_ENTRY_DURATION_SEC = 0.8;
const XP_BAR_UPDATE_DURATION_SEC = 0.5;

const DEFAULT_EXP_NEEDED = 100;
const MAX_UNLOCKS_PREVIEW = 2;

type PlayerClassId = keyof typeof PLAYER_CLASSES

function isPlayerClassId(value: string): value is PlayerClassId {
  return Object.hasOwn(PLAYER_CLASSES, value)
}

interface Props {
  level?: number
  exp?: number
  expNeeded?: number
  classId?: PlayerClassId | null
  classColor?: string
  hideUnlocks?: boolean
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  level: undefined,
  exp: undefined,
  expNeeded: undefined,
  classId: undefined,
  classColor: undefined,
  hideUnlocks: false,
  title: 'NIVEL Y EXPERIENCIA'
})

const gameStore = useGameStore()
const classStore = usePlayerClassStore()
const gs = computed(() => gameStore.state)

const currentLevel = computed(() => props.level !== undefined ? props.level : (gs.value.trainerLevel || 1))
const currentExp = computed(() => props.level !== undefined && props.level >= MAX_TRAINER_RANK_LEVEL ? 0 : (props.exp !== undefined ? props.exp : (gs.value.trainerExp || 0)))
const currentExpNeeded = computed(() => {
  if (currentLevel.value >= MAX_TRAINER_RANK_LEVEL) return 0
  return props.expNeeded !== undefined ? props.expNeeded : (gs.value.trainerExpNeeded || DEFAULT_EXP_NEEDED)
})

const trainerExpPct = computed(() => {
  if (currentLevel.value >= MAX_TRAINER_RANK_LEVEL) return 100
  const needed = currentExpNeeded.value
  if (needed === 0) return 0
  return Math.min(100, (currentExp.value / needed) * 100)
})

const xpRemaining = computed(() => {
  if (currentLevel.value >= MAX_TRAINER_RANK_LEVEL) return 0
  return Math.max(0, currentExpNeeded.value - currentExp.value)
})

const nextLevel = computed(() => {
  return Math.min(MAX_TRAINER_RANK_LEVEL, currentLevel.value + 1)
})

const nextClassUnlocks = computed(() => {
  if (props.hideUnlocks) return []
  
  const currentClassId = props.classId !== undefined ? props.classId : gs.value.playerClass
  const cLevel = currentLevel.value
  if (!currentClassId) return []
  if (!isPlayerClassId(currentClassId)) throw new Error(`[ProfileXpCard] Invalid player class id: ${currentClassId}`)

  const classDef = PLAYER_CLASSES[currentClassId]

  const _PROFILE_UNLOCK_TYPES = ['bonus', 'mission'] as const
  type ProfileUnlockType = (typeof _PROFILE_UNLOCK_TYPES)[number]

  const unlocks: { level: number; desc: string; type: ProfileUnlockType }[] = []

  // 1. Class bonuses
  if (classDef.bonuses && classDef.bonusLevels) {
    const levels = classDef.bonusLevels
    classDef.bonuses.forEach((bonus: string, index: number) => {
      const reqLv = levels[index]
      if (reqLv !== undefined && reqLv > cLevel) {
        unlocks.push({
          level: reqLv,
          desc: bonus,
          type: 'bonus'
        })
      }
    })
  }

  // 2. Idle missions
  CLASS_MISSIONS.forEach(mission => {
    if (mission.reqLv > cLevel) {
      unlocks.push({
        level: mission.reqLv,
        desc: mission.name,
        type: 'mission'
      })
    }
  })

  // Sort by level ascending
  return unlocks.toSorted((a, b) => a.level - b.level)
})

const xpBarRef = useTemplateRef<HTMLElement>('xpBarRef')
let stripesTween: gsap.core.Tween | null = null
let widthTween: gsap.core.Tween | null = null

const initXpBarAnimation = () => {
  if (xpBarRef.value) {
    // layout-ok: ProgressBar stripes pattern animation
    stripesTween = gsap.to(xpBarRef.value, {
      backgroundPositionX: '20px',
      duration: XP_STRIPE_SCROLL_DURATION_SEC,
      ease: 'none',
      repeat: -1
    })

    // Animate the scaleX to the initial percentage
    gsap.set(xpBarRef.value, { scaleX: 0, transformOrigin: 'left center' })
    widthTween = gsap.to(xpBarRef.value, {
      scaleX: Math.max(0, Math.min(1, trainerExpPct.value / 100)),
      duration: XP_BAR_ENTRY_DURATION_SEC,
      ease: 'power2.out'
    })
  }
}

onMounted(() => {
  initXpBarAnimation()
})

onUnmounted(() => {
  if (stripesTween) stripesTween.kill()
  if (widthTween) widthTween.kill()
})

// Watch for XP changes to animate scale smoothly
watch(trainerExpPct, (newPct) => {
  if (xpBarRef.value) {
    if (widthTween) widthTween.kill()
    widthTween = gsap.to(xpBarRef.value, {
      scaleX: Math.max(0, Math.min(1, newPct / 100)),
      duration: XP_BAR_UPDATE_DURATION_SEC,
      ease: 'power2.out'
    })
  }
})
</script>

<template>
  <div class="profile-section-card xp-card">
    <div class="section-label">
      {{ props.title.toUpperCase() }}
    </div>
    <div class="xp-details">
      <div class="xp-numbers">
        <span class="xp-current">
          <template v-if="currentLevel >= MAX_TRAINER_RANK_LEVEL">
            MÁXIMO NIVEL
          </template>
          <template v-else>
            {{ currentExp }} / {{ currentExpNeeded }} EXP
          </template>
        </span>
        <span class="xp-percent">{{ Math.round(trainerExpPct) }}%</span>
      </div>

      <!-- Progress Bar -->
      <div class="xp-bar-container">
        <div 
          ref="xpBarRef"
          class="xp-bar-fill"
          :style="{ backgroundColor: props.classColor || classStore.currentClassDef?.color || 'var(--purple)' }"
        />
      </div>

      <div class="xp-remaining-text">
        <template v-if="currentLevel >= MAX_TRAINER_RANK_LEVEL">
          <strong :style="{ color: props.classColor || classStore.currentClassDef?.color || '#a855f7' }">¡NIVEL MÁXIMO ALCANZADO!</strong>
        </template>
        <template v-else>
          Faltan <strong :style="{ color: props.classColor || classStore.currentClassDef?.color || '#a855f7' }"> {{ xpRemaining }} EXP </strong> para el Nivel <strong>{{ nextLevel }}</strong>
        </template>
      </div>
    </div>

    <!-- Unlocks Section -->
    <div 
      v-if="nextClassUnlocks.length > 0" 
      class="xp-unlocks"
    >
      <div class="unlocks-title">
        Próximos Desbloqueos de Clase:
      </div>
      <ul class="unlocks-list">
        <li 
          v-for="(unlock, index) in nextClassUnlocks.slice(0, MAX_UNLOCKS_PREVIEW)" 
          :key="index"
          class="unlock-item"
        >
          <span class="unlock-lvl">Lv.{{ unlock.level }}</span>
          <span class="unlock-desc">{{ unlock.desc }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/_profile-shared";

.xp-card {
  .xp-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .xp-numbers {
    @include pixelated;

    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--white);
    font-size: 8px;
    letter-spacing: 0.5px;
  }

  .xp-current {
    font-weight: 500;
  }

  .xp-percent {
    color: Rgb(255 255 255 / 60%);
  }

  .xp-bar-container {
    position: relative;
    width: 100%;
    height: 10px;
    border: 1px solid Rgb(255 255 255 / 10%);
    border-radius: 6px;
    background: Rgb(0 0 0 / 40%);
    overflow: hidden;
  }

  .xp-bar-fill {
    height: 100%;
    border-radius: 5px;
    background-image: Linear-Gradient(90deg, Rgb(255 255 255 / 15%) 25%, transparent 25%, transparent 50%, Rgb(255 255 255 / 15%) 50%, Rgb(255 255 255 / 15%) 75%, transparent 75%, transparent);
    background-size: 20px 20px;
  }

  .xp-remaining-text {
    color: Rgb(255 255 255 / 60%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 11px;
    line-height: 1.4;

    strong {
      font-weight: 700;
    }
  }

  .xp-unlocks {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px dashed Rgb(255 255 255 / 8%);
  }

  .unlocks-title {
    color: Rgb(255 255 255 / 70%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .unlocks-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .unlock-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: Rgb(203 213 225 / 85%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 11px;
    line-height: 1.4;
  }

  .unlock-lvl {
    @include pixelated;

    padding: 2px 4px;
    border-radius: 4px;
    background: Rgb(255 255 255 / 10%);
    color: var(--yellow);
    font-size: 7px;
    font-weight: bold;
    flex-shrink: 0;
  }

  .unlock-desc {
    font-size: 11px;
  }
}
</style>
