<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { usePlayerClassStore, type ClassDefinition } from '@/stores/playerClass'
import { PLAYER_CLASSES, CLASS_MISSIONS } from '@/data/playerClasses'
import gsap from 'gsap'

const gameStore = useGameStore()
const classStore = usePlayerClassStore()
const gs = computed(() => gameStore.state)

const trainerExpPct = computed(() => {
  const needed = gs.value.trainerExpNeeded || 0
  if (needed === 0) return 0
  return Math.min(100, ((gs.value.trainerExp || 0) / needed) * 100)
})

const xpRemaining = computed(() => {
  const needed = gs.value.trainerExpNeeded || 0
  return Math.max(0, needed - (gs.value.trainerExp || 0))
})

const nextLevel = computed(() => {
  return (gs.value.trainerLevel || 1) + 1
})

const nextClassUnlocks = computed(() => {
  const currentClassId = gs.value.playerClass
  const currentLevel = gs.value.trainerLevel || 1
  if (!currentClassId) return []

  const classDef = (PLAYER_CLASSES as Record<string, ClassDefinition>)[currentClassId]
  if (!classDef) return []

  const unlocks: { level: number; desc: string; type: 'bonus' | 'mission' }[] = []

  // 1. Class bonuses
  if (classDef.bonuses && classDef.bonusLevels) {
    const levels = classDef.bonusLevels
    classDef.bonuses.forEach((bonus: string, index: number) => {
      const reqLv = levels[index]
      if (reqLv !== undefined && reqLv > currentLevel) {
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
    if (mission.reqLv > currentLevel) {
      unlocks.push({
        level: mission.reqLv,
        desc: mission.name,
        type: 'mission'
      })
    }
  })

  // Sort by level ascending
  return unlocks.sort((a, b) => a.level - b.level)
})

const xpBarRef = ref<HTMLElement | null>(null)
let stripesTween: gsap.core.Tween | null = null
let widthTween: gsap.core.Tween | null = null

const initXpBarAnimation = () => {
  if (xpBarRef.value) {
    // Animate the stripes infinitely using GSAP
    stripesTween = gsap.to(xpBarRef.value, {
      backgroundPositionX: '20px',
      duration: 2,
      ease: 'none',
      repeat: -1
    })

    // Animate the width to the initial percentage
    gsap.set(xpBarRef.value, { width: '0%' })
    widthTween = gsap.to(xpBarRef.value, {
      width: `${trainerExpPct.value}%`,
      duration: 0.8,
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

// Watch for XP changes to animate width changes smoothly
watch(trainerExpPct, (newPct) => {
  if (xpBarRef.value) {
    if (widthTween) widthTween.kill()
    widthTween = gsap.to(xpBarRef.value, {
      width: `${newPct}%`,
      duration: 0.5,
      ease: 'power2.out'
    })
  }
})
</script>

<template>
  <div class="profile-section-card xp-card">
    <div class="section-label">
      NIVEL Y EXPERIENCIA
    </div>
    <div class="xp-details">
      <div class="xp-numbers">
        <span class="xp-current">{{ gs.trainerExp || 0 }} / {{ gs.trainerExpNeeded || 100 }} EXP</span>
        <span class="xp-percent">{{ Math.round(trainerExpPct) }}%</span>
      </div>
      
      <!-- Progress Bar -->
      <div class="xp-bar-container">
        <div 
          ref="xpBarRef"
          class="xp-bar-fill"
          :style="{ backgroundColor: classStore.currentClassDef?.color || 'var(--purple)' }"
        />
      </div>
      
      <div class="xp-remaining-text">
        Faltan <strong :style="{ color: classStore.currentClassDef?.color || '#a855f7' }"> {{ xpRemaining }} EXP </strong> para el Nivel <strong>{{ nextLevel }}</strong>
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
          v-for="(unlock, index) in nextClassUnlocks.slice(0, 2)" 
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
@use "@/styles/core/_mixins" as *;

.profile-section-card {
  padding: 20px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .section-label {
    @include pixelated;
    font-size: 8px;
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 16px;
    letter-spacing: 1px;
  }
}

.xp-card {
  .xp-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .xp-numbers {
    display: flex;
    justify-content: space-between;
    align-items: center;
    @include pixelated;
    font-size: 8px;
    color: var(--white);
    letter-spacing: 0.5px;
  }

  .xp-current {
    font-weight: 500;
  }

  .xp-percent {
    color: rgba(255, 255, 255, 0.6);
  }

  .xp-bar-container {
    width: 100%;
    height: 10px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    overflow: hidden;
    position: relative;
  }

  .xp-bar-fill {
    height: 100%;
    border-radius: 5px;
    background-image: linear-gradient(90deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent);
    background-size: 20px 20px;
  }

  .xp-remaining-text {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.4;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;

    strong {
      font-weight: 700;
    }
  }

  .xp-unlocks {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px dashed rgba(255, 255, 255, 0.08);
  }

  .unlocks-title {
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  }

  .unlocks-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .unlock-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: rgba(203, 213, 225, 0.85);
    line-height: 1.4;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  }

  .unlock-lvl {
    @include pixelated;
    font-size: 7px;
    background: rgba(255, 255, 255, 0.1);
    color: var(--yellow);
    border-radius: 4px;
    padding: 2px 4px;
    font-weight: bold;
    flex-shrink: 0;
    line-height: 1;
  }

  .unlock-desc {
    font-size: 11px;
  }
}
</style>
