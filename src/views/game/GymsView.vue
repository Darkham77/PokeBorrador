<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { gsap } from 'gsap'
import { useGymsStore } from '@/stores/gyms'
import { useGameStore } from '@/stores/game'
import GymCard from '@/components/gyms/GymCard.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { GymId, Gym } from '@/data/world/gyms'
import type { BattleDifficulty } from '@/types/battle/battle'

const gymsStore = useGymsStore()
const gameStore = useGameStore()

// Local state for difficulties to keep them reactive per card
const cardDifficulties = reactive<Partial<Record<GymId, BattleDifficulty>>>({})

onMounted(() => {
  gymsStore.gyms.forEach((gym: Gym) => {
    cardDifficulties[gym.id] = 'easy'
  })
})

const handleBadgeEnter = (e: MouseEvent) => {
  gsap.to(e.currentTarget, {
    scale: 1.1,
    y: -2,
    duration: 0.4,
    ease: 'back.out(1.7)',
    filter: 'none',
    opacity: 1
  })
}

const handleBadgeLeave = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  const isActive = el.classList.contains('active')
  gsap.to(el, {
    scale: isActive ? 1.1 : 1,
    y: isActive ? -2 : 0,
    duration: 0.4,
    ease: 'power2.out',
    filter: isActive ? 'none' : 'Grayscale(1) Opacity(0.3)',
    opacity: isActive ? 1 : 0.3
  })
}
</script>

<template>
  <div class="pv-gyms-view">
    <div class="pv-region-selector">
      <button class="region-tab active">
        <span class="region-indicator" />
        KANTO
      </button>
      <button
        class="region-tab locked"
        disabled
      >
        <span class="emoji lock-icon">🔒</span>
        JOHTO (PRÓXIMAMENTE)
      </button>
      <button
        class="region-tab locked"
        disabled
      >
        <span class="emoji lock-icon">🔒</span>
        HOENN (PRÓXIMAMENTE)
      </button>
    </div>

    <div class="pv-gyms-header">
      <div class="header-left">
        <h1 class="view-title">
          <span class="emoji">🏆</span> LÍDERES DE GIMNASIO
        </h1>
        <p class="view-desc">
          Derrota a los 8 líderes de Kanto para acceder a la Liga Pokémon. Cada líder otorga una medalla única y una MT especial.
        </p>
      </div>

      <div class="badge-summary">
        <div class="badge-title">
          TUS MEDALLAS
        </div>
        <div class="badge-list">
          <PVTooltip 
            v-for="gym in gymsStore.gyms" 
            :key="gym.id"
            :title="gym.badgeName"
          >
            <button 
              class="badge-item"
              :class="{ active: gymsStore.isGymDefeated(gym.id) }"
              @mouseenter="handleBadgeEnter"
              @mouseleave="handleBadgeLeave"
              @click.stop
            >
              <img 
                :src="getAssetUrl(ASSET_TYPES.BADGE, gym.id)" 
                :alt="gym.badgeName"
                class="badge-img"
              >
            </button>
          </PVTooltip>
        </div>
      </div>
    </div>

    <div class="pv-gyms-grid">
      <GymCard
        v-for="gym in gymsStore.gyms"
        :key="gym.id"
        v-model:difficulty="cardDifficulties[gym.id]"
        :gym="gym"
        :is-defeated="gymsStore.isDifficultyDefeated(gym.id, cardDifficulties[gym.id] || 'easy')"
        :is-locked="gameStore.state.badges < gym.badgesRequired"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.pv-gyms-view {
  padding: 0 0 40px;
  background: var(--bg-dark);
}

.pv-region-selector {
  display: flex;
  gap: 12px;
  padding: 20px 30px;
  border-bottom: 1px solid Rgb(255 255 255 / 5%);
  margin-bottom: 20px;

  .region-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border: 1px solid Rgb(255 255 255 / 8%);
    border-radius: 12px;
    background: Rgb(255 255 255 / 3%);
    color: var(--text-muted);
    font-family: 'Pokemon FireRed LeafGreen', monospace;
    font-size: 14px;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: Rgb(255 255 255 / 8%);
      color: var(--text-light);
      border-color: Rgb(255 255 255 / 20%);
    }

    &.active {
      border: 1px solid Rgb(230 57 70 / 50%);
      background: Linear-Gradient(135deg, Rgb(230 57 70 / 20%) 0%, Rgb(241 250 238 / 3%) 100%);
      color: var(--text-light);
      box-shadow: 0 0 12px Rgb(230 57 70 / 20%);

      .region-indicator {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #e63946;
        box-shadow: 0 0 8px #e63946;
      }
    }

    &.locked {
      background: transparent;
      opacity: 0.4;
      cursor: not-allowed;
      border-style: dashed;

      .lock-icon {
        font-size: 12px;
      }
    }
  }
}

.pv-gyms-header {
  @include shell;

  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 30px;
  padding: 30px;
  border-radius: 24px;
  margin-bottom: 40px;
  
  @media (width <= 1024px) {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}

.view-title {
  @include pixelated;

  margin: 0 0 12px;
  color: var(--yellow);
  font-size: 16px;
  text-shadow: 0 2px 0 var(--black);
}

.view-desc {
  max-width: 600px;
  color: var(--gray);
  font-size: 11px;
  line-height: 1.6;

  @media (width <= 1024px) {
    margin: 0 auto;
  }
}

.badge-summary {
  position: relative;
  min-width: 320px;
  padding: 20px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: 20px;
  background: Rgb(0 0 0 / 30%);

  @media (width <= 480px) {
    min-width: 100%;
    padding: 15px 10px;
  }
}

.badge-title {
  @include pixelated;

  color: var(--yellow);
  font-size: 9px;
  text-align: center;
  margin-bottom: 24px;
  letter-spacing: 1px;
}

.badge-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.badge-item {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: 12px;
  background: Rgb(255 255 255 / 5%);
  flex: none;
  cursor: default;
  filter: Grayscale(1) Opacity(0.3);
  will-change: filter, transform;

  .badge-img {
    width: 26px;
    height: 26px;
    object-fit: contain;
    image-rendering: pixelated;
  }

  &.active {
    background: Linear-Gradient(135deg, Rgb(255 215 0 / 20%) 0%, Rgb(255 215 0 / 5%) 100%);
    opacity: 1;
    transform: Scale(1.1) Translatey(-2px);
    filter: none;
    border-color: var(--yellow);
    box-shadow: 
      0 0 20px Rgb(255 215 0 / 20%),
      inset 0 0 10px Rgb(255 215 0 / 10%);
  }
}

.pv-gyms-grid {
  display: grid;
  justify-content: center;
  gap: 40px;
  grid-template-columns: repeat(auto-fill, 340px);
  padding: 0 30px 80px;
}
</style>
